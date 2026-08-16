import { hashPayload } from "../../shared/src/domain.ts";

export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVISION_REQUESTED";

export type ApprovalDecision = "APPROVE" | "REJECT" | "REQUEST_REVISION";

export interface ApprovalRequest {
  id: string;
  projectId: string;
  releaseId: string;
  actionType: string;
  payload: unknown;
  payloadHash: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: Date;
  expiresAt: Date;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
}

export interface RevisionInstruction {
  approvalId: string;
  projectId: string;
  releaseId: string;
  target: "artist_operations_orchestrator";
  instruction: string;
  requestedBy: string;
  createdAt: Date;
}

export class ApprovalDomainError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ApprovalDomainError";
    this.code = code;
  }
}

export function createApprovalRequest(input: {
  id: string;
  projectId: string;
  releaseId: string;
  actionType: string;
  payload: unknown;
  requestedBy: string;
  requestedAt: Date;
  expiresAt: Date;
}): ApprovalRequest {
  if (input.expiresAt.getTime() <= input.requestedAt.getTime()) {
    throw new ApprovalDomainError("INVALID_APPROVAL_EXPIRY");
  }

  return {
    ...input,
    payloadHash: hashPayload(input.payload),
    status: "PENDING",
    resolvedBy: null,
    resolvedAt: null,
    resolutionNote: null
  };
}

export function resolveApproval(
  approval: ApprovalRequest,
  input: {
    decision: ApprovalDecision;
    payload: unknown;
    actor: string;
    note?: string;
    now: Date;
  }
): {
  approval: ApprovalRequest;
  revisionInstruction: RevisionInstruction | null;
} {
  if (approval.status !== "PENDING") {
    throw new ApprovalDomainError("APPROVAL_ALREADY_RESOLVED");
  }

  if (input.now.getTime() > approval.expiresAt.getTime()) {
    throw new ApprovalDomainError("APPROVAL_EXPIRED");
  }

  if (hashPayload(input.payload) !== approval.payloadHash) {
    throw new ApprovalDomainError("PAYLOAD_MISMATCH");
  }

  const note = input.note?.trim() || null;
  if (input.decision !== "APPROVE" && !note) {
    throw new ApprovalDomainError("RESOLUTION_NOTE_REQUIRED");
  }

  const statusByDecision: Record<ApprovalDecision, ApprovalStatus> = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    REQUEST_REVISION: "REVISION_REQUESTED"
  };

  const resolved: ApprovalRequest = {
    ...approval,
    status: statusByDecision[input.decision],
    resolvedBy: input.actor,
    resolvedAt: input.now,
    resolutionNote: note
  };

  const revisionInstruction =
    input.decision === "REQUEST_REVISION" || input.decision === "REJECT"
      ? {
          approvalId: approval.id,
          projectId: approval.projectId,
          releaseId: approval.releaseId,
          target: "artist_operations_orchestrator" as const,
          instruction: note as string,
          requestedBy: input.actor,
          createdAt: input.now
        }
      : null;

  return { approval: resolved, revisionInstruction };
}
