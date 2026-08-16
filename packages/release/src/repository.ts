import type { ApprovalRequest } from "./approval.ts";
import type { ReleasePreparationContext } from "./payloads.ts";
import type { DistributionStatus } from "./state-machine.ts";

export interface ReleaseRecord {
  id: string;
  projectId: string;
  artistId: string;
  title: string;
  status: DistributionStatus;
  provider: string | null;
  verifiedPlatformUrl: string | null;
  externalConfirmationId: string | null;
  scheduledReleaseDate?: Date | null;
  liveDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionPackageRecord {
  id: string;
  releaseId: string;
  actionType: string;
  provider: string | null;
  payload: unknown;
  payloadHash: string;
  createdAt: Date;
}

export interface ReleaseEventRecord {
  id: string;
  releaseId: string;
  type: string;
  fromStatus: DistributionStatus | null;
  toStatus: DistributionStatus | null;
  actor: string;
  evidence: unknown;
  createdAt: Date;
}

export interface RevisionRequestRecord {
  id: string;
  approvalId: string;
  projectId: string;
  releaseId: string;
  target: "artist_operations_orchestrator";
  instruction: string;
  requestedBy: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  createdAt: Date;
}

export interface ExternalActionReceiptRecord {
  id: string;
  releaseId: string;
  actionType: string;
  provider: string;
  payloadHash: string;
  externalConfirmationId: string;
  verifiedPlatformUrl: string | null;
  rawReceipt: unknown;
  verifiedAt: Date;
  createdAt: Date;
}

export interface ReleaseRepository {
  saveRelease(release: ReleaseRecord): Promise<void>;
  findRelease(id: string): Promise<ReleaseRecord | null>;
  listReleases(): Promise<ReleaseRecord[]>;
  savePreparationContext(context: ReleasePreparationContext): Promise<void>;
  findPreparationContext(releaseId: string): Promise<ReleasePreparationContext | null>;
  saveActionPackage(actionPackage: ActionPackageRecord): Promise<void>;
  findActionPackage(id: string): Promise<ActionPackageRecord | null>;
  listActionPackages(releaseId: string): Promise<ActionPackageRecord[]>;
  saveApproval(approval: ApprovalRequest): Promise<void>;
  findApproval(id: string): Promise<ApprovalRequest | null>;
  listApprovals(releaseId: string): Promise<ApprovalRequest[]>;
  appendReleaseEvent(event: ReleaseEventRecord): Promise<void>;
  listReleaseEvents(releaseId: string): Promise<ReleaseEventRecord[]>;
  appendRevisionRequest(revision: RevisionRequestRecord): Promise<void>;
  listRevisionRequests(releaseId: string): Promise<RevisionRequestRecord[]>;
  appendExternalReceipt(receipt: ExternalActionReceiptRecord): Promise<void>;
  listExternalReceipts(releaseId: string): Promise<ExternalActionReceiptRecord[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryReleaseRepository implements ReleaseRepository {
  private readonly releases = new Map<string, ReleaseRecord>();
  private readonly contexts = new Map<string, ReleasePreparationContext>();
  private readonly actionPackages = new Map<string, ActionPackageRecord>();
  private readonly approvals = new Map<string, ApprovalRequest>();
  private readonly releaseEvents = new Map<string, ReleaseEventRecord>();
  private readonly revisions = new Map<string, RevisionRequestRecord>();
  private readonly receipts = new Map<string, ExternalActionReceiptRecord>();

  async saveRelease(release: ReleaseRecord): Promise<void> {
    this.releases.set(release.id, clone(release));
  }

  async findRelease(id: string): Promise<ReleaseRecord | null> {
    const release = this.releases.get(id);
    return release ? clone(release) : null;
  }

  async listReleases(): Promise<ReleaseRecord[]> {
    return [...this.releases.values()]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(clone);
  }

  async savePreparationContext(context: ReleasePreparationContext): Promise<void> {
    this.contexts.set(context.releaseId, clone(context));
  }

  async findPreparationContext(
    releaseId: string
  ): Promise<ReleasePreparationContext | null> {
    const context = this.contexts.get(releaseId);
    return context ? clone(context) : null;
  }

  async saveActionPackage(actionPackage: ActionPackageRecord): Promise<void> {
    this.actionPackages.set(actionPackage.id, clone(actionPackage));
  }

  async findActionPackage(id: string): Promise<ActionPackageRecord | null> {
    const actionPackage = this.actionPackages.get(id);
    return actionPackage ? clone(actionPackage) : null;
  }

  async listActionPackages(releaseId: string): Promise<ActionPackageRecord[]> {
    return [...this.actionPackages.values()]
      .filter(item => item.releaseId === releaseId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(clone);
  }

  async saveApproval(approval: ApprovalRequest): Promise<void> {
    this.approvals.set(approval.id, clone(approval));
  }

  async findApproval(id: string): Promise<ApprovalRequest | null> {
    const approval = this.approvals.get(id);
    return approval ? clone(approval) : null;
  }

  async listApprovals(releaseId: string): Promise<ApprovalRequest[]> {
    return [...this.approvals.values()]
      .filter(item => item.releaseId === releaseId)
      .sort((left, right) => left.requestedAt.getTime() - right.requestedAt.getTime())
      .map(clone);
  }

  async appendReleaseEvent(event: ReleaseEventRecord): Promise<void> {
    if (this.releaseEvents.has(event.id)) {
      throw new Error("RELEASE_EVENT_ALREADY_EXISTS");
    }
    this.releaseEvents.set(event.id, clone(event));
  }

  async listReleaseEvents(releaseId: string): Promise<ReleaseEventRecord[]> {
    return [...this.releaseEvents.values()]
      .filter(item => item.releaseId === releaseId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(clone);
  }

  async appendRevisionRequest(revision: RevisionRequestRecord): Promise<void> {
    if (this.revisions.has(revision.id)) {
      throw new Error("REVISION_REQUEST_ALREADY_EXISTS");
    }
    this.revisions.set(revision.id, clone(revision));
  }

  async listRevisionRequests(releaseId: string): Promise<RevisionRequestRecord[]> {
    return [...this.revisions.values()]
      .filter(item => item.releaseId === releaseId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(clone);
  }

  async appendExternalReceipt(receipt: ExternalActionReceiptRecord): Promise<void> {
    if (this.receipts.has(receipt.id)) {
      throw new Error("EXTERNAL_RECEIPT_ALREADY_EXISTS");
    }
    this.receipts.set(receipt.id, clone(receipt));
  }

  async listExternalReceipts(
    releaseId: string
  ): Promise<ExternalActionReceiptRecord[]> {
    return [...this.receipts.values()]
      .filter(item => item.releaseId === releaseId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(clone);
  }
}
