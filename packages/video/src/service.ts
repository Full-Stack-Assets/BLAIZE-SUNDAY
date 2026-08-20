import { randomUUID } from "node:crypto";
import { hashPayload } from "@songforge/shared";
import {
  normalizeCaptionTimeline,
  parseSrt,
  parseVtt,
  toSrt,
  toVtt,
  type CaptionTimeline,
  type LocalAlignmentProvider
} from "./captions.ts";
import {
  createVideoBrief,
  type VideoGenerationBrief,
  type VideoMutation
} from "./domain.ts";
import { compileWisebasePayload, mutateVideoBrief } from "./prompt.ts";
import { evaluateVideoQc, type VideoQcReceipt } from "./qc.ts";
import type {
  CaptionRecord,
  CaptionSource,
  VideoRunRecord,
  VideoRunRepository
} from "./repository.ts";
import type {
  TechnicalInspector,
  TechnicalMetadata
} from "./technical-inspection.ts";

export interface ExternalVideoResult {
  status: string;
  videoUrl?: string | null;
  metrics?: unknown | null;
  error?: unknown | null;
}

export interface AttachCaptionsInput {
  source: CaptionSource;
  locale: string;
  format?: "srt" | "vtt" | "json";
  content?: string;
  timeline?: CaptionTimeline;
  sourceMediaHash?: string | null;
}

export interface AttachCaptionsResult {
  run: VideoRunRecord;
  timeline: CaptionTimeline;
  captions: CaptionRecord[];
}

export interface RunQcInput {
  transcript?: string | null;
  technicalMetadata?: TechnicalMetadata | null;
  staticEndingRisk?: boolean;
  coverageAliases?: Record<string, string[]>;
}

export interface RunQcResult {
  run: VideoRunRecord;
  receipt: VideoQcReceipt;
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

function captionTimelineFromInput(input: AttachCaptionsInput): CaptionTimeline {
  if (input.timeline) return normalizeCaptionTimeline(input.timeline);
  const content = input.content ?? "";
  if (input.format === "srt") return parseSrt(content, input.locale);
  if (input.format === "vtt") return parseVtt(content, input.locale);
  if (input.format === "json") {
    try {
      return normalizeCaptionTimeline(JSON.parse(content) as CaptionTimeline);
    } catch (error) {
      if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
        throw error;
      }
      throw new Error("INVALID_CAPTION_FORMAT");
    }
  }
  throw new Error("INVALID_CAPTION_FORMAT");
}

function normalizedResultReceipt(result: ExternalVideoResult) {
  return {
    externalStatus: result.status.trim().toLowerCase(),
    videoUrl: result.videoUrl?.trim() || null,
    providerMetrics: result.metrics ?? null,
    providerError: result.error ?? null
  };
}

function storedResultReceipt(run: VideoRunRecord) {
  return {
    externalStatus: run.externalStatus?.trim().toLowerCase() ?? null,
    videoUrl: run.videoUrl?.trim() || null,
    providerMetrics: run.providerMetrics ?? null,
    providerError: run.providerError ?? null
  };
}

export class VideoRunService {
  private readonly repo: VideoRunRepository;
  private readonly technicalInspector?: TechnicalInspector;
  private readonly alignmentProvider?: LocalAlignmentProvider;

