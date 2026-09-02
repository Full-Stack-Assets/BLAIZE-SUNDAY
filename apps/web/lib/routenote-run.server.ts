import type {
  RouteNoteBrowserJob,
  RouteNoteExecutionStep
} from "@songforge/integrations";
import type {
  ActionPackageRecord,
  ApprovalRequest,
  ReleaseCommandService,
  ReleaseRecord,
  ReleaseRepository
} from "@songforge/release";

import {
  projectRouteNoteReadiness,
  type RouteNoteDraftSummary
} from "./routenote-control.ts";

export type RouteNoteRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "DRAFT_READY"
  | "BLOCKED_OPERATOR_REVIEW"
  | "FAILED";

export interface RouteNotePreflightSummary {
  ready: true;
  releaseId: string;
  releaseTitle: string;
  projectId: string;
  artistId: string;
  actionPackageId: string;
  approvalId: string;
  payloadHash: string;
  approvalStatus: ApprovalRequest["status"];
  approvalExpiresAt: string;
  audioSha256: string[];
  artworkSha256: string;
  submissionPerformed: false;
}

export interface RouteNoteRunRecord {
  id: string;
  idempotencyKey: string;
  releaseId: string;
  releaseTitle: string;
  projectId: string;
  artistId: string;
  actionPackageId: string;
  approvalId: string;
  payloadHash: string;
  status: RouteNoteRunStatus;
  currentStep: RouteNoteExecutionStep | null;
  completedSteps: RouteNoteExecutionStep[];
  errorCode: string | null;
  draft: RouteNoteDraftSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteNoteRunCreateInput {
  idempotencyKey: string;
  releaseId: string;
  releaseTitle: string;
  projectId: string;
  artistId: string;
  actionPackageId: string;
  approvalId: string;
  payloadHash: string;
}

export interface RouteNoteRunStore {
  createOrGet(input: RouteNoteRunCreateInput): Promise<RouteNoteRunRecord>;
  get(id: string): Promise<RouteNoteRunRecord | null>;
  latestForRelease(releaseId: string): Promise<RouteNoteRunRecord | null>;
  claimNextQueued(): Promise<RouteNoteRunRecord | null>;
  updateProgress(id: string, completedSteps: RouteNoteExecutionStep[]): Promise<void>;
  complete(id: string, draft: RouteNoteDraftSummary): Promise<void>;
  fail(id: string, errorCode: string, blocked: boolean): Promise<void>;
  recoverInterrupted(): Promise<number>;
}

export interface PreparedVerifiedRouteNoteJob {
  job: RouteNoteBrowserJob;
  release: ReleaseRecord;
  actionPackage: ActionPackageRecord;
  approvalId?: string;
}

export interface RouteNoteRunControlDependencies {
  repository: ReleaseRepository;
  releaseService: Pick<ReleaseCommandService, "resolveApproval">;
  now(): Date;
  prepareVerifiedJob(releaseId: string): Promise<PreparedVerifiedRouteNoteJob>;
  executeDraft(
    releaseId: string,
    onStep: (step: RouteNoteExecutionStep) => void | Promise<void>
  ): Promise<RouteNoteDraftSummary>;
}

export class RouteNoteRunError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteRunError";
    this.code = code;
  }
}

function errorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "ROUTENOTE_RUN_FAILED";
}

function newestMatchingApproval(
  approvals: ApprovalRequest[],
  actionPackage: ActionPackageRecord
): ApprovalRequest | null {
  return [...approvals]
    .filter(
      approval =>
        approval.actionType === actionPackage.actionType &&
        approval.payloadHash === actionPackage.payloadHash
    )
    .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())[0] ?? null;
}

async function approvalForPreparedJob(
  prepared: PreparedVerifiedRouteNoteJob,
  repository: ReleaseRepository
): Promise<ApprovalRequest> {
  if (prepared.approvalId) {
    const direct = await repository.findApproval(prepared.approvalId);
    if (direct) return direct;
  }

  const approval = newestMatchingApproval(
    await repository.listApprovals(prepared.release.id),
    prepared.actionPackage
  );
  if (!approval) throw new RouteNoteRunError("ROUTENOTE_APPROVAL_NOT_FOUND");
  return approval;
}

