"use client";

import { useState } from "react";
import { getProject } from "@/lib/persistence";
import { SECTION_ORDER } from "@/lib/types";

export function PromoteDraftButton({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function promote() {
    const project = getProject(projectId);
    if (!project) return;
    setPending(true);
    setMessage("");
    const lyrics = SECTION_ORDER.map((section) => project.lyrics[section.id])
      .filter(Boolean)
      .join("\n\n");
    try {
      const response = await fetch("/api/projects/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: project.title, lyrics })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "PROMOTE_FAILED");
      setMessage(`Promoted to Postgres as ${result.projectId}. Release state was not advanced.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PROMOTE_FAILED");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={promote}
        disabled={pending}
        className="text-[12px] font-medium text-ash/80 hover:text-accent disabled:opacity-40"
      >
        {pending ? "Promoting…" : "Promote draft to Postgres"}
      </button>
      {message ? <p className="text-[11px] text-ash/55">{message}</p> : null}
    </div>
  );
}
