"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, Download, ExternalLink, RefreshCw, Sparkles, Subtitles } from "lucide-react";
import { executionPayloadFromRunDetail, MUTATION_ACTIONS } from "@/lib/video-view";
import { VideoRunCard, type VideoRunSummary } from "./VideoRunCard";

type CaptionAsset = {
  id: string;
  version: number;
  locale: string;
  source: string;
  format: "json" | "srt" | "vtt";
  content: string;
  contentHash: string;
  cueCount: number;
};

type VideoRunDetail = VideoRunSummary & {
  lineageKey: string;
  brief: Record<string, unknown>;
  briefHash: string;
  compiledConcept: string;
  compiledExplanation: string;
  promptHash: string;
  durationTolerancePercent: number;
  externalStatus: string | null;
  providerError: unknown | null;
};

type ExecutionPayload = {
  provider: "WISEBASE";
  mode: "CONNECTOR_MEDIATED";
  concept: string;
  explanation: string;
  lang: string;
  promptHash: string;
};

const DEFAULT_COVERAGE = [
  "primordial density fluctuations",
  "dark matter",
  "gravitational instability",
  "anisotropic collapse into sheets, filaments, and nodes",
  "void evacuation",
  "cosmic expansion"
].join("\n");

const DEFAULT_VISUALS = [
  "dark space background",
  "cyan/gold accents",
  "clean typography",
  "meaningful motion throughout",
  "labels for fluctuations, dark matter, filaments, nodes, and voids",
  "no long static ending"
].join("\n");

function lines(value: string): string[] {
  return value.split("\n").map(item => item.trim()).filter(Boolean);
}

