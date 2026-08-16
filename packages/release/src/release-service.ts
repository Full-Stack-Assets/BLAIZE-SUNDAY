import { randomUUID } from "node:crypto";

import { hashPayload } from "../../shared/src/domain.ts";
import {
  createApprovalRequest,
  resolveApproval,
  type ApprovalDecision
} from "./approval.ts";
import { buildDistributionPayload } from "./payloads.ts";
import type {
  ActionPackageRecord,
  ExternalActionReceiptRecord,
  ReleaseEventRecord,
  ReleaseRepository,
  RevisionRequestRecord
} from "./repository.ts";
import { transitionRelease } from "./state-machine.ts";

export class ReleaseServiceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ReleaseServiceError";
    this.code = code;
  }
}

export interface ReleaseServiceRuntime {
  now(): Date;
  id(prefix: string): string;
}

const defaultRuntime: ReleaseServiceRuntime = {
  now: () => new Date(),
  id: prefix => `${prefix}-${randomUUID()}`
};

export class ReleaseCommandService {
  private readonly repository: ReleaseRepository;
  private readonly runtime: ReleaseServiceRuntime;

  constructor(
    repository: ReleaseRepository,
    runtime: ReleaseServiceRuntime = defaultRuntime
  ) {
    this.repository = repository;
    this.runtime = runtime;
  }

  async prepareDistribution(input: {
    releaseId: string;
    provider: string;
    actor: string;
    approvalTtlMs?: number;
  }) {
    const release = await this.requireRelease(input.releaseId);
    const context = await this.repository.findPreparationContext(input.releaseId);
    if (!context) throw new ReleaseServiceError("RELEASE_CONTEXT_NOT_FOUND");

    const preparation = buildDistributionPayload(context, input.provider);
    const nextStatus = transitionRelease(
      release.status,
      preparation.nextStatus,
      {}
    );
    const createdAt = this.runtime.now();

    const actionPackage: ActionPackageRecord = {
      id: this.runtime.id("package"),
      releaseId: release.id,
      actionType: "DISTRIBUTOR_SUBMISSION",
      provider: input.provider,
      payload: preparation.payload,
      payloadHash: preparation.payloadHash,
      createdAt
    };

    const approval = createApprovalRequest({
      id: this.runtime.id("approval"),
      projectId: release.projectId,
      releaseId: release.id,
      actionType: actionPackage.actionType,
      payload: actionPackage.payload,
      requestedBy: input.actor,
      requestedAt: createdAt,
      expiresAt: new Date(
        createdAt.getTime() + (input.approvalTtlMs ?? 24 * 60 * 60 * 1000)
      )
    });

    const updatedRelease = {
      ...release,
      status: nextStatus,
      provider: input.provider,
      updatedAt: createdAt
    };
    const event: ReleaseEventRecord = {
      id: this.runtime.id("event"),
      releaseId: release.id,
      type: "DISTRIBUTION_PREPARED",
      fromStatus: release.status,
      toStatus: nextStatus,
      actor: input.actor,
      evidence: {
        actionPackageId: actionPackage.id,
        approvalId: approval.id,
        payloadHash: actionPackage.payloadHash,
        submissionPerformed: false
      },
      createdAt
    };

    await this.repository.saveActionPackage(actionPackage);
    await this.repository.saveApproval(approval);
    await this.repository.saveRelease(updatedRelease);
    await this.repository.savePreparationContext({
      ...context,
      status: "AWAITING_AUTHORIZATION"
    });
    await this.repository.appendReleaseEvent(event);

    return {
      release: updatedRelease,
      preparation,
      actionPackage,
      approval,
      event
    };
  }

  async resolveApproval(input: {
    approvalId: string;
    decision: ApprovalDecision;
    payload: unknown;
    actor: string;
    note?: string;
  }) {
    const approval = await this.repository.findApproval(input.approvalId);
    if (!approval) throw new ReleaseServiceError("APPROVAL_NOT_FOUND");

    const outcome = resolveApproval(approval, {
      decision: input.decision,
      payload: input.payload,
      actor: input.actor,
      note: input.note,
      now: this.runtime.now()
    });
    await this.repository.saveApproval(outcome.approval);

    let revision: RevisionRequestRecord | null = null;
    if (outcome.revisionInstruction) {
      revision = {
        id: this.runtime.id("revision"),
        ...outcome.revisionInstruction,
        status: "QUEUED"
      };
      await this.repository.appendRevisionRequest(revision);
      await this.rollbackForRevision(approval.releaseId, input.actor, approval.id);
    }

    await this.repository.appendReleaseEvent({
      id: this.runtime.id("event"),
      releaseId: approval.releaseId,
      type: "APPROVAL_RESOLVED",
      fromStatus: null,
      toStatus: null,
      actor: input.actor,
      evidence: {
        approvalId: approval.id,
        status: outcome.approval.status,
        payloadHash: approval.payloadHash,
        revisionRequestId: revision?.id ?? null
      },
      createdAt: this.runtime.now()
    });

    return { ...outcome, revision };
  }

