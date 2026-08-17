"use client";

import { useEffect, useState } from "react";
import {
  getProject,
  saveProject,
  saveVersion,
} from "@/lib/persistence";
import { forgeVariation, delay } from "@/lib/forge";
import type { SectionId, SongProject } from "@/lib/types";
import { SECTION_ORDER } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SongLab({
  projectId,
  title,
  onProjectUpdate,
}: {
  projectId: string;
  title: string;
  onProjectUpdate: (p: SongProject) => void;
}) {
  const [section, setSection] = useState<SectionId>("chorus");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [forging, setForging] = useState(false);
  const [variants, setVariants] = useState<
    { id: string; label: string; text: string; note: string }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) return;
    setText(p.lyrics[section] || "");
    setNotes(p.notes || "");
  }, [projectId, section]);

  const persist = (nextText: string, nextNotes?: string) => {
    const p = getProject(projectId);
    if (!p) return;
    const lyrics = { ...p.lyrics, [section]: nextText };
    const updated = saveProject({
      ...p,
      lyrics,
      notes: nextNotes ?? notes,
      progress: Math.min(95, Math.max(p.progress, 20)),
    });
    onProjectUpdate(updated);
  };

  const onChange = (value: string) => {
    setText(value);
    persist(value);
  };

  const runForge = async () => {
    setForging(true);
    setVariants([]);
    try {
      // Prefer API (remote or local engine behind /api/forge)
      const key =
        typeof window !== "undefined"
          ? localStorage.getItem("songforge.llmKey") || ""
          : "";
      const res = await fetch("/api/forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section,
          currentText: text,
          title,
          apiKey: key || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variations || []);
      } else {
        setVariants(forgeVariation(section, text, title));
      }
    } catch {
      await delay(200);
      setVariants(forgeVariation(section, text, title));
    } finally {
      setForging(false);
    }
  };

  const applyVariant = (v: { label: string; text: string }) => {
    setText(v.text);
    persist(v.text);
    const p = getProject(projectId);
    if (p) {
      const updated = saveVersion(
        projectId,
        v.label,
        { ...p.lyrics, [section]: v.text },
        notes,
        "forge"
      );
      if (updated) onProjectUpdate(updated);
    }
    setVariants([]);
  };

  const project = getProject(projectId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">Writing surface</p>
          <h2 className="text-[15px] font-medium text-bone tracking-tight">
            {title}
          </h2>
        </div>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="text-[11px] text-ash/50 hover:text-bone"
        >
          {showHistory ? "Close history" : "History"}
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {SECTION_ORDER.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              "shrink-0 px-2.5 h-8 rounded-lg text-[11px] font-medium tracking-wide border transition-colors",
              section === s.id
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-slate-800 text-ash/50 hover:text-ash"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="Write the section…"
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-[16px] text-bone lyric-surface placeholder:text-ash/25 focus:outline-none focus:border-accent/40 resize-y min-h-[180px]"
        style={{ fontSize: "16px" }}
      />

      <div className="flex gap-2">
        <button
          onClick={runForge}
          disabled={forging}
          className="h-10 px-4 rounded-xl bg-accent text-void text-[13px] font-medium disabled:opacity-40 hover:bg-accent-soft"
        >
          {forging ? "Forging…" : "Forge variation"}
        </button>
      </div>

      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Takes</p>
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => applyVariant(v)}
              className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/70 p-3 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-accent">
                  {v.label}
                </span>
                <span className="text-[10px] text-ash/40">{v.note}</span>
              </div>
              <pre className="text-[13px] text-bone/90 whitespace-pre-wrap font-sans lyric-surface">
                {v.text}
              </pre>
            </button>
          ))}
        </div>
      )}

      {showHistory && project && project.versions.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Versions</p>
          {project.versions.map((ver) => (
            <button
              key={ver.id}
              onClick={() => {
                const t = ver.lyrics[section] || "";
                setText(t);
                persist(t);
              }}
              className="w-full text-left rounded-xl border border-slate-800 px-3 py-2.5 hover:border-slate-600"
            >
              <div className="flex justify-between text-[12px]">
                <span className="text-bone">{ver.label}</span>
                <span className="text-ash/40">{ver.source}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
