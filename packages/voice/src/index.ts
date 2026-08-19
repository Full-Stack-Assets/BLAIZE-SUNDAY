export * from "./elevenlabs-design.ts";

export type VoiceStatus = "UNCONFIGURED" | "UNVERIFIED" | "ACTIVE";

export interface CanonicalVoice {
  name: string;
  providerVoiceId: string | null;
  spokenCapable: boolean;
  sungCapable: boolean;
  status: VoiceStatus;
  consistency: "UNVERIFIED" | number;
}

export function inspectCanonicalVoice(input?: {
  providerVoiceId?: string | null;
  elevenLabsKey?: string | null;
}): CanonicalVoice {
  const providerVoiceId = input?.providerVoiceId?.trim() || null;
  const hasProvider = Boolean(input?.elevenLabsKey?.trim() || process.env.ELEVENLABS_API_KEY);
  if (!providerVoiceId || !hasProvider) {
    return {
      name: "SUNDAY AFTER MIDNIGHT",
      providerVoiceId,
      spokenCapable: false,
      sungCapable: false,
      status: "UNCONFIGURED",
      consistency: "UNVERIFIED"
    };
  }
  return {
    name: "SUNDAY AFTER MIDNIGHT",
    providerVoiceId,
    spokenCapable: true,
    sungCapable: false,
    status: "UNVERIFIED",
    consistency: "UNVERIFIED"
  };
}

export function assertNotPlaceholderActive(voice: CanonicalVoice): void {
  if (voice.status === "ACTIVE" && !voice.providerVoiceId) {
    throw new Error("PLACEHOLDER_VOICE_CANNOT_BE_ACTIVE");
  }
}