  async recordExternalSubmission(input: {
    releaseId: string;
    actionPackageId: string;
    approvalId: string;
    provider: string;
    externalConfirmationId: string;
    rawReceipt: unknown;
    actor: string;
  }) {
    if (!input.externalConfirmationId.trim()) {
      throw new ReleaseServiceError("EXTERNAL_CONFIRMATION_REQUIRED");
    }

    const [release, actionPackage, approval] = await Promise.all([
      this.requireRelease(input.releaseId),
      this.repository.findActionPackage(input.actionPackageId),
      this.repository.findApproval(input.approvalId)
    ]);

    if (!actionPackage || actionPackage.releaseId !== release.id) {
      throw new ReleaseServiceError("ACTION_PACKAGE_NOT_FOUND");
    }
    if (!approval || approval.releaseId !== release.id) {
      throw new ReleaseServiceError("APPROVAL_NOT_FOUND");
    }
    if (actionPackage.provider !== input.provider) {
      throw new ReleaseServiceError("PROVIDER_MISMATCH");
    }

    const recordedAt = this.runtime.now();
    const nextStatus = transitionRelease(release.status, "SUBMITTED", {
      actionPayloadHash: actionPackage.payloadHash,
      approval: {
        status: approval.status,
        payloadHash: approval.payloadHash,
        expiresAt: approval.expiresAt
      },
      now: recordedAt
    });
    const receipt: ExternalActionReceiptRecord = {
      id: this.runtime.id("receipt"),
      releaseId: release.id,
      actionType: "DISTRIBUTOR_SUBMISSION",
      provider: input.provider,
      payloadHash: actionPackage.payloadHash,
      externalConfirmationId: input.externalConfirmationId,
      verifiedPlatformUrl: null,
      rawReceipt: input.rawReceipt,
      verifiedAt: recordedAt,
      createdAt: recordedAt
    };
    const updatedRelease = {
      ...release,
      status: nextStatus,
      externalConfirmationId: input.externalConfirmationId,
      updatedAt: recordedAt
    };

    await this.repository.appendExternalReceipt(receipt);
    await this.repository.saveRelease(updatedRelease);
    await this.repository.appendReleaseEvent({
      id: this.runtime.id("event"),
      releaseId: release.id,
      type: "EXTERNAL_SUBMISSION_VERIFIED",
      fromStatus: release.status,
      toStatus: nextStatus,
      actor: input.actor,
      evidence: {
        receiptId: receipt.id,
        payloadHash: receipt.payloadHash,
        externalConfirmationId: receipt.externalConfirmationId
      },
      createdAt: recordedAt
    });

    return { release: updatedRelease, receipt };
  }

  async recordAccepted(input: {
    releaseId: string;
    provider: string;
    externalConfirmationId: string;
    rawReceipt: unknown;
    actor: string;
  }) {
    return this.recordEvidenceTransition({
      ...input,
      actionType: "DISTRIBUTOR_ACCEPTED",
      targetStatus: "ACCEPTED"
    });
  }

  async recordScheduled(input: {
    releaseId: string;
    provider: string;
    externalConfirmationId: string;
    scheduledReleaseDate: string;
    rawReceipt: unknown;
    actor: string;
  }) {
    if (Number.isNaN(Date.parse(input.scheduledReleaseDate))) {
      throw new ReleaseServiceError("VALID_SCHEDULE_DATE_REQUIRED");
    }
    const result = await this.recordEvidenceTransition({
      ...input,
      actionType: "DISTRIBUTOR_SCHEDULED",
      targetStatus: "SCHEDULED"
    });
    const release = {
      ...result.release,
      scheduledReleaseDate: new Date(input.scheduledReleaseDate)
    };
    await this.repository.saveRelease(release);
    return { ...result, release };
  }

