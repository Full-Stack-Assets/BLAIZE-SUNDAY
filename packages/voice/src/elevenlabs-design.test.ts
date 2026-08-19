import assert from "node:assert/strict";
import test from "node:test";

import {
  createDesignedVoice,
  createSundayAfterMidnightVoice,
  designSundayAfterMidnightPreviews,
  designVoicePreviews,
  ElevenLabsVoiceDesignError,
  SUNDAY_AFTER_MIDNIGHT_DESIGN,
  type HumanVoicePersistenceApproval,
  type VoiceDesignFetch,
} from "./elevenlabs-design.ts";

const designResponse = {
  previews: [
    {
      audio_base_64: "YXVkaW8tMQ==",
      generated_voice_id: "generated-1",
      media_type: "audio/mpeg",
      duration_secs: 5.1,
      language: "en",
    },
    {
      audio_base_64: "YXVkaW8tMg==",
      generated_voice_id: "generated-2",
      media_type: "audio/mpeg",
      duration_secs: 5.2,
      language: "en",
    },
    {
      audio_base_64: "YXVkaW8tMw==",
      generated_voice_id: "generated-3",
      media_type: "audio/mpeg",
      duration_secs: 5.3,
      language: "en",
    },
  ],
  text: "Card declined, fit approved. I look certain, feel confused.",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("voice design fails closed when ELEVENLABS_API_KEY is missing", async () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;

  await assert.rejects(
    () =>
      designVoicePreviews({
        voiceDescription: "Warm low-mid masculine voice with relaxed intimate phrasing.",
        previewText: "Card declined, fit approved. I look certain, feel confused. Bad decisions, great outfit. I got good at looking certain long before I felt okay.",
      }),
    (error: unknown) =>
      error instanceof ElevenLabsVoiceDesignError &&
      error.code === "ELEVENLABS_API_KEY_MISSING",
  );

  if (previous) process.env.ELEVENLABS_API_KEY = previous;
});

test("voice design parses three provider previews without returning credential material", async () => {
  let capturedHeaders: Headers | undefined;
  let capturedBody = "";
  const fetchImpl: VoiceDesignFetch = async (_input, init) => {
    capturedHeaders = new Headers(init?.headers);
    capturedBody = String(init?.body ?? "");
    return jsonResponse(designResponse);
  };

  const result = await designVoicePreviews(
    {
      voiceDescription: "Warm low-mid masculine voice with close-mic intimacy, relaxed phrasing, dry confidence, clean sibilants, restrained breathiness, and emotionally guarded delivery.",
      previewText: "Card declined, fit approved. I look certain, feel confused. Bad decisions, great outfit. I got good at looking certain long before I felt okay.",
      modelId: "eleven_ttv_v3",
      seed: 17,
    },
    { apiKey: "server-secret", fetchImpl },
  );

  assert.equal(result.previews.length, 3);
  assert.deepEqual(
    result.previews.map((preview) => preview.generatedVoiceId),
    ["generated-1", "generated-2", "generated-3"],
  );
  assert.equal(result.previews[0]?.audioBase64, "YXVkaW8tMQ==");
  assert.equal(capturedHeaders?.get("xi-api-key"), "server-secret");
  assert.doesNotMatch(JSON.stringify(result), /server-secret/);
  assert.doesNotMatch(capturedBody, /reference_audio|audio_base64/i);
});

test("voice design rejects malformed preview responses", async () => {
  const fetchImpl: VoiceDesignFetch = async () =>
    jsonResponse({ previews: [{ generated_voice_id: "only-id" }] });

  await assert.rejects(
    () =>
      designVoicePreviews(
        {
          voiceDescription: "Warm low-mid masculine voice with relaxed intimate phrasing.",
          previewText: "Card declined, fit approved. I look certain, feel confused. Bad decisions, great outfit. I got good at looking certain long before I felt okay.",
        },
        { apiKey: "server-secret", fetchImpl },
      ),
    (error: unknown) =>
      error instanceof ElevenLabsVoiceDesignError &&
      error.code === "ELEVENLABS_VOICE_DESIGN_INVALID_RESPONSE",
  );
});

test("permanent voice creation requires explicit Human Authority approval before network mutation", async () => {
  let called = false;
  const fetchImpl: VoiceDesignFetch = async () => {
    called = true;
    return jsonResponse({ voice_id: "should-not-exist" });
  };

  await assert.rejects(
    () =>
      createDesignedVoice(
        {
          generatedVoiceId: "generated-2",
          voiceName: "SUNDAY AFTER MIDNIGHT",
          voiceDescription: "Original designed BLAIZE SUNDAY voice.",
          approval: null,
        },
        { apiKey: "server-secret", fetchImpl },
      ),
    (error: unknown) =>
      error instanceof ElevenLabsVoiceDesignError &&
      error.code === "VOICE_PERSISTENCE_REQUIRES_HUMAN_AUTHORITY",
  );

  assert.equal(called, false);
});

