"use client";

import { useEffect, useState } from "react";
import { CreateNextReleaseButton } from "@/components/CreateNextReleaseButton";

interface ProjectRow {
  id: string;
  title: string | null;
  state: string;
  release: { id: string; status: string } | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "PROJECTS_UNAVAILABLE");
        setProjects(data.projects ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "PROJECTS_UNAVAILABLE"));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-label mb-1">Projects</p>
          <h1 className="text-xl font-medium tracking-tight text-bone">Orchestrator board</h1>
        </div>
        <CreateNextReleaseButton />
      </div>
      {error ? <p className="text-[13px] text-glitch-magenta">{error}</p> : null}
      <div className="space-y-2">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <p className="text-[14px] text-bone font-medium">{project.title ?? "Untitled"}</p>
            <p className="text-[12px] text-ash/50">
              {project.state}
              {project.release ? ` · release ${project.release.status}` : " · no release package"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
