export type VideoUiStatus =
  | "PLANNED"
  | "AWAITING_EXTERNAL_EXECUTION"
  | "PENDING"
  | "COMPLETED"
  | "GENERATED"
  | "CAPTIONS_REQUIRED"
  | "QC_FAILED"
  | "NEEDS_REVISION"
  | "VERIFIED"
  | "FAILED";

export const MUTATION_ACTIONS = [
  { value: "REGENERATE", label: "Regenerate" },
  { value: "MORE_CINEMATIC", label: "More cinematic" },
  { value: "MORE_EXPLANATORY", label: "More explanatory" },
  { value: "SHORTER", label: "Shorter" },
  { value: "LONGER", label: "Longer" }
] as const;

export interface PersistedExecutionRunDetail {
  compiledConcept: string;
  compiledExplanation: string;
  promptHash: string;
  brief: unknown;
}

export function executionPayloadFromRunDetail(run: PersistedExecutionRunDetail) {
  const brief =
    run.brief && typeof run.brief === "object" && !Array.isArray(run.brief)
      ? (run.brief as Record<string, unknown>)
      : {};
  const locale =
    typeof brief.locale === "string" && brief.locale.trim()
      ? brief.locale.trim()
      : "en";

  return {
    provider: "WISEBASE" as const,
    mode: "CONNECTOR_MEDIATED" as const,
    concept: run.compiledConcept,
    explanation: run.compiledExplanation,
    lang: locale,
    promptHash: run.promptHash
  };
}

export function describeVideoRunStatus(status: VideoUiStatus): string {
  switch (status) {
    case "AWAITING_EXTERNAL_EXECUTION":
      return "Payload prepared. Run it through the Wisebase connector, then attach the task receipt.";
    case "PENDING":
      return "Wisebase task recorded and still processing.";
    case "COMPLETED":
    case "GENERATED":
      return "Provider generation completed. Verification evidence is still required.";
    case "CAPTIONS_REQUIRED":
      return "Video generated. Persistent captions are required before QC can verify it.";
    case "QC_FAILED":
      return "QC found one or more hard failures. Create a revision or correct the evidence.";
    case "NEEDS_REVISION":
      return "Required evidence is unresolved. Review or revise before verification.";
    case "VERIFIED":
      return "Verified against the current technical, caption, and coverage gates.";
    case "FAILED":
      return "Generation failed or returned an unusable provider result.";
    default:
      return "Run is planned but has not entered external execution.";
  }
}

export function formatTechnicalSummary(input: {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
}): string {
  if (
    input.durationSeconds === null ||
    input.width === null ||
    input.height === null ||
    input.fps === null
  ) {
    return "Not inspected";
  }
  const duration = Number.isInteger(input.durationSeconds)
    ? String(input.durationSeconds)
    : input.durationSeconds.toFixed(1);
  const fps = Number.isInteger(input.fps) ? String(input.fps) : input.fps.toFixed(1);
  return `${duration}s · ${input.width}×${input.height} · ${fps}fps`;
}
