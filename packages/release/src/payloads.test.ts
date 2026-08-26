import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDistributionPayload,
  buildDspChecklist,
  buildYouTubePayload,
  ReleasePayloadError,
  type ReleasePreparationContext
} from "./payloads.ts";

function completeContext(): ReleasePreparationContext {
  return {
    releaseId: "release-1",
    projectId: "project-1",
    status: "PREPARED",
    artistName: "BLAIZE SUNDAY",
    title: "Chrome Receipt",
    master: {
      id: "audio-1",
      fileUrl: "https://assets.example/audio-1.wav",
      sha256: "a".repeat(64),
      approved: true,
      durationSeconds: 138,
      contentType: "audio/wav"
    },
    coverArt: {
      id: "visual-1",
      fileUrl: "https://assets.example/cover.png",
      sha256: "b".repeat(64),
      approved: true,
      width: 3000,
      height: 3000,
      contentType: "image/png"
    },
    metadata: {
      title: "Chrome Receipt",
      artistName: "BLAIZE SUNDAY",
      genre: "Alt Pop",
      subgenre: "Luxury Glitch Pop",
      language: "en",
      explicit: false,
      description: "The outfit survived. The emotional operating system did not.",
      tags: ["blaize sunday", "luxury glitch", "alt pop"],
      credits: { primaryArtist: "BLAIZE SUNDAY" }
    },
    rights: {
      approved: true,
      ownershipConfirmed: true,
      provenanceComplete: true,
      warnings: []
    }
  };
}

function routeNoteReadyContext(aiAssisted = false): ReleasePreparationContext {
  const context = completeContext();
  context.master!.contentType = "audio/flac";
  context.coverArt!.contentType = "image/jpeg";

  Object.assign(context.master!, {
    channels: 2,
    sampleRateHz: 44_100,
    bitDepth: 16,
    bitrateKbps: 320
  });
  Object.assign(context.coverArt!, {
    fileSizeBytes: 5_000_000,
    colorSpace: "RGB"
  });
  Object.assign(context.metadata!, {
    labelName: "BLAIZE SUNDAY",
    cLine: "Test Artist Legal Name",
    pLine: "Test Artist Legal Name",
    writers: [
      { firstName: "Test", lastName: "Artist", role: "composer" },
      { firstName: "Test", lastName: "Artist", role: "lyricist" }
    ],
    originalReleaseDate: "2026-08-25",
    salesStartDate: "2026-09-15",
    aiAssisted,
    aiSourceUrls: aiAssisted ? ["https://example.ai/source"] : []
  });

  return context;
}

test("DSP checklist reports missing approved assets and rights", () => {
  const context = completeContext();
  context.master = null;
  context.rights.approved = false;

  const checklist = buildDspChecklist(context);

  assert.equal(checklist.readyForAuthorization, false);
  assert.ok(checklist.missingRequirements.includes("APPROVED_MASTER"));
  assert.ok(checklist.missingRequirements.includes("RIGHTS_APPROVED"));
});

test("DSP checklist passes a complete package", () => {
  assert.equal(buildDspChecklist(completeContext()).readyForAuthorization, true);
});

test("distribution payload is deterministic and stops at authorization", () => {
  const first = buildDistributionPayload(completeContext(), "test-dsp");
  const second = buildDistributionPayload(completeContext(), "test-dsp");

  assert.equal(first.payloadHash, second.payloadHash);
  assert.equal(first.nextStatus, "AWAITING_AUTHORIZATION");
  assert.equal(first.submissionPerformed, false);
});

test("RouteNote Free payload advertises browser automation without claiming submission", () => {
  const result = buildDistributionPayload(
    routeNoteReadyContext(),
    "routenote-free"
  );
  const payload = result.payload as Record<string, any>;

  assert.equal(payload.provider, "routenote-free");
  assert.equal(payload.distributionPlan, "FREE");
  assert.deepEqual(payload.handoff, {
    mode: "BROWSER_AUTOMATION",
    createReleaseSupported: true,
    metadataUploadSupported: true,
    audioUploadSupported: true,
    artworkUploadSupported: true,
    storeConfigurationSupported: true,
    draftCompletionSupported: true,
    finalSubmission: "HUMAN_AUTHORIZED",
    finalAction: "DISTRIBUTE_FREE",
    termsAcceptanceRequired: true
  });
  assert.equal(payload.identifiers.upc.mode, "ROUTENOTE_GENERATED");
  assert.deepEqual(payload.storePolicy.requested, [
    "SPOTIFY",
    "APPLE_MUSIC",
    "YOUTUBE_MUSIC"
  ]);
  assert.equal(result.submissionPerformed, false);
});

test("RouteNote Free maps canonical metadata into the iOS release form", () => {
  const result = buildDistributionPayload(
    routeNoteReadyContext(),
    "routenote-free"
  );
  const payload = result.payload as Record<string, any>;

  assert.deepEqual(payload.routeNoteForm, {
    releaseData: {
      upc: "GENERATE_FREE",
      releaseTitle: "Chrome Receipt"
    },
    albumDetails: {
      language: "en",
      primaryArtist: "BLAIZE SUNDAY",
      primaryGenre: "Alt Pop",
      secondaryGenre: "Luxury Glitch Pop",
      compositionCopyright: "Test Artist Legal Name",
      soundRecordingCopyright: "Test Artist Legal Name",
      recordLabelName: "BLAIZE SUNDAY",
      originalReleaseDate: "2026-08-25",
      salesStartDate: "2026-09-15",
      explicit: false
    },
    publishingDetails: [
      { firstName: "Test", lastName: "Artist", role: "composer" },
      { firstName: "Test", lastName: "Artist", role: "lyricist" }
    ],
    manageStores: {
      requested: ["SPOTIFY", "APPLE_MUSIC", "YOUTUBE_MUSIC"],
      territoryMode: "WORLDWIDE"
    }
  });
});

