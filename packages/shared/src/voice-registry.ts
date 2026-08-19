export type VoiceVerificationStatus =
  | "UNCONFIGURED"
  | "G2_FINALIST"
  | "LOCKED";

export type VoiceUse = "AUDITION" | "INTERNAL_PREVIEW" | "PRODUCTION_RELEASE";

export interface CanonicalVoiceReference {
  voiceIdentityId: string;
  provider: string;
  providerVoiceId: string;
  providerAssetClass: "public" | "private" | "owned";
  verificationStatus: VoiceVerificationStatus;
  ownership: "NOT_OWNED" | "OWNED" | "LICENSED" | "UNKNOWN";
  clonePermission: "ALLOWED" | "DENIED" | "UNKNOWN";
  commercialContinuity: "VERIFIED" | "UNVERIFIED";
}

export interface VoiceResolution {
  voiceIdentityId: string;
  provider: string;
  providerVoiceId: string;
  verificationStatus: VoiceVerificationStatus;
  use: VoiceUse;
}

export const SUNDAY_AFTER_MIDNIGHT_B3: CanonicalVoiceReference = {
  voiceIdentityId: "blaize-sunday/sunday-after-midnight",
  provider: "heygen",
  providerVoiceId: "10863794b2454eaa8781f377939d6f14",
  providerAssetClass: "public",
  verificationStatus: "G2_FINALIST",
  ownership: "NOT_OWNED",
  clonePermission: "UNKNOWN",
  commercialContinuity: "UNVERIFIED"
};

export class VoiceIdentityGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceIdentityGateError";
  }
}

/**
 * Resolve a canonical voice without allowing provider-default substitutions.
 *
 * G2 finalists are permitted for auditions and internal previews only.
 * Production release requires an explicitly LOCKED voice with verified
 * commercial continuity. The resolver intentionally fails closed.
 */
export function resolveCanonicalVoice(
  voice: CanonicalVoiceReference,
  use: VoiceUse
): VoiceResolution {
  if (!voice.voiceIdentityId || !voice.provider || !voice.providerVoiceId) {
    throw new VoiceIdentityGateError(
      "Canonical voice identity is incomplete; provider fallback is prohibited."
    );
  }

  if (use === "PRODUCTION_RELEASE") {
    if (voice.verificationStatus !== "LOCKED") {
      throw new VoiceIdentityGateError(
        `Voice ${voice.voiceIdentityId} is ${voice.verificationStatus}, not LOCKED.`
      );
    }

    if (voice.commercialContinuity !== "VERIFIED") {
      throw new VoiceIdentityGateError(
        `Voice ${voice.voiceIdentityId} lacks verified commercial continuity.`
      );
    }
  }

  return {
    voiceIdentityId: voice.voiceIdentityId,
    provider: voice.provider,
    providerVoiceId: voice.providerVoiceId,
    verificationStatus: voice.verificationStatus,
    use
  };
}
