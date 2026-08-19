"use client";

import { useState, useEffect, useRef } from "react";
import { SongLab } from "@/components/SongLab";
import { ProjectCard } from "@/components/ProjectCard";
import { getProjects, createProject } from "@/lib/persistence";
import type { SongProject } from "@/lib/types";
import { CreateNextReleaseButton } from "@/components/CreateNextReleaseButton";
import { X } from "lucide-react";

export default function LabPage() {
  const [projects, setProjects] = useState<SongProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRole, setNewRole] = useState("Single");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = getProjects();
    setProjects(loaded);
    if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }
  }, []);

  useEffect(() => {
    if (showNew) {
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }, [showNew]);

  const handleProjectUpdate = (updated: SongProject) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const project = createProject(newTitle.trim(), newRole.trim() || "Single");
    setProjects((prev) => [project, ...prev]);
    setActiveId(project.id);
    setNewTitle("");
    setNewRole("Single");
    setShowNew(false);
  };

  const active = projects.find((p) => p.id === activeId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-label mb-1">Song Lab</p>
          <h1 className="text-xl font-medium tracking-tight text-bone">
            Active work
          </h1>
        </div>
        <CreateNextReleaseButton />
        <button
          onClick={() => setShowNew(true)}
          className="text-[12px] font-medium text-accent hover:text-accent-soft transition-colors"
        >
          + New track
        </button>
      </div>

      {/* New track sheet */}
      {showNew && (
        <div className="rounded-2xl border border-accent/30 bg-slate-950 p-4 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="section-label">New track</p>
            <button
              onClick={() => setShowNew(false)}
              className="p-1 text-ash/50 hover:text-bone"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              ref={titleInputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="TITLE IN ALL CAPS ENERGY"
              className="w-full bg-transparent text-[16px] text-bone placeholder:text-ash/30 border-b border-slate-800 pb-2 focus:outline-none focus:border-accent/50"
              style={{ fontSize: "16px" }}
              autoCapitalize="characters"
            />
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Role (e.g. Manifesto single)"
              className="w-full bg-transparent text-[14px] text-ash/80 placeholder:text-ash/30 border-b border-slate-800 pb-2 focus:outline-none focus:border-accent/50"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim()}
              className="flex-1 h-10 rounded-xl bg-accent text-void text-[13px] font-medium disabled:opacity-40 hover:bg-accent-soft transition-colors"
            >
              Create & open
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="h-10 px-4 rounded-xl border border-slate-700 text-[13px] text-ash/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={{
              id: p.id,
              title: p.title,
              status: p.status,
              role: p.role,
              progress: p.progress,
              lastTouched: formatRelative(p.lastTouched),
            }}
            active={activeId === p.id}
            onSelect={() => setActiveId(p.id)}
          />
        ))}
      </div>

      {/* The forge */}
      {active && (
        <SongLab
          key={active.id}
          projectId={active.id}
          title={active.title}
          onProjectUpdate={handleProjectUpdate}
        />
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