function assertPreparedPackage(prepared: PreparedVerifiedRouteNoteJob): void {
  if (
    prepared.actionPackage.releaseId !== prepared.release.id ||
    prepared.actionPackage.actionType !== "DISTRIBUTOR_SUBMISSION" ||
    prepared.actionPackage.provider !== "routenote-free" ||
    prepared.actionPackage.payloadHash !== prepared.job.payloadHash ||
    prepared.job.assets.audio.length === 0 ||
    !prepared.job.assets.audio.every(asset => Boolean(asset.sha256.trim())) ||
    !prepared.job.assets.artwork.sha256.trim()
  ) {
    throw new RouteNoteRunError("ROUTENOTE_ACTION_PACKAGE_STALE");
  }
}

export async function preflightRouteNoteRelease(
  releaseId: string,
  dependencies: RouteNoteRunControlDependencies
): Promise<RouteNotePreflightSummary> {
  const normalizedReleaseId = releaseId.trim();
  if (!normalizedReleaseId) {
    throw new RouteNoteRunError("ROUTENOTE_RELEASE_NOT_FOUND");
  }

  const release = await dependencies.repository.findRelease(normalizedReleaseId);
  if (!release) throw new RouteNoteRunError("ROUTENOTE_RELEASE_NOT_FOUND");
  const context = await dependencies.repository.findPreparationContext(normalizedReleaseId);
  if (!context) throw new RouteNoteRunError("ROUTENOTE_CONTEXT_NOT_FOUND");

  const readiness = projectRouteNoteReadiness(context);
  if (
    !readiness.ready ||
    (release.status !== "PREPARED" && release.status !== "AWAITING_AUTHORIZATION")
  ) {
    throw new RouteNoteRunError("ROUTENOTE_RELEASE_NOT_READY");
  }

  // prepareVerifiedJob is intentionally browser-free. It creates the canonical
  // action package/approval on PREPARED releases and resolves + hash-verifies
  // the exact approved master/artwork before any external browser operation.
  const prepared = await dependencies.prepareVerifiedJob(normalizedReleaseId);
  assertPreparedPackage(prepared);
  const approval = await approvalForPreparedJob(prepared, dependencies.repository);

  if (
    approval.releaseId !== prepared.release.id ||
    approval.actionType !== prepared.actionPackage.actionType ||
    approval.payloadHash !== prepared.actionPackage.payloadHash
  ) {
    throw new RouteNoteRunError("ROUTENOTE_APPROVAL_PAYLOAD_MISMATCH");
  }

  return {
    ready: true,
    releaseId: prepared.release.id,
    releaseTitle: prepared.release.title,
    projectId: prepared.release.projectId,
    artistId: prepared.release.artistId,
    actionPackageId: prepared.actionPackage.id,
    approvalId: approval.id,
    payloadHash: prepared.actionPackage.payloadHash,
    approvalStatus: approval.status,
    approvalExpiresAt: approval.expiresAt.toISOString(),
    audioSha256: prepared.job.assets.audio.map(asset => asset.sha256),
    artworkSha256: prepared.job.assets.artwork.sha256,
    submissionPerformed: false
  };
}

export async function authorizeRouteNoteRelease(
  releaseId: string,
  dependencies: RouteNoteRunControlDependencies
): Promise<RouteNotePreflightSummary> {
  const preflight = await preflightRouteNoteRelease(releaseId, dependencies);
  if (preflight.approvalStatus === "APPROVED") return preflight;
  if (preflight.approvalStatus !== "PENDING") {
    throw new RouteNoteRunError("ROUTENOTE_PACKAGE_NOT_AUTHORIZABLE");
  }

  const actionPackage = await dependencies.repository.findActionPackage(
    preflight.actionPackageId
  );
  if (
    !actionPackage ||
    actionPackage.releaseId !== preflight.releaseId ||
    actionPackage.payloadHash !== preflight.payloadHash
  ) {
    throw new RouteNoteRunError("ROUTENOTE_ACTION_PACKAGE_STALE");
  }

  await dependencies.releaseService.resolveApproval({
    approvalId: preflight.approvalId,
    decision: "APPROVE",
    payload: actionPackage.payload,
    actor: "songforge-routenote-owner"
  });

  const approval = await dependencies.repository.findApproval(preflight.approvalId);
  if (!approval || approval.status !== "APPROVED") {
    throw new RouteNoteRunError("ROUTENOTE_PACKAGE_NOT_AUTHORIZED");
  }

  return { ...preflight, approvalStatus: "APPROVED" };
}