  constructor(
    repo: VideoRunRepository,
    technicalInspector?: TechnicalInspector,
    alignmentProvider?: LocalAlignmentProvider
  ) {
    this.repo = repo;
    this.technicalInspector = technicalInspector;
    this.alignmentProvider = alignmentProvider;
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

    if (run.externalTaskId) {
      if (run.externalTaskId === normalized) return run;
      throw new Error("EXTERNAL_TASK_RECEIPT_IMMUTABLE");
    }

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
    if (!run.externalTaskId) throw new Error("EXTERNAL_TASK_RECEIPT_REQUIRED");

    const receipt = normalizedResultReceipt(result);
    if (run.completedAt) {
      if (hashPayload(storedResultReceipt(run)) === hashPayload(receipt)) return run;
      throw new Error("EXTERNAL_RESULT_RECEIPT_IMMUTABLE");
    }

    const { externalStatus, providerError, videoUrl } = receipt;

    if (hasFinalError(providerError)) {
      return this.repo.updateExecution(id, {
        status: "FAILED",
        externalStatus,
        videoUrl,
        providerMetrics: receipt.providerMetrics,
        providerError,
        completedAt: new Date().toISOString()
      });
    }

    if (externalStatus === "pending" || externalStatus === "processing") {
      return this.repo.updateExecution(id, {
        status: "PENDING",
        externalStatus,
        videoUrl,
        providerMetrics: receipt.providerMetrics,
        providerError
      });
    }

    if (externalStatus === "completed" && videoUrl) {
      return this.repo.updateExecution(id, {
        status: "CAPTIONS_REQUIRED",
        externalStatus,
        videoUrl,
        providerMetrics: receipt.providerMetrics,
        providerError,
        captionStatus: "MISSING",
        completedAt: new Date().toISOString()
      });
    }

    return this.repo.updateExecution(id, {
      status: "FAILED",
      externalStatus,
      videoUrl,
      providerMetrics: receipt.providerMetrics,
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

  async attachCaptions(
    runId: string,
    input: AttachCaptionsInput
  ): Promise<AttachCaptionsResult> {
    const run = await this.repo.get(runId);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");

    const timeline = captionTimelineFromInput(input);
    const existing = await this.repo.listCaptions(runId);
    const version = existing.length
      ? Math.max(...existing.map(item => item.version)) + 1
      : 1;
    const startSeconds = timeline.cues[0]?.startSeconds ?? 0;
    const endSeconds = timeline.cues.at(-1)?.endSeconds ?? 0;
    const sourceMediaHash = input.sourceMediaHash ?? null;
    const representations = [
      { format: "json" as const, content: JSON.stringify(timeline) },
      { format: "srt" as const, content: toSrt(timeline) },
      { format: "vtt" as const, content: toVtt(timeline) }
    ];

    const pendingCaptions: CaptionRecord[] = representations.map(representation => ({
      id: randomUUID(),
      runId,
      version,
      locale: timeline.locale,
      source: input.source,
      format: representation.format,
      content: representation.content,
      contentHash: hashPayload(representation.content),
      cueCount: timeline.cues.length,
      startSeconds,
      endSeconds,
      sourceMediaHash
    }));
    const captions = await this.repo.attachCaptions(pendingCaptions);

    const updated = await this.repo.updateExecution(runId, {
      captionStatus: "AVAILABLE"
    });

    return { run: updated, timeline, captions };
  }

  async alignCaptions(
    runId: string,
    locale: string
  ): Promise<AttachCaptionsResult> {
    const run = await this.repo.get(runId);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");
    if (!run.videoUrl || run.externalStatus?.trim().toLowerCase() !== "completed") {
      throw new Error("CAPTION_ALIGNMENT_NOT_READY");
    }
    if (!this.alignmentProvider || (await this.alignmentProvider.health()) !== "CONFIGURED") {
      throw new Error("LOCAL_ALIGNMENT_UNCONFIGURED");
    }

    const aligned = await this.alignmentProvider.align({
      mediaPath: run.videoUrl,
      locale
    });
    if (!aligned.sourceMediaHash.trim()) throw new Error("SOURCE_MEDIA_HASH_REQUIRED");

    return this.attachCaptions(runId, {
      source: "LOCAL_ALIGNMENT",
      locale,
      timeline: aligned.timeline,
      sourceMediaHash: aligned.sourceMediaHash
    });
  }

  async runQc(runId: string, input: RunQcInput): Promise<RunQcResult> {
    let run = await this.repo.get(runId);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");
    if (
      !run.externalTaskId ||
      run.externalStatus?.trim().toLowerCase() !== "completed" ||
      !run.videoUrl ||
      hasFinalError(run.providerError)
    ) {
      throw new Error("QC_NOT_READY");
    }

    let technicalMetadata = input.technicalMetadata ?? null;
    if (!technicalMetadata && this.technicalInspector) {
      try {
        technicalMetadata = await this.technicalInspector.inspect(run.videoUrl);
      } catch {
        technicalMetadata = null;
      }
    }

    if (technicalMetadata) {
      run = await this.repo.updateExecution(runId, {
        durationSeconds: technicalMetadata.durationSeconds,
        width: technicalMetadata.width,
        height: technicalMetadata.height,
        fps: technicalMetadata.fps
      });
    }

    const captions = await this.repo.listCaptions(runId);
    const receipt = evaluateVideoQc({
      run,
      captions,
      transcript: input.transcript,
      technicalMetadata,
      staticEndingRisk: input.staticEndingRisk,
      coverageAliases: input.coverageAliases
    });
    const status = receipt.verified
      ? "VERIFIED"
      : receipt.failures.length
        ? "QC_FAILED"
        : "NEEDS_REVISION";
    const saved = await this.repo.saveQc(runId, status, receipt);
    return { run: saved, receipt };
  }
}
