"use client";

import { cn } from "@/lib/utils";

type Status = "IDEA" | "DRAFT" | "IN_PROGRESS" | "REVIEW" | "LOCKED";

interface Project {
  id: string;
  title: string;
  status: Status;
  role: string;
  progress: number;
  lastTouched: string;
}

const statusColor: Record<Status, string> = {
  IDEA: "text-ash/60",
  DRAFT: "text-glitch-cyan/80",
  IN_PROGRESS: "text-accent",
  REVIEW: "text-glitch-magenta/80",
  LOCKED: "text-bone/70",
};

export function ProjectCard({
  project,
  active,
  onSelect,
}: {
  project: Project;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex-shrink-0 w-[148px] text-left rounded-xl border p-3.5 transition-all",
        active
          ? "border-accent/40 bg-slate-900 shadow-[0_0_0_1px_rgba(196,163,90,0.15)]"
          : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn("text-[10px] font-medium tracking-wide", statusColor[project.status])}>
          {project.status.replace("_", " ")}
        </span>
        <span className="text-[10px] text-ash/40">{project.lastTouched}</span>
      </div>
      <h3 className="text-[13px] font-medium tracking-tight text-bone leading-snug mb-1 line-clamp-2">
        {project.title}
      </h3>
      <p className="text-[11px] text-ash/50 mb-3">{project.role}</p>
      {/* Tiny progress */}
      <div className="h-[2px] w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent/70 rounded-full transition-all"
          style={{ width: `${project.progress}%` }}
        />
      </div>
    </button>
  );
}