function runIdempotencyKey(preflight: RouteNotePreflightSummary): string {
  return [
    "routenote-draft",
    preflight.releaseId,
    preflight.actionPackageId,
    preflight.payloadHash
  ].join(":");
}

function ensureUnexpiredApproval(
  preflight: RouteNotePreflightSummary,
  now: Date
): void {
  if (preflight.approvalStatus !== "APPROVED") {
    throw new RouteNoteRunError("ROUTENOTE_PACKAGE_NOT_AUTHORIZED");
  }
  if (Date.parse(preflight.approvalExpiresAt) < now.getTime()) {
    throw new RouteNoteRunError("APPROVAL_EXPIRED");
  }
}

export async function enqueueRouteNoteRun(
  releaseId: string,
  dependencies: RouteNoteRunControlDependencies,
  store: RouteNoteRunStore
): Promise<RouteNoteRunRecord> {
  const preflight = await preflightRouteNoteRelease(releaseId, dependencies);
  ensureUnexpiredApproval(preflight, dependencies.now());

  return store.createOrGet({
    idempotencyKey: runIdempotencyKey(preflight),
    releaseId: preflight.releaseId,
    releaseTitle: preflight.releaseTitle,
    projectId: preflight.projectId,
    artistId: preflight.artistId,
    actionPackageId: preflight.actionPackageId,
    approvalId: preflight.approvalId,
    payloadHash: preflight.payloadHash
  });
}

async function validateStoredBinding(
  run: RouteNoteRunRecord,
  dependencies: RouteNoteRunControlDependencies
): Promise<void> {
  const [release, actionPackage, approval] = await Promise.all([
    dependencies.repository.findRelease(run.releaseId),
    dependencies.repository.findActionPackage(run.actionPackageId),
    dependencies.repository.findApproval(run.approvalId)
  ]);

  if (!release || release.status !== "AWAITING_AUTHORIZATION") {
    throw new RouteNoteRunError("ROUTENOTE_RELEASE_NOT_READY");
  }
  if (
    !actionPackage ||
    actionPackage.releaseId !== run.releaseId ||
    actionPackage.provider !== "routenote-free" ||
    actionPackage.actionType !== "DISTRIBUTOR_SUBMISSION" ||
    actionPackage.payloadHash !== run.payloadHash
  ) {
    throw new RouteNoteRunError("ROUTENOTE_ACTION_PACKAGE_STALE");
  }
  if (
    !approval ||
    approval.releaseId !== run.releaseId ||
    approval.actionType !== actionPackage.actionType ||
    approval.payloadHash !== run.payloadHash ||
    approval.status !== "APPROVED"
  ) {
    throw new RouteNoteRunError("ROUTENOTE_PACKAGE_NOT_AUTHORIZED");
  }
  if (approval.expiresAt.getTime() < dependencies.now().getTime()) {
    throw new RouteNoteRunError("APPROVAL_EXPIRED");
  }
}

export async function processNextRouteNoteRun(
  dependencies: RouteNoteRunControlDependencies,
  store: RouteNoteRunStore
): Promise<boolean> {
  const run = await store.claimNextQueued();
  if (!run) return false;

  try {
    await validateStoredBinding(run, dependencies);
    const completedSteps = [...run.completedSteps];
    const draft = await dependencies.executeDraft(run.releaseId, async step => {
      if (!completedSteps.includes(step)) completedSteps.push(step);
      await store.updateProgress(run.id, completedSteps);
    });

    if (
      draft.outcome !== "DRAFT_READY" ||
      draft.releaseId !== run.releaseId ||
      draft.payloadHash !== run.payloadHash
    ) {
      throw new RouteNoteRunError("ROUTENOTE_DRAFT_RECEIPT_MISMATCH");
    }

    await store.complete(run.id, draft);
    return true;
  } catch (error) {
    // Once a provider browser run has been claimed, never blind-retry. A partial
    // RouteNote draft may exist even when the local process failed to observe it.
    // The durable run becomes an operator-review item instead.
    await store.fail(run.id, errorCode(error), true);
    return true;
  }
}
