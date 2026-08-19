import { Prisma } from "@prisma/client";
import { prisma } from "@songforge/database";
import type { VideoRunStatus } from "./domain.ts";
import type {
  CaptionRecord,
  ExecutionPatch,
  VideoRunRecord,
  VideoRunRepository
} from "./repository.ts";

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function nullableJson(
  value: unknown | null | undefined
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return json(value);
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapRun(row: any): VideoRunRecord {
  return {
    id: row.id,
    lineageKey: row.lineageKey,
    version: row.version,
    parentRunId: row.parentRunId,
    title: row.title,
    topic: row.topic,
    provider: row.provider,
    connectorMode: row.connectorMode,
    mutation: row.mutation,
    brief: row.brief,
    briefHash: row.briefHash,
    compiledConcept: row.compiledConcept,
    compiledExplanation: row.compiledExplanation,
    promptHash: row.promptHash,
    targetDurationSeconds: row.targetDurationSeconds,
    durationTolerancePercent: row.durationTolerancePercent,
    status: row.status,
    externalTaskId: row.externalTaskId,
    externalStatus: row.externalStatus,
    videoUrl: row.videoUrl,
    providerMetrics: row.providerMetrics ?? null,
    providerError: row.providerError ?? null,
    durationSeconds: row.durationSeconds,
    width: row.width,
    height: row.height,
    fps: row.fps,
    captionStatus: row.captionStatus,
    qc: row.qc ?? null,
    createdAt: toIso(row.createdAt) ?? undefined,
    completedAt: toIso(row.completedAt)
  };
}

function mapCaption(row: any): CaptionRecord {
  return {
    id: row.id,
    runId: row.runId,
    version: row.version,
    locale: row.locale,
    source: row.source,
    format: row.format,
    content: row.content,
    contentHash: row.contentHash,
    cueCount: row.cueCount,
    startSeconds: row.startSeconds,
    endSeconds: row.endSeconds,
    sourceMediaHash: row.sourceMediaHash,
    createdAt: toIso(row.createdAt) ?? undefined
  };
}

export class PrismaVideoRunRepository implements VideoRunRepository {
  async create(run: VideoRunRecord): Promise<VideoRunRecord> {
    const row = await prisma.videoGenerationRun.create({
      data: {
        id: run.id,
        lineageKey: run.lineageKey,
        version: run.version,
        parentRunId: run.parentRunId,
        title: run.title,
        topic: run.topic,
        provider: run.provider,
        connectorMode: run.connectorMode,
        mutation: run.mutation,
        brief: json(run.brief),
        briefHash: run.briefHash,
        compiledConcept: run.compiledConcept,
        compiledExplanation: run.compiledExplanation,
        promptHash: run.promptHash,
        targetDurationSeconds: run.targetDurationSeconds,
        durationTolerancePercent: run.durationTolerancePercent,
        status: run.status,
        externalTaskId: run.externalTaskId,
        externalStatus: run.externalStatus,
        videoUrl: run.videoUrl,
        providerMetrics: nullableJson(run.providerMetrics),
        providerError: nullableJson(run.providerError),
        durationSeconds: run.durationSeconds,
        width: run.width,
        height: run.height,
        fps: run.fps,
        captionStatus: run.captionStatus,
        qc: nullableJson(run.qc),
        completedAt: run.completedAt ? new Date(run.completedAt) : null
      }
    });
    return mapRun(row);
  }

  async get(id: string): Promise<VideoRunRecord | null> {
    const row = await prisma.videoGenerationRun.findUnique({ where: { id } });
    return row ? mapRun(row) : null;
  }

  async list(limit = 50): Promise<VideoRunRecord[]> {
    const rows = await prisma.videoGenerationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return rows.map(mapRun);
  }

  async listLineage(lineageKey: string): Promise<VideoRunRecord[]> {
    const rows = await prisma.videoGenerationRun.findMany({
      where: { lineageKey },
      orderBy: { version: "asc" }
    });
    return rows.map(mapRun);
  }

  async updateExecution(
    id: string,
    patch: ExecutionPatch
  ): Promise<VideoRunRecord> {
    const existing = await this.get(id);
    if (!existing) throw new Error("VIDEO_RUN_NOT_FOUND");

    const row = await prisma.videoGenerationRun.update({
      where: { id },
      data: {
        status: patch.status,
        externalTaskId: patch.externalTaskId,
        externalStatus: patch.externalStatus,
        videoUrl: patch.videoUrl,
        providerMetrics: nullableJson(patch.providerMetrics),
        providerError: nullableJson(patch.providerError),
        durationSeconds: patch.durationSeconds,
        width: patch.width,
        height: patch.height,
        fps: patch.fps,
        captionStatus: patch.captionStatus,
        completedAt:
          patch.completedAt === undefined
            ? undefined
            : patch.completedAt
              ? new Date(patch.completedAt)
              : null
      }
    });
    return mapRun(row);
  }

  async attachCaption(caption: CaptionRecord): Promise<CaptionRecord> {
    const row = await prisma.videoCaptionAsset.create({
      data: {
        id: caption.id,
        runId: caption.runId,
        version: caption.version,
        locale: caption.locale,
        source: caption.source,
        format: caption.format,
        content: caption.content,
        contentHash: caption.contentHash,
        cueCount: caption.cueCount,
        startSeconds: caption.startSeconds,
        endSeconds: caption.endSeconds,
        sourceMediaHash: caption.sourceMediaHash
      }
    });
    return mapCaption(row);
  }

  async listCaptions(runId: string): Promise<CaptionRecord[]> {
    const rows = await prisma.videoCaptionAsset.findMany({
      where: { runId },
      orderBy: [{ version: "asc" }, { format: "asc" }]
    });
    return rows.map(mapCaption);
  }

  async saveQc(
    id: string,
    status: VideoRunStatus,
    qc: unknown
  ): Promise<VideoRunRecord> {
    const existing = await this.get(id);
    if (!existing) throw new Error("VIDEO_RUN_NOT_FOUND");
    const row = await prisma.videoGenerationRun.update({
      where: { id },
      data: { status, qc: json(qc) }
    });
    return mapRun(row);
  }
}