test("approved permanent creation sends only the selected generated voice id and returns provider ownership metadata", async () => {
  const approval: HumanVoicePersistenceApproval = {
    approved: true,
    approvedBy: "artist-principal",
    approvalId: "g2-voice-persistence-approval-1",
  };
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> = {};
  const fetchImpl: VoiceDesignFetch = async (input, init) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return jsonResponse({
      voice_id: "persistent-voice-1",
      name: "SUNDAY AFTER MIDNIGHT",
      category: "generated",
      is_owner: true,
      preview_url: "https://example.invalid/preview.mp3",
    });
  };

  const result = await createDesignedVoice(
    {
      generatedVoiceId: "generated-2",
      voiceName: "SUNDAY AFTER MIDNIGHT",
      voiceDescription: "Original designed BLAIZE SUNDAY voice.",
      labels: { artist: "BLAIZE SUNDAY", canon: "SUNDAY AFTER MIDNIGHT" },
      approval,
    },
    { apiKey: "server-secret", fetchImpl },
  );

  assert.match(capturedUrl, /\/v1\/text-to-voice$/);
  assert.equal(capturedBody.generated_voice_id, "generated-2");
  assert.equal(capturedBody.voice_name, "SUNDAY AFTER MIDNIGHT");
  assert.equal("reference_audio_base64" in capturedBody, false);
  assert.equal(result.voiceId, "persistent-voice-1");
  assert.equal(result.isOwner, true);
  assert.equal(result.approvalId, approval.approvalId);
});

test("SUNDAY AFTER MIDNIGHT design contract is provider-neutral and excludes B3 source identity", () => {
  assert.equal(SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceName, "SUNDAY AFTER MIDNIGHT");
  assert.equal(SUNDAY_AFTER_MIDNIGHT_DESIGN.modelId, "eleven_ttv_v3");
  assert.match(SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription, /low-mid/i);
  assert.match(SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription, /clean sibilants/i);
  assert.match(SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription, /emotionally guarded/i);
  assert.doesNotMatch(
    SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription,
    /B3|Gerardo|HeyGen|living performer/i,
  );
});

test("canonical preview helper sends only the locked SUNDAY AFTER MIDNIGHT text design", async () => {
  let capturedBody: Record<string, unknown> = {};
  const fetchImpl: VoiceDesignFetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return jsonResponse({
      ...designResponse,
      text: SUNDAY_AFTER_MIDNIGHT_DESIGN.previewText,
    });
  };

  await designSundayAfterMidnightPreviews({ apiKey: "server-secret", fetchImpl });

  assert.equal(
    capturedBody.voice_description,
    SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription,
  );
  assert.equal(capturedBody.text, SUNDAY_AFTER_MIDNIGHT_DESIGN.previewText);
  assert.equal(capturedBody.model_id, SUNDAY_AFTER_MIDNIGHT_DESIGN.modelId);
  assert.equal(capturedBody.seed, SUNDAY_AFTER_MIDNIGHT_DESIGN.seed);
  assert.equal("reference_audio_base64" in capturedBody, false);
});

test("canonical persistence helper fixes identity metadata and still requires approval", async () => {
  const approval: HumanVoicePersistenceApproval = {
    approved: true,
    approvedBy: "artist-principal",
    approvalId: "g2-voice-persistence-approval-2",
  };
  let capturedBody: Record<string, unknown> = {};
  const fetchImpl: VoiceDesignFetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return jsonResponse({
      voice_id: "persistent-sam-1",
      name: "SUNDAY AFTER MIDNIGHT",
      is_owner: true,
    });
  };

  await createSundayAfterMidnightVoice(
    "generated-3",
    approval,
    { apiKey: "server-secret", fetchImpl },
  );

  assert.equal(capturedBody.voice_name, "SUNDAY AFTER MIDNIGHT");
  assert.equal(capturedBody.voice_description, SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription);
  assert.deepEqual(capturedBody.labels, {
    artist: "BLAIZE SUNDAY",
    canon: "SUNDAY AFTER MIDNIGHT",
    voice_identity_id: "blaize-sunday/sunday-after-midnight",
  });
});