function asJson(value: string): unknown {
  const trimmed = value.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

function pretty(value: unknown): string {
  return value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
}

function downloadText(name: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VideoLab() {
  const [runs, setRuns] = useState<VideoRunSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VideoRunDetail | null>(null);
  const [captions, setCaptions] = useState<CaptionAsset[]>([]);
  const [execution, setExecution] = useState<ExecutionPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const [title, setTitle] = useState("Why Galaxies Form the Cosmic Web");
  const [topic, setTopic] = useState("Why galaxies form the cosmic web");
  const [audience, setAudience] = useState("curious adults");
  const [tone, setTone] = useState("clear, cinematic, scientifically accurate, not childish");
  const [targetDuration, setTargetDuration] = useState(60);
  const [tolerance, setTolerance] = useState(15);
  const [coverage, setCoverage] = useState(DEFAULT_COVERAGE);
  const [visuals, setVisuals] = useState(DEFAULT_VISUALS);
  const [locale, setLocale] = useState("en");

  const [taskId, setTaskId] = useState("");
  const [resultStatus, setResultStatus] = useState("completed");
  const [resultUrl, setResultUrl] = useState("");
  const [metricsJson, setMetricsJson] = useState("{}");
  const [errorJson, setErrorJson] = useState('{"final_error":null}');

  const [captionFormat, setCaptionFormat] = useState<"srt" | "vtt" | "json">("srt");
  const [captionSource, setCaptionSource] = useState("MANUAL_IMPORT");
  const [captionText, setCaptionText] = useState("");

  const [transcript, setTranscript] = useState("");
  const [durationMeasured, setDurationMeasured] = useState("");
  const [widthMeasured, setWidthMeasured] = useState("");
  const [heightMeasured, setHeightMeasured] = useState("");
  const [fpsMeasured, setFpsMeasured] = useState("");
  const [staticEndingRisk, setStaticEndingRisk] = useState(false);

  const refreshRuns = useCallback(async () => {
    const response = await fetch("/api/video-runs", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load video runs");
    const data = await response.json();
    const next = (data.runs ?? []) as VideoRunSummary[];
    setRuns(next);
    setSelectedId(current => current ?? next[0]?.id ?? null);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/video-runs/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load selected run");
    const data = await response.json();
    const run = data.run as VideoRunDetail;
    setDetail(run);
    setExecution(executionPayloadFromRunDetail(run));
    setCaptions((data.captions ?? []) as CaptionAsset[]);
    setTaskId(run.externalTaskId ?? "");
    setResultStatus(run.externalStatus ?? "completed");
    setResultUrl(run.videoUrl ?? "");
    setMetricsJson(pretty(run.providerMetrics) || "{}");
    setErrorJson(pretty(run.providerError) || '{"final_error":null}');
    setDurationMeasured(run.durationSeconds?.toString() ?? "");
    setWidthMeasured(run.width?.toString() ?? "");
    setHeightMeasured(run.height?.toString() ?? "");
    setFpsMeasured(run.fps?.toString() ?? "");
  }, []);

  useEffect(() => {
    refreshRuns().catch(error => setNotice(error instanceof Error ? error.message : "Could not load runs"));
  }, [refreshRuns]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setExecution(null);
      setCaptions([]);
      return;
    }
    loadDetail(selectedId).catch(error => setNotice(error instanceof Error ? error.message : "Could not load run"));
  }, [selectedId, loadDetail]);

  const latestCaptionVersion = useMemo(
    () => (captions.length ? Math.max(...captions.map(item => item.version)) : null),
    [captions]
  );
  const latestCaptions = useMemo(
    () => captions.filter(item => item.version === latestCaptionVersion),
    [captions, latestCaptionVersion]
  );

  async function createRun() {
    setBusy("create");
    setNotice("");
    try {
      const response = await fetch("/api/video-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          audience,
          tone,
          targetDurationSeconds: targetDuration,
          durationTolerancePercent: tolerance,
          requiredCoverage: lines(coverage),
          visualRequirements: lines(visuals),
          locale
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create run");
      setExecution(data.execution as ExecutionPayload);
      setSelectedId(data.run.id);
      await refreshRuns();
      setNotice("Run created. The Wisebase payload is prepared, but no provider call has been made by this app.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create run");
    } finally {
      setBusy(null);
    }
  }

  async function attachTask() {
    if (!detail) return;
    setBusy("task");
    try {
      const response = await fetch(`/api/video-runs/${detail.id}/external-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalTaskId: taskId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not attach task");
      await Promise.all([refreshRuns(), loadDetail(detail.id)]);
      setNotice("External Wisebase task receipt attached.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach task");
    } finally {
      setBusy(null);
    }
  }

  async function attachResult() {
    if (!detail) return;
    setBusy("result");
    try {
      const response = await fetch(`/api/video-runs/${detail.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalStatus: resultStatus,
          videoUrl: resultUrl || null,
          metrics: asJson(metricsJson),
          error: asJson(errorJson)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not attach result");
      await Promise.all([refreshRuns(), loadDetail(detail.id)]);
      setNotice("Provider result receipt attached. Generation success is still separate from verification.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach result");
    } finally {
      setBusy(null);
    }
  }

  async function mutate(value: string) {
    if (!detail) return;
    setBusy(value);
    try {
      const response = await fetch(`/api/video-runs/${detail.id}/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutation: value })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create mutation");
      setExecution(data.execution as ExecutionPayload);
      setSelectedId(data.run.id);
      await refreshRuns();
      setNotice(`${value.replaceAll("_", " ")} child run prepared. No provider call was made by the app.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not mutate run");
    } finally {
      setBusy(null);
    }
  }

  async function attachCaptions() {
    if (!detail) return;
    setBusy("captions");
    try {
      const response = await fetch(`/api/video-runs/${detail.id}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: captionSource,
          locale,
          format: captionFormat,
          content: captionText
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not attach captions");
      await Promise.all([refreshRuns(), loadDetail(detail.id)]);
      setNotice("Caption timeline persisted as JSON, SRT, and WebVTT. QC is still required.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach captions");
    } finally {
      setBusy(null);
    }
  }

  async function runQc() {
    if (!detail) return;
    setBusy("qc");
    try {
      const technicalMetadata =
        durationMeasured && widthMeasured && heightMeasured && fpsMeasured
          ? {
              durationSeconds: Number(durationMeasured),
              width: Number(widthMeasured),
              height: Number(heightMeasured),
              fps: Number(fpsMeasured)
            }
          : undefined;
      const response = await fetch(`/api/video-runs/${detail.id}/qc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript || undefined,
          technicalMetadata,
          staticEndingRisk
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not run QC");
      await Promise.all([refreshRuns(), loadDetail(detail.id)]);
      setNotice(data.receipt?.verified ? "QC verified this run." : "QC retained failures or unresolved evidence for review.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not run QC");
    } finally {
      setBusy(null);
    }
  }

  function copyExecution() {
    if (!execution) return;
    navigator.clipboard.writeText(JSON.stringify(execution, null, 2)).then(
      () => setNotice("Execution payload copied."),
      () => setNotice("Could not copy execution payload.")
    );
  }

  return (
    <div className="space-y-8">
      {notice && (
        <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-[12px] leading-relaxed text-ash/80">
          {notice}
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <div>
            <p className="section-label">New video</p>
            <h2 className="mt-1 text-lg font-medium text-bone">One topic → governed Wisebase run</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ash/55">
              Wisebase is the active generator. This application compiles and versions the payload, then records connector receipts, captions, and QC evidence.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title"><input value={title} onChange={event => setTitle(event.target.value)} className="input" /></Field>
            <Field label="Topic"><input value={topic} onChange={event => setTopic(event.target.value)} className="input" /></Field>
            <Field label="Audience"><input value={audience} onChange={event => setAudience(event.target.value)} className="input" /></Field>
            <Field label="Tone"><input value={tone} onChange={event => setTone(event.target.value)} className="input" /></Field>
            <Field label="Target seconds"><input type="number" min={30} max={120} value={targetDuration} onChange={event => setTargetDuration(Number(event.target.value))} className="input" /></Field>
            <Field label="Tolerance %"><input type="number" min={1} max={50} value={tolerance} onChange={event => setTolerance(Number(event.target.value))} className="input" /></Field>
          </div>
          <Field label="Required causal coverage, one item per line">
            <textarea value={coverage} onChange={event => setCoverage(event.target.value)} rows={6} className="input resize-y" />
          </Field>
          <Field label="Visual requirements, one item per line">
            <textarea value={visuals} onChange={event => setVisuals(event.target.value)} rows={6} className="input resize-y" />
          </Field>
          <div className="flex items-end gap-3">
            <Field label="Locale"><input value={locale} onChange={event => setLocale(event.target.value)} className="input w-24" /></Field>
            <button onClick={createRun} disabled={busy !== null} className="h-10 rounded-xl bg-accent px-5 text-[12px] font-medium text-void disabled:opacity-40">
              {busy === "create" ? "Preparing…" : "Prepare run"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-glitch-cyan/20 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-glitch-cyan" />
            <p className="section-label text-glitch-cyan">Execution boundary</p>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-bone">
            Wisebase · connector-mediated
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ash/55">
            This build prepares the exact generation payload. It does not directly call Wisebase or claim a direct developer API connection.
          </p>
          {execution ? (
            <div className="mt-4 space-y-3">
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-void p-3 text-[10px] leading-relaxed text-ash/70">
                {JSON.stringify(execution, null, 2)}
              </pre>
              <button onClick={copyExecution} className="inline-flex items-center gap-2 text-[11px] font-medium text-glitch-cyan">
                <Clipboard className="h-3.5 w-3.5" /> Copy execution payload
              </button>
            </div>
          ) : (
            <p className="mt-5 text-[11px] text-ash/35">Prepare or select a run to expose its exact Wisebase payload.</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div><p className="section-label">Run ledger</p><h2 className="mt-1 text-[15px] font-medium text-bone">Immutable versions</h2></div>
            <button onClick={() => refreshRuns().catch(() => undefined)} className="p-2 text-ash/45 hover:text-bone" aria-label="Refresh runs"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {runs.map(run => <VideoRunCard key={run.id} run={run} selected={selectedId === run.id} onSelect={() => setSelectedId(run.id)} />)}
          {!runs.length && <div className="rounded-2xl border border-slate-800 p-6 text-center text-[12px] text-ash/40">No video runs yet.</div>}
        </div>

        <div className="space-y-4">
          {!detail ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-ash/45">Select a run to inspect its evidence.</div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="section-label">Selected run</p><h2 className="mt-1 text-[16px] font-medium text-bone">{detail.title}</h2><p className="mt-1 text-[11px] text-ash/45">v{detail.version} · {detail.mutation.replaceAll("_", " ")} · prompt {detail.promptHash.slice(0, 10)}…</p></div>
                  {detail.videoUrl && <a href={detail.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent">Open video <ExternalLink className="h-3 w-3" /></a>}
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {MUTATION_ACTIONS.map(action => <button key={action.value} onClick={() => mutate(action.value)} disabled={busy !== null} className="min-h-10 rounded-lg border border-slate-700 px-2 text-[10px] font-medium text-ash/70 hover:border-accent/40 hover:text-bone disabled:opacity-40">{action.label}</button>)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                <p className="section-label">Connector receipts</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Field label="Wisebase task ID"><input value={taskId} onChange={event => setTaskId(event.target.value)} className="input" placeholder="Task ID returned by connector" /></Field>
                  <button onClick={attachTask} disabled={!taskId.trim() || busy !== null} className="self-end h-10 rounded-xl border border-accent/40 px-4 text-[11px] font-medium text-accent disabled:opacity-40">Attach task</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="External status"><input value={resultStatus} onChange={event => setResultStatus(event.target.value)} className="input" /></Field>
                  <Field label="Result video URL"><input value={resultUrl} onChange={event => setResultUrl(event.target.value)} className="input" placeholder="https://…" /></Field>
                  <Field label="Provider metrics JSON"><textarea rows={5} value={metricsJson} onChange={event => setMetricsJson(event.target.value)} className="input font-mono text-[11px]" /></Field>
                  <Field label="Provider error JSON"><textarea rows={5} value={errorJson} onChange={event => setErrorJson(event.target.value)} className="input font-mono text-[11px]" /></Field>
                </div>
                <button onClick={attachResult} disabled={busy !== null} className="h-10 rounded-xl bg-slate-800 px-4 text-[11px] font-medium text-bone disabled:opacity-40">Record result receipt</button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                <div className="flex items-center gap-2"><Subtitles className="h-4 w-4 text-accent" /><p className="section-label">Persistent captions</p></div>
                <p className="text-[11px] leading-relaxed text-ash/50">Wisebase does not currently expose a caption sidecar through this connector. Import an actual SRT/VTT/JSON timeline or leave the run blocked at captions required.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Source"><select value={captionSource} onChange={event => setCaptionSource(event.target.value)} className="input"><option>MANUAL_IMPORT</option><option>PROVIDER_SIDECAR</option><option>LOCAL_ALIGNMENT</option></select></Field>
                  <Field label="Format"><select value={captionFormat} onChange={event => setCaptionFormat(event.target.value as "srt" | "vtt" | "json")} className="input"><option value="srt">SRT</option><option value="vtt">WebVTT</option><option value="json">JSON</option></select></Field>
                  <Field label="Locale"><input value={locale} onChange={event => setLocale(event.target.value)} className="input" /></Field>
                </div>
                <textarea value={captionText} onChange={event => setCaptionText(event.target.value)} rows={8} className="input font-mono text-[11px]" placeholder="Paste real caption data…" />
                <button onClick={attachCaptions} disabled={!captionText.trim() || busy !== null} className="h-10 rounded-xl border border-accent/40 px-4 text-[11px] font-medium text-accent disabled:opacity-40">Persist captions</button>
                {!!latestCaptions.length && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                    {latestCaptions.map(item => <button key={item.id} onClick={() => downloadText(`${detail.id}-v${item.version}.${item.format}`, item.content, item.format === "json" ? "application/json" : "text/plain")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-2 text-[10px] text-ash/65"><Download className="h-3 w-3" /> {item.format.toUpperCase()} v{item.version}</button>)}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                <p className="section-label">Quality control</p>
                <Field label="Transcript used for factual coverage"><textarea value={transcript} onChange={event => setTranscript(event.target.value)} rows={6} className="input" placeholder="Paste an actual transcript to resolve coverage checks." /></Field>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Duration s"><input value={durationMeasured} onChange={event => setDurationMeasured(event.target.value)} type="number" className="input" /></Field>
                  <Field label="Width"><input value={widthMeasured} onChange={event => setWidthMeasured(event.target.value)} type="number" className="input" /></Field>
                  <Field label="Height"><input value={heightMeasured} onChange={event => setHeightMeasured(event.target.value)} type="number" className="input" /></Field>
                  <Field label="FPS"><input value={fpsMeasured} onChange={event => setFpsMeasured(event.target.value)} type="number" className="input" /></Field>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-ash/60"><input type="checkbox" checked={staticEndingRisk} onChange={event => setStaticEndingRisk(event.target.checked)} /> Static-ending risk observed</label>
                <button onClick={runQc} disabled={busy !== null} className="h-10 rounded-xl bg-accent px-4 text-[11px] font-medium text-void disabled:opacity-40">Run fail-closed QC</button>
                {detail.qc && <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-void p-3 text-[10px] leading-relaxed text-ash/70">{pretty(detail.qc)}</pre>}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[10px] uppercase tracking-[0.12em] text-ash/45">{label}</span>{children}</label>;
}
