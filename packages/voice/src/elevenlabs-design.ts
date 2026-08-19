import { createHash } from "node:crypto";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
const DESIGN_ENDPOINT = "/v1/text-to-voice/design";
const CREATE_ENDPOINT = "/v1/text-to-voice";

export type VoiceDesignFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type VoiceDesignModelId =
  | "eleven_multilingual_ttv_v2"
  | "eleven_ttv_v3";

export interface VoiceDesignPreview {
  audioBase64: string;
  generatedVoiceId: string;
  mediaType: string;
  durationSecs: number;
  language: string;
}

export interface VoiceDesignProvenance {
  provider: "elevenlabs";
  endpoint: typeof DESIGN_ENDPOINT;
  modelId: VoiceDesignModelId;
  requestHash: string;
  seed: number | null;
  usedReferenceAudio: false;
}

export interface VoiceDesignResult {
  previews: VoiceDesignPreview[];
  previewText: string;
  voiceDescription: string;
  provenance: VoiceDesignProvenance;
}

export interface HumanVoicePersistenceApproval {
  approved: true;
  approvedBy: string;
  approvalId: string;
}

export interface DesignedVoiceResult {
  voiceId: string;
  name: string | null;
  category: string | null;
  isOwner: boolean | null;
  previewUrl: string | null;
  permissionOnResource: string | null;
  approvalId: string;
  approvedBy: string;
}

export interface VoiceDesignRuntimeOptions {
  apiKey?: string | null;
  fetchImpl?: VoiceDesignFetch;
  baseUrl?: string;
}

export const SUNDAY_AFTER_MIDNIGHT_DESIGN = Object.freeze({
  voiceName: "SUNDAY AFTER MIDNIGHT",
  voiceIdentityId: "blaize-sunday/sunday-after-midnight",
  modelId: "eleven_ttv_v3" as const,
  seed: 17081926,
  voiceDescription:
    "Original contemporary American masculine artist voice in a warm low-mid register. Intimate close-mic presence, relaxed slightly behind-the-beat phrasing, dry self-aware confidence, clean sibilants and crisp consonants, controlled breath texture, and an emotionally guarded baseline that can reveal precise vulnerability without melodrama. Modern, region-neutral, lightly textured, smooth rather than booming, capable of rhythm-forward melodic-rap delivery and soft R&B extension. Avoid announcer projection, exaggerated rasp, cartoon swagger, glossy generic pop polish, theatrical diction, smeared consonants, and artificial vocal affectation.",
  previewText:
    "Card declined, fit approved. I look certain, feel confused. Bad decisions, great outfit. I got good at looking certain long before I felt okay.",
});

export class ElevenLabsVoiceDesignError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, status: number | null = null) {
    super(code);
    this.name = "ElevenLabsVoiceDesignError";
    this.code = code;
    this.status = status;
  }
}

function requiredApiKey(options?: VoiceDesignRuntimeOptions): string {
  const key = options?.apiKey?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new ElevenLabsVoiceDesignError("ELEVENLABS_API_KEY_MISSING");
  }
  return key;
}

function runtimeFetch(options?: VoiceDesignRuntimeOptions): VoiceDesignFetch {
  return options?.fetchImpl ?? globalThis.fetch.bind(globalThis);
}

function runtimeBaseUrl(options?: VoiceDesignRuntimeOptions): string {
  return (options?.baseUrl?.trim() || ELEVENLABS_BASE_URL).replace(/\/$/, "");
}

