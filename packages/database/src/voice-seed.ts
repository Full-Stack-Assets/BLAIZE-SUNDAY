import type { Prisma } from "@prisma/client";

export const SUNDAY_AFTER_MIDNIGHT_D1 = {
  voiceIdentityId: "blaize-sunday/sunday-after-midnight",
  internalCandidate: "D1",
  provider: "elevenlabs",
  providerVoiceId: "j9nOYxfwt3sxAi32BnNI",
  providerAssetClass: "generated_persisted",
  status: "D1_PERSISTED_G2_PENDING",
  sourceDesignRunId: "32251130820",
  persistenceRunId: "32251778352",
  persistenceArtifactId: "9364690010",
  approvalId: "BLAIZE-G2-D1-SELECTION-2026-08-19",
  g2Locked: false,
  singingValidated: false,
  productionScalingAuthorized: false,
  referenceAudioUsed: false,
  rights: {
    ownership: "PROVIDER_PERSISTED_USER_ASSET",
    commercialContinuity: "UNVERIFIED"
  },
  timbre: {
    register: "warm masculine low-mid",
    micPerspective: "intimate close-mic",
    cadence: "relaxed, slightly behind the beat",
    sibilants: "clean",
    breath: "controlled",
    emotionalBaseline: "guarded",
    accent: "contemporary American, not strongly regional"
  },
  antiTargets: [
    "announcer or radio-DJ projection",
    "exaggerated bass or rasp",
    "cartoon swagger",
    "glossy generic pop tenor",
    "theatrical diction",
    "smeared consonants or lispy sibilants",
    "imitation of a known living performer"
  ],
  modes: {
    sundayTalk: { speed: 0.92, stability: 0.58, similarityBoost: 0.82, style: 0.1 },
    blaizeMode: { speed: 1.08, stability: 0.42, similarityBoost: 0.84, style: 0.28 },
    velvet: { speed: 0.86, stability: 0.5, similarityBoost: 0.86, style: 0.22 },
    zeroStatic: { speed: 0.78, stability: 0.68, similarityBoost: 0.88, style: 0.04 }
  },
  g2Thresholds: {
    aggregateSamePerformerRecognition: 0.7,
    minimumModePairRecognition: 0.6,
    minimumValidIndependentRaters: 12
  }
} as const;

export const D1_REFERENCE_ASSET = {
  candidate: "D1",
  provider: "elevenlabs",
  providerVoiceId: SUNDAY_AFTER_MIDNIGHT_D1.providerVoiceId,
  sourceDesignRunId: SUNDAY_AFTER_MIDNIGHT_D1.sourceDesignRunId,
  persistenceRunId: SUNDAY_AFTER_MIDNIGHT_D1.persistenceRunId,
  persistenceArtifactId: SUNDAY_AFTER_MIDNIGHT_D1.persistenceArtifactId,
  approvalId: SUNDAY_AFTER_MIDNIGHT_D1.approvalId,
  referenceAudioUsed: false,
  status: SUNDAY_AFTER_MIDNIGHT_D1.status
} as const;

function isD1Reference(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.candidate === "D1" ||
    record.providerVoiceId === SUNDAY_AFTER_MIDNIGHT_D1.providerVoiceId ||
    (record.provider === "elevenlabs" && record.approvalId === SUNDAY_AFTER_MIDNIGHT_D1.approvalId)
  );
}

export function mergeApprovedReferenceAssets(existing: unknown): Prisma.InputJsonArray {
  const assets = Array.isArray(existing) ? existing : [];
  return [...assets.filter((asset) => !isD1Reference(asset)), D1_REFERENCE_ASSET] as Prisma.InputJsonArray;
}

export function buildD1VoiceProfileSeed(existingReferenceAssets: unknown) {
  return {
    canonicalVoiceId: SUNDAY_AFTER_MIDNIGHT_D1.providerVoiceId,
    provider: SUNDAY_AFTER_MIDNIGHT_D1.provider,
    verificationStatus: SUNDAY_AFTER_MIDNIGHT_D1.status,
    vocalSettings: SUNDAY_AFTER_MIDNIGHT_D1,
    approvedReferenceAssets: mergeApprovedReferenceAssets(existingReferenceAssets)
  };
}
