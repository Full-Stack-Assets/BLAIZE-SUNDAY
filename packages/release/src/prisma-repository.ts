import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@songforge/database";

import type { ApprovalRequest } from "./approval.ts";
import type { ReleasePreparationContext } from "./payloads.ts";
import type {
  ActionPackageRecord,
  ExternalActionReceiptRecord,
  ReleaseEventRecord,
  ReleaseRecord,
  ReleaseRepository,
  RevisionRequestRecord
} from "./repository.ts";
import type { DistributionStatus } from "./state-machine.ts";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export class PrismaReleaseRepository implements ReleaseRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.client = client;
  }

  async saveRelease(release: ReleaseRecord): Promise<void> {
    await this.client.release.upsert({
      where: { id: release.id },
      update: {
        title: release.title,
        status: release.status,
        distributor: release.provider,
        verifiedPlatformUrl: release.verifiedPlatformUrl,
        externalConfirmationId: release.externalConfirmationId,
        scheduledReleaseDate: release.scheduledReleaseDate,
        liveDate: release.liveDate
      },
      create: {
        id: release.id,
        projectId: release.projectId,
        artistId: release.artistId,
        title: release.title,
        status: release.status,
        distributor: release.provider,
        verifiedPlatformUrl: release.verifiedPlatformUrl,
        externalConfirmationId: release.externalConfirmationId,
        scheduledReleaseDate: release.scheduledReleaseDate,
        liveDate: release.liveDate,
        createdAt: release.createdAt
      }
    });
  }

  async findRelease(id: string): Promise<ReleaseRecord | null> {
    const release = await this.client.release.findUnique({ where: { id } });
    return release ? this.mapRelease(release) : null;
  }

  async listReleases(): Promise<ReleaseRecord[]> {
    const releases = await this.client.release.findMany({
      orderBy: { createdAt: "desc" }
    });
    return releases.map(release => this.mapRelease(release));
  }

  async savePreparationContext(context: ReleasePreparationContext): Promise<void> {
    await this.client.release.update({
      where: { id: context.releaseId },
      data: { status: context.status }
    });
  }

  async findPreparationContext(
    releaseId: string
  ): Promise<ReleasePreparationContext | null> {
    const release = await this.client.release.findUnique({
      where: { id: releaseId },
      include: {
        artist: true,
        project: {
          include: {
            metadata: true,
            rights: true,
            audioAssets: {
              where: { type: "MASTER" },
              orderBy: { createdAt: "desc" },
              take: 1
            },
            visualAssets: {
              where: { type: "COVER_ART" },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!release) return null;

    const master = release.project.audioAssets[0];
    const cover = release.project.visualAssets[0];
    const metadata = release.project.metadata;
    const rights = release.project.rights;
    const warnings = rights?.rightsWarnings;

    return {
      releaseId: release.id,
      projectId: release.projectId,
      status: release.status as ReleasePreparationContext["status"],
      artistName: release.artist.name,
      title: release.title,
      master: master
        ? {
            id: master.id,
            fileUrl: master.fileUrl,
            sha256: master.sha256,
            approved: master.approved,
            durationSeconds: master.durationSeconds ?? 0,
            contentType: master.contentType
          }
        : null,
      coverArt: cover
        ? {
            id: cover.id,
            fileUrl: cover.fileUrl,
            sha256: cover.sha256,
            approved: cover.approved,
            width: cover.width ?? 0,
            height: cover.height ?? 0,
            contentType: cover.contentType
          }
        : null,
      metadata: metadata
        ? {
            title: metadata.title,
            artistName: metadata.artistName,
            genre: metadata.genre,
            subgenre: metadata.subgenre ?? "",
            language: metadata.language,
            explicit: metadata.explicit,
            description: metadata.description ?? "",
            tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]) : [],
            credits: metadata.credits as Record<string, unknown>
          }
        : null,
      rights: {
        approved: rights?.approved ?? false,
        ownershipConfirmed: rights?.ownershipConfirmed ?? false,
        provenanceComplete: rights?.provenanceComplete ?? false,
        warnings: Array.isArray(warnings) ? (warnings as string[]) : []
      }
    };
  }

  async saveActionPackage(actionPackage: ActionPackageRecord): Promise<void> {
    await this.client.releaseActionPackage.upsert({
      where: { id: actionPackage.id },
      update: {
        provider: actionPackage.provider,
        payload: json(actionPackage.payload),
        payloadHash: actionPackage.payloadHash
      },
      create: {
        ...actionPackage,
        payload: json(actionPackage.payload)
      }
    });
  }

  async findActionPackage(id: string): Promise<ActionPackageRecord | null> {
    const record = await this.client.releaseActionPackage.findUnique({
      where: { id }
    });
    return record ? { ...record, payload: record.payload } : null;
  }

  async listActionPackages(releaseId: string): Promise<ActionPackageRecord[]> {
    return this.client.releaseActionPackage.findMany({
      where: { releaseId },
      orderBy: { createdAt: "asc" }
    });
  }

  async saveApproval(approval: ApprovalRequest): Promise<void> {
    await this.client.approval.upsert({
      where: { id: approval.id },
      update: {
        payload: json(approval.payload),
        payloadHash: approval.payloadHash,
        status: approval.status,
        expiresAt: approval.expiresAt,
        resolvedBy: approval.resolvedBy,
        resolvedAt: approval.resolvedAt,
        resolutionNote: approval.resolutionNote
      },
      create: {
        id: approval.id,
        projectId: approval.projectId,
        releaseId: approval.releaseId,
        actionType: approval.actionType,
        payload: json(approval.payload),
        payloadHash: approval.payloadHash,
        status: approval.status,
        requestedBy: approval.requestedBy,
        requestedAt: approval.requestedAt,
        expiresAt: approval.expiresAt,
        resolvedBy: approval.resolvedBy,
        resolvedAt: approval.resolvedAt,
        resolutionNote: approval.resolutionNote
      }
    });
  }

  async findApproval(id: string): Promise<ApprovalRequest | null> {
    const record = await this.client.approval.findUnique({ where: { id } });
    return record ? this.mapApproval(record) : null;
  }

  async listApprovals(releaseId: string): Promise<ApprovalRequest[]> {
    const records = await this.client.approval.findMany({
      where: { releaseId },
      orderBy: { requestedAt: "asc" }
    });
    return records.map(record => this.mapApproval(record));
  }

  async appendReleaseEvent(event: ReleaseEventRecord): Promise<void> {
    await this.client.releaseEvent.create({
      data: { ...event, evidence: json(event.evidence) }
    });
  }

  async listReleaseEvents(releaseId: string): Promise<ReleaseEventRecord[]> {
    const events = await this.client.releaseEvent.findMany({
      where: { releaseId },
      orderBy: { createdAt: "asc" }
    });
    return events.map(event => ({
      ...event,
      fromStatus: event.fromStatus as DistributionStatus | null,
      toStatus: event.toStatus as DistributionStatus | null,
      evidence: event.evidence
    }));
  }

  async appendRevisionRequest(revision: RevisionRequestRecord): Promise<void> {
    await this.client.revisionRequest.create({ data: revision });
  }

  async listRevisionRequests(releaseId: string): Promise<RevisionRequestRecord[]> {
    const revisions = await this.client.revisionRequest.findMany({
      where: { releaseId },
      orderBy: { createdAt: "asc" }
    });
    return revisions.map(revision => ({
      id: revision.id,
      approvalId: revision.approvalId,
      projectId: revision.projectId,
      releaseId: revision.releaseId,
      target: "artist_operations_orchestrator",
      instruction: revision.instruction,
      requestedBy: revision.requestedBy,
      status: revision.status,
      createdAt: revision.createdAt
    }));
  }

  async appendExternalReceipt(
    receipt: ExternalActionReceiptRecord
  ): Promise<void> {
    await this.client.externalActionReceipt.create({
      data: { ...receipt, rawReceipt: json(receipt.rawReceipt) }
    });
  }

  async listExternalReceipts(
    releaseId: string
  ): Promise<ExternalActionReceiptRecord[]> {
    const receipts = await this.client.externalActionReceipt.findMany({
      where: { releaseId },
      orderBy: { createdAt: "asc" }
    });
    return receipts.map(receipt => ({ ...receipt, rawReceipt: receipt.rawReceipt }));
  }

  private mapRelease(record: {
    id: string;
    projectId: string;
    artistId: string;
    title: string;
    status: string;
    distributor: string | null;
    verifiedPlatformUrl: string | null;
    externalConfirmationId: string | null;
    scheduledReleaseDate: Date | null;
    liveDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReleaseRecord {
    return {
      id: record.id,
      projectId: record.projectId,
      artistId: record.artistId,
      title: record.title,
      status: record.status as DistributionStatus,
      provider: record.distributor,
      verifiedPlatformUrl: record.verifiedPlatformUrl,
      externalConfirmationId: record.externalConfirmationId,
      scheduledReleaseDate: record.scheduledReleaseDate,
      liveDate: record.liveDate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private mapApproval(record: {
    id: string;
    projectId: string;
    releaseId: string | null;
    actionType: string;
    payload: unknown;
    payloadHash: string;
    status: string;
    requestedBy: string;
    requestedAt: Date;
    expiresAt: Date;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    resolutionNote: string | null;
  }): ApprovalRequest {
    if (!record.releaseId) {
      throw new Error(`Release approval ${record.id} has no releaseId.`);
    }
    return {
      ...record,
      releaseId: record.releaseId,
      status: record.status as ApprovalRequest["status"]
    };
  }
}
