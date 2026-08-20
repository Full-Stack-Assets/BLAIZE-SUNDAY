"use client";

import { CheckCircle2, CircleAlert, Clock3, Film, Subtitles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  describeVideoRunStatus,
  formatTechnicalSummary,
  type VideoUiStatus
} from "@/lib/video-view";

export interface VideoRunSummary {
  id: string;
  version: number;
  parentRunId: string | null;
  title: string;
  topic: string;
  mutation: string;
  status: VideoUiStatus;
  provider: string;
  connectorMode: string;
  targetDurationSeconds: number;
  externalTaskId: string | null;
  videoUrl: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  captionStatus: string;
  providerMetrics: unknown | null;
  qc: Record<string, unknown> | null;
  createdAt?: string;
}

const statusTone: Record<VideoUiStatus, string> = {
  PLANNED: "text-ash/60 border-slate-700",
  AWAITING_EXTERNAL_EXECUTION: "text-glitch-cyan border-glitch-cyan/30",
  PENDING: "text-glitch-cyan border-glitch-cyan/30",
  COMPLETED: "text-accent border-accent/30",
  GENERATED: "text-accent border-accent/30",
  CAPTIONS_REQUIRED: "text-accent border-accent/30",
  QC_FAILED: "text-glitch-magenta border-glitch-magenta/30",
  NEEDS_REVISION: "text-glitch-magenta border-glitch-magenta/30",
  VERIFIED: "text-accent border-accent/40",
  FAILED: "text-glitch-magenta border-glitch-magenta/30"
};

export function VideoRunCard({
  run,
  selected,
  onSelect
}: {
  run: VideoRunSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon =
    run.status === "VERIFIED"
      ? CheckCircle2
      : run.status === "FAILED" || run.status === "QC_FAILED"
        ? CircleAlert
        : run.status === "PENDING"
          ? Clock3
          : Film;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-accent/40 bg-slate-900"
          : "border-slate-800 bg-slate-950/65 hover:border-slate-700"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-accent" />
            <h3 className="truncate text-[14px] font-medium text-bone">{run.title}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ash/50">
            v{run.version} · {run.mutation.replaceAll("_", " ")} · {run.provider}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9px] font-medium uppercase tracking-wider",
            statusTone[run.status]
          )}
        >
          {run.status.replaceAll("_", " ")}
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ash/65">
        {describeVideoRunStatus(run.status)}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ash/40">
        <span>Target {run.targetDurationSeconds}s</span>
        <span>{formatTechnicalSummary(run)}</span>
        <span className="inline-flex items-center gap-1">
          <Subtitles className="h-3 w-3" /> {run.captionStatus}
        </span>
      </div>
    </button>
  );
}