  async recordLive(input: {
    releaseId: string;
    provider: string;
    verifiedPlatformUrl: string;
    externalConfirmationId: string;
    rawReceipt: unknown;
    actor: string;
  }) {
    if (!input.externalConfirmationId.trim()) {
      throw new ReleaseServiceError("EXTERNAL_CONFIRMATION_REQUIRED");
    }
    let url: URL;
    try {
      url = new URL(input.verifiedPlatformUrl);
    } catch {
      throw new ReleaseServiceError("VERIFIED_PLATFORM_URL_REQUIRED");
    }
    if (url.protocol !== "https:") {
      throw new ReleaseServiceError("VERIFIED_PLATFORM_URL_REQUIRED");
    }

    const release = await this.requireRelease(input.releaseId);
    const recordedAt = this.runtime.now();
    const nextStatus = transitionRelease(release.status, "LIVE", {
      verifiedPlatformUrl: input.verifiedPlatformUrl,
      externalConfirmationId: input.externalConfirmationId
    });
    const receipt: ExternalActionReceiptRecord = {
      id: this.runtime.id("receipt"),
      releaseId: release.id,
      actionType: "PLATFORM_LIVE_VERIFIED",
      provider: input.provider,
      payloadHash: hashPayload(input.rawReceipt),
      externalConfirmationId: input.externalConfirmationId,
      verifiedPlatformUrl: input.verifiedPlatformUrl,
      rawReceipt: input.rawReceipt,
      verifiedAt: recordedAt,
      createdAt: recordedAt
    };
    const updatedRelease = {
      ...release,
      status: nextStatus,
      provider: input.provider,
      verifiedPlatformUrl: input.verifiedPlatformUrl,
      externalConfirmationId: input.externalConfirmationId,
      liveDate: recordedAt,
      updatedAt: recordedAt
    };

    await this.repository.appendExternalReceipt(receipt);
    await this.repository.saveRelease(updatedRelease);
    await this.repository.appendReleaseEvent({
      id: this.runtime.id("event"),
      releaseId: release.id,
      type: "PLATFORM_LIVE_VERIFIED",
      fromStatus: release.status,
      toStatus: nextStatus,
      actor: input.actor,
      evidence: {
        receiptId: receipt.id,
        verifiedPlatformUrl: input.verifiedPlatformUrl,
        externalConfirmationId: input.externalConfirmationId
      },
      createdAt: recordedAt
    });
    return { release: updatedRelease, receipt };
  }

  private async recordEvidenceTransition(input: {
    releaseId: string;
    provider: string;
    externalConfirmationId: string;
    rawReceipt: unknown;
    actor: string;
    actionType: string;
    targetStatus: "ACCEPTED" | "SCHEDULED";
  }) {
    if (!input.externalConfirmationId.trim()) {
      throw new ReleaseServiceError("EXTERNAL_CONFIRMATION_REQUIRED");
    }
    const release = await this.requireRelease(input.releaseId);
    const recordedAt = this.runtime.now();
    const nextStatus = transitionRelease(release.status, input.targetStatus, {});
    const receipt: ExternalActionReceiptRecord = {
      id: this.runtime.id("receipt"),
      releaseId: release.id,
      actionType: input.actionType,
      provider: input.provider,
      payloadHash: hashPayload(input.rawReceipt),
      externalConfirmationId: input.externalConfirmationId,
      verifiedPlatformUrl: null,
      rawReceipt: input.rawReceipt,
      verifiedAt: recordedAt,
      createdAt: recordedAt
    };
    const updatedRelease = {
      ...release,
      status: nextStatus,
      provider: input.provider,
      externalConfirmationId: input.externalConfirmationId,
      updatedAt: recordedAt
    };

    await this.repository.appendExternalReceipt(receipt);
    await this.repository.saveRelease(updatedRelease);
    await this.repository.appendReleaseEvent({
      id: this.runtime.id("event"),
      releaseId: release.id,
      type: input.actionType,
      fromStatus: release.status,
      toStatus: nextStatus,
      actor: input.actor,
      evidence: {
        receiptId: receipt.id,
        externalConfirmationId: input.externalConfirmationId
      },
      createdAt: recordedAt
    });
    return { release: updatedRelease, receipt };
  }

  private async rollbackForRevision(
    releaseId: string,
    actor: string,
    approvalId: string
  ) {
    const release = await this.requireRelease(releaseId);
    if (release.status !== "AWAITING_AUTHORIZATION") return;

    const updatedAt = this.runtime.now();
    const nextStatus = transitionRelease(release.status, "PREPARED", {
      revisionRequested: true
    });
    const updatedRelease = { ...release, status: nextStatus, updatedAt };
    await this.repository.saveRelease(updatedRelease);

    const context = await this.repository.findPreparationContext(releaseId);
    if (context) {
      await this.repository.savePreparationContext({
        ...context,
        status: "PREPARED"
      });
    }
    await this.repository.appendReleaseEvent({
      id: this.runtime.id("event"),
      releaseId,
      type: "REVISION_QUEUED",
      fromStatus: release.status,
      toStatus: nextStatus,
      actor,
      evidence: { approvalId },
      createdAt: updatedAt
    });
  }

  private async requireRelease(releaseId: string) {
    const release = await this.repository.findRelease(releaseId);
    if (!release) throw new ReleaseServiceError("RELEASE_NOT_FOUND");
    return release;
  }
}