test("RouteNote Free fails closed when upload requirements are not proven", () => {
  assert.throws(
    () => buildDistributionPayload(completeContext(), "routenote-free"),
    (error: unknown) => {
      assert.ok(error instanceof ReleasePayloadError);
      assert.equal(error.code, "ROUTENOTE_PACKAGE_INCOMPLETE");
      const missing = error.missingRequirements as string[];
      assert.ok(missing.includes("ROUTENOTE_AUDIO_FORMAT"));
      assert.ok(missing.includes("ROUTENOTE_AUDIO_TECHNICAL"));
      assert.ok(missing.includes("ROUTENOTE_ARTWORK_FORMAT"));
      assert.ok(missing.includes("ROUTENOTE_ARTWORK_FILE_SIZE"));
      assert.ok(missing.includes("ROUTENOTE_ARTWORK_COLOR_SPACE"));
      return true;
    }
  );
});

test("RouteNote Free requires an explicit original release date", () => {
  const context = routeNoteReadyContext();
  delete (context.metadata as Record<string, any>).originalReleaseDate;

  assert.throws(
    () => buildDistributionPayload(context, "routenote-free"),
    (error: unknown) => {
      assert.ok(error instanceof ReleasePayloadError);
      assert.ok(
        (error.missingRequirements as string[]).includes(
          "ROUTENOTE_ORIGINAL_RELEASE_DATE"
        )
      );
      return true;
    }
  );
});

test("RouteNote Free requires a sales start date", () => {
  const context = routeNoteReadyContext();
  delete (context.metadata as Record<string, any>).salesStartDate;

  assert.throws(
    () => buildDistributionPayload(context, "routenote-free"),
    (error: unknown) => {
      assert.ok(error instanceof ReleasePayloadError);
      assert.ok(
        (error.missingRequirements as string[]).includes(
          "ROUTENOTE_SALES_START_DATE"
        )
      );
      return true;
    }
  );
});

test("RouteNote Free rejects a sales start date before the original release date", () => {
  const context = routeNoteReadyContext();
  (context.metadata as Record<string, any>).salesStartDate = "2026-08-24";

  assert.throws(
    () => buildDistributionPayload(context, "routenote-free"),
    (error: unknown) => {
      assert.ok(error instanceof ReleasePayloadError);
      assert.ok(
        (error.missingRequirements as string[]).includes(
          "ROUTENOTE_RELEASE_DATE_ORDER"
        )
      );
      return true;
    }
  );
});

test("RouteNote Free requires explicit AI classification", () => {
  const context = routeNoteReadyContext();
  delete (context.metadata as Record<string, any>).aiAssisted;

  assert.throws(
    () => buildDistributionPayload(context, "routenote-free"),
    (error: unknown) => {
      assert.ok(error instanceof ReleasePayloadError);
      assert.ok(
        (error.missingRequirements as string[]).includes(
          "ROUTENOTE_AI_CLASSIFICATION"
        )
      );
      return true;
    }
  );
});

test("AI-assisted RouteNote package requires provider-source provenance", () => {
  const context = routeNoteReadyContext(true);
  context.metadata!.aiSourceUrls = [];

  assert.throws(
    () => buildDistributionPayload(context, "routenote-free"),
    (error: unknown) => {
      assert.ok(error instanceof ReleasePayloadError);
      assert.ok(
        (error.missingRequirements as string[]).includes(
          "ROUTENOTE_AI_PROVENANCE"
        )
      );
      return true;
    }
  );
});

test("AI-assisted RouteNote package excludes unsupported delivery options", () => {
  const result = buildDistributionPayload(
    routeNoteReadyContext(true),
    "routenote-free"
  );
  const payload = result.payload as Record<string, any>;

  assert.deepEqual(payload.storePolicy.excluded, [
    "AMAZON_MUSIC",
    "CONTENT_RECOGNITION",
    "MELON",
    "GENIE",
    "BUGS",
    "FLO",
    "VIBE"
  ]);
  assert.deepEqual(payload.aiPolicy, {
    aiAssisted: true,
    sourceUrls: ["https://example.ai/source"],
    keepProviderNamesOutOfReleaseMetadata: true,
    additionalModerationPossible: true
  });
});

test("YouTube payload maps assets and remains private without uploading", () => {
  const result = buildYouTubePayload(completeContext());

  assert.deepEqual(result.payload, {
    title: `${completeContext().artistName} — ${completeContext().title}`,
    description:
      "The outfit survived. The emotional operating system did not.",
    tags: ["blaize sunday", "luxury glitch", "alt pop"],
    audioAssetId: "audio-1",
    thumbnailAssetId: "visual-1",
    privacyStatus: "private",
    madeForKids: false
  });
  assert.equal(result.uploadPerformed, false);
});