function validateLength(
  value: string,
  min: number,
  max: number,
  code: string,
): string {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ElevenLabsVoiceDesignError(code);
  }
  return trimmed;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function parseJson(response: Response, invalidCode: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ElevenLabsVoiceDesignError(invalidCode, response.status);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePreview(value: unknown): VoiceDesignPreview | null {
  if (!isRecord(value)) return null;

  const audioBase64 = value.audio_base_64;
  const generatedVoiceId = value.generated_voice_id;
  const mediaType = value.media_type;
  const durationSecs = value.duration_secs;
  const language = value.language;

  if (
    typeof audioBase64 !== "string" ||
    !audioBase64 ||
    typeof generatedVoiceId !== "string" ||
    !generatedVoiceId ||
    typeof mediaType !== "string" ||
    !mediaType ||
    typeof durationSecs !== "number" ||
    !Number.isFinite(durationSecs) ||
    durationSecs <= 0 ||
    typeof language !== "string" ||
    !language
  ) {
    return null;
  }

  return {
    audioBase64,
    generatedVoiceId,
    mediaType,
    durationSecs,
    language,
  };
}

function parseDesignResponse(value: unknown): {
  previews: VoiceDesignPreview[];
  text: string;
} {
  if (!isRecord(value) || !Array.isArray(value.previews) || typeof value.text !== "string") {
    throw new ElevenLabsVoiceDesignError(
      "ELEVENLABS_VOICE_DESIGN_INVALID_RESPONSE",
    );
  }

  const previews = value.previews.map(parsePreview);
  if (previews.length !== 3 || previews.some((preview) => preview === null)) {
    throw new ElevenLabsVoiceDesignError(
      "ELEVENLABS_VOICE_DESIGN_INVALID_RESPONSE",
    );
  }

  return {
    previews: previews as VoiceDesignPreview[],
    text: value.text,
  };
}

function parseCreatedVoice(value: unknown): {
  voiceId: string;
  name: string | null;
  category: string | null;
  isOwner: boolean | null;
  previewUrl: string | null;
  permissionOnResource: string | null;
} {
  if (!isRecord(value) || typeof value.voice_id !== "string" || !value.voice_id) {
    throw new ElevenLabsVoiceDesignError(
      "ELEVENLABS_VOICE_CREATE_INVALID_RESPONSE",
    );
  }

  return {
    voiceId: value.voice_id,
    name: typeof value.name === "string" ? value.name : null,
    category: typeof value.category === "string" ? value.category : null,
    isOwner: typeof value.is_owner === "boolean" ? value.is_owner : null,
    previewUrl: typeof value.preview_url === "string" ? value.preview_url : null,
    permissionOnResource:
      typeof value.permission_on_resource === "string"
        ? value.permission_on_resource
        : null,
  };
}

export async function designVoicePreviews(
  input: {
    voiceDescription: string;
    previewText: string;
    modelId?: VoiceDesignModelId;
    seed?: number | null;
    guidanceScale?: number;
    quality?: number;
  },
  options?: VoiceDesignRuntimeOptions,
): Promise<VoiceDesignResult> {
  const apiKey = requiredApiKey(options);
  const voiceDescription = validateLength(
    input.voiceDescription,
    20,
    1000,
    "VOICE_DESCRIPTION_LENGTH_INVALID",
  );
  const previewText = validateLength(
    input.previewText,
    100,
    1000,
    "VOICE_PREVIEW_TEXT_LENGTH_INVALID",
  );
  const modelId = input.modelId ?? "eleven_ttv_v3";
  const seed = input.seed ?? null;

  const body = {
    voice_description: voiceDescription,
    text: previewText,
    auto_generate_text: false,
    model_id: modelId,
    ...(seed === null ? {} : { seed }),
    ...(input.guidanceScale === undefined
      ? {}
      : { guidance_scale: input.guidanceScale }),
    ...(input.quality === undefined ? {} : { quality: input.quality }),
  };

  const response = await runtimeFetch(options)(
    `${runtimeBaseUrl(options)}${DESIGN_ENDPOINT}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new ElevenLabsVoiceDesignError(
      "ELEVENLABS_VOICE_DESIGN_PROVIDER_ERROR",
      response.status,
    );
  }

  const parsed = parseDesignResponse(
    await parseJson(response, "ELEVENLABS_VOICE_DESIGN_INVALID_RESPONSE"),
  );

  return {
    previews: parsed.previews,
    previewText: parsed.text,
    voiceDescription,
    provenance: {
      provider: "elevenlabs",
      endpoint: DESIGN_ENDPOINT,
      modelId,
      requestHash: sha256(body),
      seed,
      usedReferenceAudio: false,
    },
  };
}

export function designSundayAfterMidnightPreviews(
  options?: VoiceDesignRuntimeOptions,
): Promise<VoiceDesignResult> {
  return designVoicePreviews(
    {
      voiceDescription: SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription,
      previewText: SUNDAY_AFTER_MIDNIGHT_DESIGN.previewText,
      modelId: SUNDAY_AFTER_MIDNIGHT_DESIGN.modelId,
      seed: SUNDAY_AFTER_MIDNIGHT_DESIGN.seed,
    },
    options,
  );
}

function requireHumanApproval(
  approval: HumanVoicePersistenceApproval | null | undefined,
): HumanVoicePersistenceApproval {
  if (
    !approval?.approved ||
    !approval.approvedBy.trim() ||
    !approval.approvalId.trim()
  ) {
    throw new ElevenLabsVoiceDesignError(
      "VOICE_PERSISTENCE_REQUIRES_HUMAN_AUTHORITY",
    );
  }
  return approval;
}

export async function createDesignedVoice(
  input: {
    generatedVoiceId: string;
    voiceName: string;
    voiceDescription: string;
    labels?: Record<string, string>;
    approval: HumanVoicePersistenceApproval | null;
  },
  options?: VoiceDesignRuntimeOptions,
): Promise<DesignedVoiceResult> {
  const approval = requireHumanApproval(input.approval);
  const apiKey = requiredApiKey(options);
  const generatedVoiceId = input.generatedVoiceId.trim();
  const voiceName = input.voiceName.trim();
  const voiceDescription = validateLength(
    input.voiceDescription,
    20,
    1000,
    "VOICE_DESCRIPTION_LENGTH_INVALID",
  );

  if (!generatedVoiceId) {
    throw new ElevenLabsVoiceDesignError("GENERATED_VOICE_ID_REQUIRED");
  }
  if (!voiceName) {
    throw new ElevenLabsVoiceDesignError("VOICE_NAME_REQUIRED");
  }

  const body = {
    voice_name: voiceName,
    voice_description: voiceDescription,
    generated_voice_id: generatedVoiceId,
    ...(input.labels ? { labels: input.labels } : {}),
  };

  const response = await runtimeFetch(options)(
    `${runtimeBaseUrl(options)}${CREATE_ENDPOINT}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new ElevenLabsVoiceDesignError(
      "ELEVENLABS_VOICE_CREATE_PROVIDER_ERROR",
      response.status,
    );
  }

  const voice = parseCreatedVoice(
    await parseJson(response, "ELEVENLABS_VOICE_CREATE_INVALID_RESPONSE"),
  );

  return {
    ...voice,
    approvalId: approval.approvalId,
    approvedBy: approval.approvedBy,
  };
}

export function createSundayAfterMidnightVoice(
  generatedVoiceId: string,
  approval: HumanVoicePersistenceApproval | null,
  options?: VoiceDesignRuntimeOptions,
): Promise<DesignedVoiceResult> {
  return createDesignedVoice(
    {
      generatedVoiceId,
      voiceName: SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceName,
      voiceDescription: SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceDescription,
      labels: {
        artist: "BLAIZE SUNDAY",
        canon: "SUNDAY AFTER MIDNIGHT",
        voice_identity_id: SUNDAY_AFTER_MIDNIGHT_DESIGN.voiceIdentityId,
      },
      approval,
    },
    options,
  );
}
