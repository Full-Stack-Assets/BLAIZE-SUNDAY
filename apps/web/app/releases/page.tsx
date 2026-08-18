"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STAGES = [
  "PREPARED",
  "AWAITING_AUTHORIZATION",
  "SUBMITTED",
  "ACCEPTED",
  "SCHEDULED",
  "LIVE"
] as const;

interface ReleaseRow {
  id: string;
  title: string;
  status: string;
  verifiedPlatformUrl: string | null;
  externalConfirmationId: string | null;
  project: { title: string | null };
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/releases")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "RELEASES_UNAVAILABLE");
        setReleases(data.releases ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "RELEASES_UNAVAILABLE"));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Releases</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">Proof cycle</h1>
        <p className="text-[13px] text-ash/50 mt-1">
          PostgreSQL is canonical. LIVE still requires URL + confirmation ID.
        </p>
      </div>
      {error ? <p className="text-[13px] text-glitch-magenta">{error}</p> : null}
      {releases.length === 0 && !error ? (
        <p className="text-ash/50 text-sm">No Prisma releases yet. Seed the database or run CREATE NEXT RELEASE.</p>
      ) : null}
      <div className="space-y-3">
        {releases.map((release) => {
          const idx = STAGES.indexOf(release.status as (typeof STAGES)[number]);
          return (
            <Link
              key={release.id}
              href={`/releases/${release.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-medium text-bone">{release.title}</h3>
                  <p className="text-[12px] text-ash/50">{release.project.title}</p>
                </div>
                <span className="text-[11px] font-medium text-accent uppercase tracking-wider">
                  {release.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {STAGES.map((stage, i) => (
                  <div key={stage} className={cn("flex-1 h-1 rounded-full", i <= idx ? "bg-accent" : "bg-slate-800")} />
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
