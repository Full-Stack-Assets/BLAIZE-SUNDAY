import type { VideoMutation, VideoRunStatus } from "./domain.ts";

export type VideoProvider = "WISEBASE";
export type VideoConnectorMode = "CONNECTOR_MEDIATED";
export type CaptionSource =
  | "PROVIDER_SIDECAR"
  | "LOCAL_ALIGNMENT"
  | "MANUAL_IMPORT";

export interface VideoRunRecord {
  id: string;
  lineageKey: string;
  version: number;
  parentRunId: string | null;
  title: string;
  topic: string;
  provider: VideoProvider;
  connectorMode: VideoConnectorMode;
  mutation: VideoMutation;
  brief: unknown;
  briefHash: string;
  compiledConcept: string;
  compiledExplanation: string;
  promptHash: string;
  targetDurationSeconds: number;
  durationTolerancePercent: number;
  status: VideoRunStatus;
  externalTaskId: string | null;
  externalStatus: string | null;
  videoUrl: string | null;
  providerMetrics: unknown | null;
  providerError: unknown | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  captionStatus: string;
  qc: unknown | null;
  createdAt?: string;
  completedAt: string | null;
}

export interface CaptionRecord {
  id: string;
  runId: string;
  version: number;
  locale: string;
  source: CaptionSource;
  format: "json" | "srt" | "vtt";
  content: string;
  contentHash: string;
  cueCount: number;
  startSeconds: number;
  endSeconds: number;
  sourceMediaHash: string | null;
  createdAt?: string;
}

export type ExecutionPatch = Partial<
  Pick<
    VideoRunRecord,
    | "status"
    | "externalTaskId"
    | "externalStatus"
    | "videoUrl"
    | "providerMetrics"
    | "providerError"
    | "durationSeconds"
    | "width"
    | "height"
    | "fps"
    | "captionStatus"
    | "completedAt"
  >
>;

export interface VideoRunRepository {
  create(run: VideoRunRecord): Promise<VideoRunRecord>;
  get(id: string): Promise<VideoRunRecord | null>;
  list(limit?: number): Promise<VideoRunRecord[]>;
  listLineage(lineageKey: string): Promise<VideoRunRecord[]>;
  updateExecution(id: string, patch: ExecutionPatch): Promise<VideoRunRecord>;
  attachCaption(caption: CaptionRecord): Promise<CaptionRecord>;
  attachCaptions(captions: CaptionRecord[]): Promise<CaptionRecord[]>;
  listCaptions(runId: string): Promise<CaptionRecord[]>;
  saveQc(
    id: string,
    status: VideoRunStatus,
    qc: unknown
  ): Promise<VideoRunRecord>;
}

function cloneRun(run: VideoRunRecord): VideoRunRecord {
  return structuredClone(run);
}

function cloneCaption(caption: CaptionRecord): CaptionRecord {
  return structuredClone(caption);
}

function captionKey(caption: Pick<CaptionRecord, "runId" | "version" | "format">) {
  return `${caption.runId}:${caption.version}:${caption.format}`;
}

export class InMemoryVideoRunRepository implements VideoRunRepository {
  private readonly runs = new Map<string, VideoRunRecord>();
  private readonly captions: CaptionRecord[] = [];

  async create(run: VideoRunRecord): Promise<VideoRunRecord> {
    if (this.runs.has(run.id)) throw new Error("VIDEO_RUN_ALREADY_EXISTS");
    const stored = cloneRun({
      ...run,
      createdAt: run.createdAt ?? new Date().toISOString()
    });
    this.runs.set(stored.id, stored);
    return cloneRun(stored);
  }

  async get(id: string): Promise<VideoRunRecord | null> {
    const run = this.runs.get(id);
    return run ? cloneRun(run) : null;
  }

  async list(limit = 50): Promise<VideoRunRecord[]> {
    return [...this.runs.values()]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, limit)
      .map(cloneRun);
  }

  async listLineage(lineageKey: string): Promise<VideoRunRecord[]> {
    return [...this.runs.values()]
      .filter(run => run.lineageKey === lineageKey)
      .sort((a, b) => a.version - b.version)
      .map(cloneRun);
  }

  async updateExecution(
    id: string,
    patch: ExecutionPatch
  ): Promise<VideoRunRecord> {
    const current = this.runs.get(id);
    if (!current) throw new Error("VIDEO_RUN_NOT_FOUND");
    const updated = cloneRun({ ...current, ...patch });
    this.runs.set(id, updated);
    return cloneRun(updated);
  }

  async attachCaption(caption: CaptionRecord): Promise<CaptionRecord> {
    const [stored] = await this.attachCaptions([caption]);
    if (!stored) throw new Error("CAPTION_BATCH_EMPTY");
    return stored;
  }

  async attachCaptions(captions: CaptionRecord[]): Promise<CaptionRecord[]> {
    if (!captions.length) return [];

    const incomingKeys = new Set<string>();
    for (const caption of captions) {
      if (!this.runs.has(caption.runId)) throw new Error("VIDEO_RUN_NOT_FOUND");
      const key = captionKey(caption);
      if (incomingKeys.has(key)) throw new Error("CAPTION_VERSION_ALREADY_EXISTS");
      incomingKeys.add(key);
      if (this.captions.some(item => captionKey(item) === key)) {
        throw new Error("CAPTION_VERSION_ALREADY_EXISTS");
      }
    }

    const now = new Date().toISOString();
    const stored = captions.map(caption =>
      cloneCaption({
        ...caption,
        createdAt: caption.createdAt ?? now
      })
    );
    this.captions.push(...stored);
    return stored.map(cloneCaption);
  }

  async listCaptions(runId: string): Promise<CaptionRecord[]> {
    return this.captions
      .filter(caption => caption.runId === runId)
      .sort((a, b) => a.version - b.version || a.format.localeCompare(b.format))
      .map(cloneCaption);
  }

  async saveQc(
    id: string,
    status: VideoRunStatus,
    qc: unknown
  ): Promise<VideoRunRecord> {
    const current = this.runs.get(id);
    if (!current) throw new Error("VIDEO_RUN_NOT_FOUND");
    const updated = cloneRun({ ...current, status, qc });
    this.runs.set(id, updated);
    return cloneRun(updated);
  }
}
