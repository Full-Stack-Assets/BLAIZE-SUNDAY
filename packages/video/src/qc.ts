import type { CaptionRecord, VideoRunRecord } from "./repository.ts";
import type { TechnicalMetadata } from "./technical-inspection.ts";

export interface VideoQcReceipt {
  failures: string[];
  unresolved: string[];
  warnings: string[];
  verified: boolean;
}

export interface EvaluateVideoQcInput {
  run: VideoRunRecord;
  captions: CaptionRecord[];
  transcript?: string | null;
  technicalMetadata?: TechnicalMetadata | null;
  staticEndingRisk?: boolean;
  coverageAliases?: Record<string, string[]>;
}

function hasFinalError(error: unknown): boolean {
  if (!error || typeof error !== "object" || Array.isArray(error)) return false;
  const record = error as Record<string, unknown>;
  return Boolean(record.final_error ?? record.finalError);
}

function requiredCoverage(run: VideoRunRecord): string[] {
  if (!run.brief || typeof run.brief !== "object" || Array.isArray(run.brief)) {
    return [];
  }
  const value = (run.brief as Record<string, unknown>).requiredCoverage;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsCoverage(
  transcript: string,
  required: string,
  aliases: Record<string, string[]>
): boolean {
  const normalizedTranscript = normalizeText(transcript);
  const candidates = [required, ...(aliases[required] ?? [])];
  return candidates.some(candidate => {
    const normalizedCandidate = normalizeText(candidate);
    return Boolean(normalizedCandidate) && normalizedTranscript.includes(normalizedCandidate);
  });
}

export function evaluateVideoQc(input: EvaluateVideoQcInput): VideoQcReceipt {
  const failures: string[] = [];
  const unresolved: string[] = [];
  const warnings: string[] = [];
  const { run, captions, technicalMetadata, transcript } = input;

  if (run.externalStatus !== "completed") failures.push("FAIL_PROVIDER_STATUS");
  if (hasFinalError(run.providerError)) failures.push("FAIL_PROVIDER_ERROR");
  if (!run.videoUrl) failures.push("FAIL_VIDEO_URL");

  if (!technicalMetadata) {
    unresolved.push("TECHNICAL_METADATA_UNAVAILABLE");
  } else {
    const tolerance = run.durationTolerancePercent / 100;
    const lower = run.targetDurationSeconds * (1 - tolerance);
    const upper = run.targetDurationSeconds * (1 + tolerance);
    if (
      technicalMetadata.durationSeconds < lower ||
      technicalMetadata.durationSeconds > upper
    ) {
      failures.push("FAIL_DURATION");
    }
    if (technicalMetadata.width < 1280 || technicalMetadata.height < 720) {
      failures.push("FAIL_RESOLUTION");
    }
    if (technicalMetadata.fps < 24) failures.push("FAIL_FPS");
  }

  if (!captions.length) {
    failures.push("FAIL_CAPTIONS");
  } else if (technicalMetadata) {
    const latestVersion = Math.max(...captions.map(caption => caption.version));
    const latest = captions.filter(caption => caption.version === latestVersion);
    if (
      latest.some(
        caption =>
          caption.cueCount <= 0 ||
          caption.startSeconds < 0 ||
          caption.endSeconds <= caption.startSeconds ||
          caption.endSeconds > technicalMetadata.durationSeconds + 0.25
      )
    ) {
      failures.push("FAIL_CAPTION_RANGE");
    }
  }

  const coverage = requiredCoverage(run);
  if (!transcript?.trim()) {
    if (coverage.length) unresolved.push("UNKNOWN_COVERAGE");
  } else {
    for (const item of coverage) {
      if (!containsCoverage(transcript, item, input.coverageAliases ?? {})) {
        failures.push(`FAIL_COVERAGE:${item}`);
      }
    }
  }

  if (input.staticEndingRisk) warnings.push("STATIC_ENDING_RISK");

  return {
    failures,
    unresolved,
    warnings,
    verified: failures.length === 0 && unresolved.length === 0
  };
}
