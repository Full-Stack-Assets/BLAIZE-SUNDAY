import { randomUUID } from "node:crypto";
import { hashPayload } from "@songforge/shared";
import {
  createVideoBrief,
  type VideoGenerationBrief,
  type VideoMutation
} from "./domain.ts";
import { compileWisebasePayload, mutateVideoBrief } from "./prompt.ts";
import type {
  VideoRunRecord,
  VideoRunRepository
} from "./repository.ts";

export interface ExternalVideoResult {
  status: string;
  videoUrl?: string | null;
  metrics?: unknown | null;
  error?: unknown | null;
}

type CreateRootInput = Parameters<typeof createVideoBrief>[0];

const emptyExecutionFields = {
  externalTaskId: null,
  externalStatus: null,
  videoUrl: null,
  providerMetrics: null,
  providerError: null,
  durationSeconds: null,
  width: null,
  height: null,
  fps: null,
  captionStatus: "MISSING",
  qc: null,
  completedAt: null
} as const;

function hasFinalError(error: unknown): boolean {
  if (!error || typeof error !== "object" || Array.isArray(error)) return false;
  const record = error as Record<string, unknown>;
  return Boolean(record.final_error ?? record.finalError);
}

function asBrief(value: unknown): VideoGenerationBrief {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_VIDEO_BRIEF");
  }
  return value as VideoGenerationBrief;
}

export class VideoRunService {
  private readonly repo: VideoRunRepository;

  constructor(repo: VideoRunRepository) {
    this.repo = repo;
  }

  async createRoot(input: CreateRootInput): Promise<VideoRunRecord> {
    const brief = createVideoBrief(input);
    const payload = compileWisebasePayload(brief);
    const id = randomUUID();
    const lineageKey = randomUUID();

    return this.repo.create({
      id,
      lineageKey,
      version: 1,
      parentRunId: null,
      title: brief.title,
      topic: brief.topic,
      provider: "WISEBASE",
      connectorMode: "CONNECTOR_MEDIATED",
      mutation: "ROOT",
      brief,
      briefHash: hashPayload(brief),
      compiledConcept: payload.concept,
      compiledExplanation: payload.explanation,
      promptHash: payload.promptHash,
      targetDurationSeconds: brief.targetDurationSeconds,
      durationTolerancePercent: brief.durationTolerancePercent,
      status: "AWAITING_EXTERNAL_EXECUTION",
      ...emptyExecutionFields
    });
  }

  async attachExternalTask(
    id: string,
    externalTaskId: string
  ): Promise<VideoRunRecord> {
    const normalized = externalTaskId.trim();
    if (!normalized) throw new Error("EXTERNAL_TASK_ID_REQUIRED");
    const run = await this.repo.get(id);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");

    return this.repo.updateExecution(id, {
      status: "PENDING",
      externalTaskId: normalized,
      externalStatus: "pending"
    });
  }

  async recordExternalResult(
    id: string,
    result: ExternalVideoResult
  ): Promise<VideoRunRecord> {
    const run = await this.repo.get(id);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");

    const externalStatus = result.status.trim().toLowerCase();
    const providerError = result.error ?? null;
    const videoUrl = result.videoUrl?.trim() || null;

    if (hasFinalError(providerError)) {
      return this.repo.updateExecution(id, {
        status: "FAILED",
        externalStatus,
        videoUrl,
        providerMetrics: result.metrics ?? null,
        providerError,
        completedAt: new Date().toISOString()
      });
    }

    if (externalStatus === "pending" || externalStatus === "processing") {
      return this.repo.updateExecution(id, {
        status: "PENDING",
        externalStatus,
        videoUrl,
        providerMetrics: result.metrics ?? null,
        providerError
      });
    }

    if (externalStatus === "completed" && videoUrl) {
      return this.repo.updateExecution(id, {
        status: "CAPTIONS_REQUIRED",
        externalStatus,
        videoUrl,
        providerMetrics: result.metrics ?? null,
        providerError,
        captionStatus: "MISSING",
        completedAt: new Date().toISOString()
      });
    }

    return this.repo.updateExecution(id, {
      status: "FAILED",
      externalStatus,
      videoUrl,
      providerMetrics: result.metrics ?? null,
      providerError,
      completedAt: new Date().toISOString()
    });
  }

  async createMutation(
    parentId: string,
    mutation: Exclude<VideoMutation, "ROOT">
  ): Promise<VideoRunRecord> {
    const parent = await this.repo.get(parentId);
    if (!parent) throw new Error("VIDEO_RUN_NOT_FOUND");

    const lineage = await this.repo.listLineage(parent.lineageKey);
    const version = Math.max(...lineage.map(run => run.version), parent.version) + 1;
    const brief = mutateVideoBrief(asBrief(parent.brief), mutation);
    const payload = compileWisebasePayload(brief);

    return this.repo.create({
      id: randomUUID(),
      lineageKey: parent.lineageKey,
      version,
      parentRunId: parent.id,
      title: brief.title,
      topic: brief.topic,
      provider: "WISEBASE",
      connectorMode: "CONNECTOR_MEDIATED",
      mutation,
      brief,
      briefHash: hashPayload(brief),
      compiledConcept: payload.concept,
      compiledExplanation: payload.explanation,
      promptHash: payload.promptHash,
      targetDurationSeconds: brief.targetDurationSeconds,
      durationTolerancePercent: brief.durationTolerancePercent,
      status: "AWAITING_EXTERNAL_EXECUTION",
      ...emptyExecutionFields
    });
  }
}
