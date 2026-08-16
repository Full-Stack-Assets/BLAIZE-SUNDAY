export type DistributionStatus =
  | "PREPARED"
  | "AWAITING_AUTHORIZATION"
  | "SUBMITTED"
  | "ACCEPTED"
  | "SCHEDULED"
  | "LIVE"
  | "FAILED";

export interface TransitionEvidence {
  actionPayloadHash?: string;
  approval?: {
    status: string;
    payloadHash: string;
    expiresAt: Date;
  };
  now?: Date;
  verifiedPlatformUrl?: string;
  externalConfirmationId?: string;
  revisionRequested?: boolean;
}

export class ReleaseTransitionError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ReleaseTransitionError";
    this.code = code;
  }
}

const FORWARD_TRANSITIONS: Record<DistributionStatus, DistributionStatus[]> = {
  PREPARED: ["AWAITING_AUTHORIZATION", "FAILED"],
  AWAITING_AUTHORIZATION: ["SUBMITTED", "FAILED"],
  SUBMITTED: ["ACCEPTED", "FAILED"],
  ACCEPTED: ["SCHEDULED", "FAILED"],
  SCHEDULED: ["LIVE", "FAILED"],
  LIVE: [],
  FAILED: ["PREPARED"]
};

export function transitionRelease(
  from: DistributionStatus,
  to: DistributionStatus,
  evidence: TransitionEvidence
): DistributionStatus {
  if (from === "AWAITING_AUTHORIZATION" && to === "PREPARED") {
    if (!evidence.revisionRequested) {
      throw new ReleaseTransitionError("REVISION_EVIDENCE_REQUIRED");
    }
    return to;
  }

  if (!FORWARD_TRANSITIONS[from].includes(to)) {
    throw new ReleaseTransitionError("INVALID_RELEASE_TRANSITION");
  }

  if (from === "AWAITING_AUTHORIZATION" && to === "SUBMITTED") {
    const now = evidence.now ?? new Date();
    const approval = evidence.approval;
    const authorized =
      approval?.status === "APPROVED" &&
      Boolean(evidence.actionPayloadHash) &&
      approval.payloadHash === evidence.actionPayloadHash &&
      approval.expiresAt.getTime() >= now.getTime();

    if (!authorized) {
      throw new ReleaseTransitionError("SUBMISSION_NOT_AUTHORIZED");
    }
  }

  if (to === "LIVE") {
    if (!evidence.verifiedPlatformUrl || !evidence.externalConfirmationId) {
      throw new ReleaseTransitionError("LIVE_EVIDENCE_REQUIRED");
    }
  }

  return to;
}
