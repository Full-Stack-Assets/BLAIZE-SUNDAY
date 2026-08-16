import type { DistributionStatus } from "../../../packages/release/src/state-machine.ts";

export const RELEASE_FLOW = [
  "PREPARED",
  "AWAITING_AUTHORIZATION",
  "SUBMITTED",
  "ACCEPTED",
  "SCHEDULED",
  "LIVE"
] as const;

export type TimelineState = "COMPLETE" | "CURRENT" | "UPCOMING" | "FAILED";

export function buildReleaseTimeline(status: DistributionStatus) {
  if (status === "FAILED") {
    return RELEASE_FLOW.map(item => ({ status: item, state: "FAILED" as const }));
  }

  const currentIndex = RELEASE_FLOW.indexOf(
    status as (typeof RELEASE_FLOW)[number]
  );
  return RELEASE_FLOW.map((item, index) => ({
    status: item,
    state: (index < currentIndex
      ? "COMPLETE"
      : index === currentIndex
        ? "CURRENT"
        : "UPCOMING") as TimelineState
  }));
}

export function releaseTruthLabel(input: {
  status: DistributionStatus;
  verifiedPlatformUrl: string | null;
  externalConfirmationId: string | null;
}): string {
  if (input.status === "LIVE") {
    return input.verifiedPlatformUrl && input.externalConfirmationId
      ? "LIVE — EXTERNALLY VERIFIED"
      : "INCONSISTENT — LIVE EVIDENCE MISSING";
  }

  if (input.status === "AWAITING_AUTHORIZATION") {
    return "AWAITING AUTHORIZATION — NOT SUBMITTED";
  }

  if (input.status === "PREPARED") {
    return "PREPARED — NOT SUBMITTED";
  }

  if (input.status === "FAILED") {
    return "FAILED — REVISION OR RECOVERY REQUIRED";
  }

  return input.status;
}
