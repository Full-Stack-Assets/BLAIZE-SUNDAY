"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Run {
  id: string;
  agentId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  output: { status?: string; action_performed?: string; required_human_decision?: string } | null;
  project: { title: string | null } | null;
}

export default function PipelinePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/agent-runs")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "PIPELINE_UNAVAILABLE");
        setRuns(data.runs ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "PIPELINE_UNAVAILABLE"));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Pipeline</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">Agent runs</h1>
        <p className="text-[13px] text-ash/50 mt-1">
          Prisma AgentRun records only. Empty until CREATE NEXT RELEASE or seed data exists.
        </p>
      </div>
      {error ? <p className="text-[13px] text-glitch-magenta">{error}</p> : null}
      {runs.length === 0 && !error ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <p className="text-ash/50 text-sm">No agent runs yet.</p>
        </div>
      ) : null}
      <div className="space-y-2">
        {runs.map((run) => (
          <div key={run.id} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-bone">{run.agentId}</p>
              <span className={cn("text-[10px] uppercase tracking-wider", run.status === "ESCALATED" ? "text-glitch-magenta" : "text-accent")}>
                {run.status}
              </span>
            </div>
            <p className="text-[12px] text-ash/60 mt-1">
              {run.project?.title ?? "unscoped"} · {run.output?.action_performed ?? "recorded"}
            </p>
            {run.output?.required_human_decision ? (
              <p className="text-[11px] text-accent/80 mt-1">{run.output.required_human_decision}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
