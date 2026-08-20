export type CaptionPolicy = "REQUIRED";

export type VideoMutation =
  | "ROOT"
  | "REGENERATE"
  | "MORE_CINEMATIC"
  | "MORE_EXPLANATORY"
  | "SHORTER"
  | "LONGER";

export type VideoRunStatus =
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

export interface VideoGenerationBrief {
  title: string;
  topic: string;
  audience: string;
  tone: string;
  targetDurationSeconds: number;
  durationTolerancePercent: number;
  requiredCoverage: string[];
  visualRequirements: string[];
  captionPolicy: CaptionPolicy;
  endingPolicy: "NO_LONG_STATIC_ENDING";
  locale: string;
}

type BriefInput = Omit<
  VideoGenerationBrief,
  | "targetDurationSeconds"
  | "durationTolerancePercent"
  | "captionPolicy"
  | "endingPolicy"
  | "locale"
> &
  Partial<
    Pick<
      VideoGenerationBrief,
      "targetDurationSeconds" | "durationTolerancePercent" | "locale"
    >
  >;

export function createVideoBrief(input: BriefInput): VideoGenerationBrief {
  return {
    ...input,
    requiredCoverage: [...input.requiredCoverage],
    visualRequirements: [...input.visualRequirements],
    targetDurationSeconds: input.targetDurationSeconds ?? 60,
    durationTolerancePercent: input.durationTolerancePercent ?? 15,
    captionPolicy: "REQUIRED",
    endingPolicy: "NO_LONG_STATIC_ENDING",
    locale: input.locale ?? "en"
  };
}
