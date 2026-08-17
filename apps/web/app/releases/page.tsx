"use client";

import { useState, useEffect } from "react";
import { getProjects } from "@/lib/persistence";
import type { SongProject, ReleaseStage } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: ReleaseStage[] = [
  "PREPARED",
  "AWAITING_AUTHORIZATION",
  "SUBMITTED",
  "ACCEPTED",
  "SCHEDULED",
  "LIVE",
];

export default function ReleasesPage() {
  const [projects, setProjects] = useState<SongProject[]>([]);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const inPipeline = projects.filter((p) => p.releaseStage !== null);
  const notReady = projects.filter((p) => p.releaseStage === null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Releases</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">
          Proof cycle
        </h1>
        <p className="text-[13px] text-ash/50 mt-1">
          LIVE requires verified external evidence. Nothing skips a gate.
        </p>
      </div>

      {inPipeline.length > 0 && (
        <div className="space-y-3">
          <p className="section-label">In the machine</p>
          {inPipeline.map((p) => (
            <ReleaseCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {notReady.length > 0 && (
        <div className="space-y-3">
          <p className="section-label">Not yet prepared</p>
          {notReady.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5"
            >
              <div>
                <p className="text-[14px] font-medium text-bone tracking-tight">
                  {p.title}
                </p>
                <p className="text-[11px] text-ash/50 mt-0.5">
                  {p.status} · {p.progress}%
                </p>
              </div>
              <span className="text-[11px] text-ash/35 uppercase tracking-wider">
                No package
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReleaseCard({ project }: { project: SongProject }) {
  const stage = project.releaseStage!;
  const stageIndex = STAGES.indexOf(stage);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-medium text-bone tracking-tight">
            {project.title}
          </h3>
          <p className="text-[12px] text-ash/50 mt-0.5">{project.role}</p>
        </div>
        <span className="text-[11px] font-medium text-accent uppercase tracking-wider">
          {stage.replace(/_/g, " ")}
        </span>
      </div>

      {/* State machine rail */}
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-full h-1 rounded-full transition-colors",
                i <= stageIndex ? "bg-accent" : "bg-slate-800"
              )}
            />
            <span
              className={cn(
                "text-[9px] uppercase tracking-wider text-center leading-tight",
                i === stageIndex
                  ? "text-accent"
                  : i < stageIndex
                    ? "text-ash/50"
                    : "text-ash/25"
              )}
            >
              {s === "AWAITING_AUTHORIZATION"
                ? "AUTH"
                : s === "PREPARED"
                  ? "PREP"
                  : s.slice(0, 4)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ash/40">
        {stage === "PREPARED" &&
          "Package ready. Waiting for authorization gate."}
        {stage === "AWAITING_AUTHORIZATION" &&
          "Human decision required before any external action."}
        {stage === "LIVE" && "Verified live. External evidence on file."}
      </p>
    </div>
  );
}
