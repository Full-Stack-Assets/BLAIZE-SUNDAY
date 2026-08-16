"use client";

import { useState, useEffect } from "react";
import { getAgentRuns } from "@/lib/persistence";
import type { AgentRun, AgentRunStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusColor: Record<AgentRunStatus, string> = {
  QUEUED: "text-ash/60",
  RUNNING: "text-glitch-cyan",
  SUCCEEDED: "text-accent",
  FAILED: "text-glitch-magenta",
  BLOCKED: "text-glitch-magenta",
  CANCELLED: "text-ash/40",
};

const statusDot: Record<AgentRunStatus, string> = {
  QUEUED: "bg-ash/40",
  RUNNING: "bg-glitch-cyan animate-pulse",
  SUCCEEDED: "bg-accent",
  FAILED: "bg-glitch-magenta",
  BLOCKED: "bg-glitch-magenta",
  CANCELLED: "bg-ash/30",
};

export default function PipelinePage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);

  useEffect(() => {
    setRuns(getAgentRuns());
  }, []);

  const active = runs.filter(
    (r) =>
      r.status === "QUEUED" ||
      r.status === "RUNNING" ||
      r.status === "BLOCKED"
  );
  const history = runs.filter(
    (r) =>
      r.status === "SUCCEEDED" ||
      r.status === "FAILED" ||
      r.status === "CANCELLED"
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Pipeline</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">
          Agent runs
        </h1>
        <p className="text-[13px] text-ash/50 mt-1">
          Every agent action is logged. Blocked items wait for a human gate.
        </p>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Live / blocked</p>
          {active.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Recent</p>
          {history.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}

      {runs.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <p className="text-ash/50 text-sm">No agent runs yet.</p>
        </div>
      )}
    </div>
  );
}

function RunCard({ run }: { run: AgentRun }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot[run.status])}
            />
            <span className="text-[13px] font-medium text-bone truncate">
              {run.action}
            </span>
          </div>
          <p className="text-[11px] text-ash/50 pl-3.5">
            {run.agentRole}
            {run.projectTitle ? ` · ${run.projectTitle}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-medium shrink-0",
            statusColor[run.status]
          )}
        >
          {run.status}
        </span>
      </div>

      <p className="text-[12px] text-ash/70 leading-relaxed pl-3.5">
        {run.summary}
      </p>

      <div className="flex items-center justify-between pl-3.5 text-[10px] text-ash/35">
        <span>
          {new Date(run.startedAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex items-center gap-2">
          {run.requiresApproval && (
            <span className="text-accent/70">Needs gate</span>
          )}
          <span
            className={cn(
              run.risk === "HIGH" && "text-glitch-magenta/70",
              run.risk === "MODERATE" && "text-accent/60"
            )}
          >
            {run.risk}
          </span>
        </div>
      </div>
    </div>
  );
}
