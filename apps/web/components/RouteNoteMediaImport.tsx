"use client";

import { useEffect, useMemo, useState } from "react";
import { FileAudio, ImageIcon, Loader2, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

type ApiError = { code: string; message: string };
type MediaKind = "MASTER" | "COVER_ART";
type ReleaseOption = { id: string; title: string; status: string };
type ImportResult = {
  kind: MediaKind;
  assetId: string;
  sha256: string;
  contentType: string;
  technical: Record<string, number | string>;
};

async function safeJson(response: Response): Promise<any> {
  return response.json().catch(() => ({
    ok: false,
    error: { code: "ROUTENOTE_MEDIA_IMPORT_FAILED", message: "Canonical media import failed." }
  }));
}

function apiError(data: any): ApiError {
  return {
    code: typeof data?.error?.code === "string" ? data.error.code : "ROUTENOTE_MEDIA_IMPORT_FAILED",
    message: typeof data?.error?.message === "string" ? data.error.message : "Canonical media import failed."
  };
}

function shortHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function technicalSummary(result: ImportResult): string {
  if (result.kind === "MASTER") {
    const t = result.technical;
    return `${Number(t.channels)}ch · ${Math.round(Number(t.sampleRateHz) / 100) / 10} kHz · ${Number(t.bitDepth)}-bit · ${Math.round(Number(t.bitrateKbps))} kbps`;
  }
  const t = result.technical;
  return `${Number(t.width)}×${Number(t.height)} · ${String(t.colorSpace)} · ${(Number(t.fileSizeBytes) / 1024 / 1024).toFixed(1)} MiB`;
}

export function RouteNoteMediaImport() {
  const [releases, setReleases] = useState<ReleaseOption[]>([]);
  const [releaseId, setReleaseId] = useState("");
  const [master, setMaster] = useState<File | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [busy, setBusy] = useState<MediaKind | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const selected = useMemo(
    () => releases.find(release => release.id === releaseId) ?? null,
    [releases, releaseId]
  );

  async function loadReleases() {
    const response = await fetch("/api/distribution/routenote", { cache: "no-store" });
    const data = await safeJson(response);
    if (!response.ok || !data?.ok) throw apiError(data);
    const next = Array.isArray(data?.snapshot?.releases)
      ? data.snapshot.releases.map((release: any) => ({
          id: String(release.id),
          title: String(release.title),
          status: String(release.status)
        }))
      : [];
    setReleases(next);
    setReleaseId(current => current && next.some((item: ReleaseOption) => item.id === current)
      ? current
      : next[0]?.id ?? "");
  }

  useEffect(() => {
    void loadReleases().catch(cause => {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_MEDIA_IMPORT_FAILED", message: "Could not load releases for media import." }
      );
    });
  }, []);

  async function upload(kind: MediaKind) {
    const file = kind === "MASTER" ? master : artwork;
    if (!file || !releaseId) return;
    setBusy(kind);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/distribution/routenote/media?releaseId=${encodeURIComponent(releaseId)}&kind=${kind}`,
        {
          method: "POST",
          headers: { "content-type": file.type || "application/octet-stream" },
          body: file
        }
      );
      const data = await safeJson(response);
      if (!response.ok || !data?.ok) throw apiError(data);
      setResult(data.media as ImportResult);
      if (kind === "MASTER") setMaster(null);
      else setArtwork(null);
    } catch (cause) {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_MEDIA_IMPORT_FAILED", message: "Canonical media import failed." }
      );
    } finally {
      setBusy(null);
    }
  }

  const blocked = !selected || selected.status !== "PREPARED";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-accent/20 bg-accent/10 p-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ash/50">Canonical production media</p>
          <h2 className="mt-1 text-[14px] font-medium text-bone">Import approved master + artwork</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-ash/45">
            Files are streamed into private durable storage, SHA-256 hashed, measured on the server, and only then recorded as the current approved canonical assets. Local paths are never returned to the browser.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.14em] text-ash/50">Release</span>
        <select
          value={releaseId}
          onChange={event => {
            setReleaseId(event.target.value);
            setError(null);
            setResult(null);
          }}
          className="mt-2 w-full min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[13px] text-bone outline-none focus:border-accent/60"
        >
          {releases.length === 0 ? <option value="">No releases available</option> : null}
          {releases.map(release => (
            <option key={release.id} value={release.id}>
              {release.title} · {release.status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      {blocked && selected ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-300">
          Canonical media is immutable after package preflight begins. Return this release to a PREPARED package state before changing assets.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <FileAudio className="h-4 w-4 text-accent" />
            <div>
              <p className="text-[12px] font-medium text-bone">Master audio</p>
              <p className="text-[10px] text-ash/40">FLAC · stereo · 44.1 kHz · 16-bit · 30–600 s</p>
            </div>
          </div>
          <input
            type="file"
            accept=".flac,audio/flac,audio/x-flac"
            disabled={blocked || busy !== null}
            onChange={event => setMaster(event.target.files?.[0] ?? null)}
            className="block w-full text-[11px] text-ash/60 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-[11px] file:text-bone"
          />
          <button
            type="button"
            onClick={() => void upload("MASTER")}
            disabled={blocked || busy !== null || !master}
            className="w-full min-h-11 rounded-xl border border-accent/30 bg-accent/10 px-3 text-[11px] font-medium text-accent disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy === "MASTER" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {busy === "MASTER" ? "Measuring + importing" : "Import approved FLAC master"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-accent" />
            <div>
              <p className="text-[12px] font-medium text-bone">Cover artwork</p>
              <p className="text-[10px] text-ash/40">JPEG · 3000×3000 · RGB-compatible · ≤25 MiB</p>
            </div>
          </div>
          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            disabled={blocked || busy !== null}
            onChange={event => setArtwork(event.target.files?.[0] ?? null)}
            className="block w-full text-[11px] text-ash/60 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-[11px] file:text-bone"
          />
          <button
            type="button"
            onClick={() => void upload("COVER_ART")}
            disabled={blocked || busy !== null || !artwork}
            className="w-full min-h-11 rounded-xl border border-accent/30 bg-accent/10 px-3 text-[11px] font-medium text-accent disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy === "COVER_ART" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {busy === "COVER_ART" ? "Measuring + importing" : "Import approved JPEG artwork"}
          </button>
        </div>
      </div>

      {result ? (
        <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-3 text-[11px]">
          <p className="font-medium text-accent">Canonical {result.kind === "MASTER" ? "master" : "artwork"} verified and imported.</p>
          <p className="mt-1 text-bone/70">{technicalSummary(result)}</p>
          <p className="mt-1 text-ash/40">SHA-256 {shortHash(result.sha256)}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-[11px] text-bone flex items-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh RouteNote readiness
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[11px] text-amber-300">{error.message}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-ash/40">{error.code}</p>
        </div>
      ) : null}
    </section>
  );
}
