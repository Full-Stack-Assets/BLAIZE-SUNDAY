"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X
} from "lucide-react";

import type {
  RouteNoteControlSnapshot,
  RouteNoteDraftSummary
} from "@/lib/routenote-control";
import { cn } from "@/lib/utils";

type ApiError = { code: string; message: string };
type DesktopMode = "INTERACTIVE" | "VIEW_ONLY";
type BusyAction =
  | "login"
  | "check"
  | "preflight"
  | "authorize"
  | "run"
  | "inspect"
  | null;

type Preflight = {
  ready: true;
  releaseId: string;
  releaseTitle: string;
  actionPackageId: string;
  approvalId: string;
  payloadHash: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  approvalExpiresAt: string;
  audioSha256: string[];
  artworkSha256: string;
  submissionPerformed: false;
};

type RunStatus =
  | "QUEUED"
  | "RUNNING"
  | "DRAFT_READY"
  | "BLOCKED_OPERATOR_REVIEW"
  | "FAILED";

type RouteNoteRun = {
  id: string;
  releaseId: string;
  releaseTitle: string;
  actionPackageId: string;
  approvalId: string;
  payloadHash: string;
  status: RunStatus;
  currentStep: string | null;
  completedSteps: string[];
  errorCode: string | null;
  draft: RouteNoteDraftSummary | null;
  createdAt: string;
  updatedAt: string;
};

const STEP_LABELS: Record<string, string> = {
  SESSION_VERIFIED: "RouteNote session verified",
  DRAFT_RESOLVED: "Release draft resolved",
  RELEASE_DATA_SAVED: "Release data saved",
  ALBUM_DETAILS_SAVED: "Album metadata saved",
  AUDIO_UPLOADED: "Master audio uploaded",
  ARTWORK_UPLOADED: "Artwork uploaded",
  STORES_CONFIGURED: "Stores configured",
  PROVIDER_VALIDATED: "Provider validation passed"
};

async function responseJson(response: Response): Promise<any> {
  return response.json().catch(() => ({
    ok: false,
    error: {
      code: "ROUTENOTE_CONTROL_FAILED",
      message: "RouteNote control operation failed."
    }
  }));
}

function readApiError(data: any): ApiError {
  return {
    code:
      typeof data?.error?.code === "string"
        ? data.error.code
        : "ROUTENOTE_CONTROL_FAILED",
    message:
      typeof data?.error?.message === "string"
        ? data.error.message
        : "RouteNote control operation failed."
  };
}

async function issueDesktopSession(mode: DesktopMode): Promise<string> {
  const response = await fetch("/api/distribution/routenote/desktop-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode })
  });
  const data = await responseJson(response);
  if (!response.ok || !data?.ok || typeof data?.desktop?.url !== "string") {
    throw readApiError(data);
  }
  return data.desktop.url;
}

async function clearDesktopSession(): Promise<void> {
  await fetch("/api/distribution/routenote/desktop-session", {
    method: "DELETE"
  }).catch(() => undefined);
}

function popupError(): ApiError {
  return {
    code: "ROUTENOTE_DESKTOP_POPUP_BLOCKED",
    message: "Safari blocked the RouteNote host window. Allow the new tab and try again."
  };
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function shortHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/70 last:border-0">
      <span className="text-[13px] text-bone/90">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider",
          ready ? "text-accent" : "text-ash/50"
        )}
      >
        {ready ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {ready ? "Ready" : "Needs work"}
      </span>
    </div>
  );
}

export function RouteNoteControlPanel() {
  const [snapshot, setSnapshot] = useState<RouteNoteControlSnapshot | null>(null);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [run, setRun] = useState<RouteNoteRun | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [inspectionError, setInspectionError] = useState<ApiError | null>(null);

  const selected = useMemo(
    () => snapshot?.releases.find(release => release.id === selectedReleaseId) ?? null,
    [snapshot, selectedReleaseId]
  );
  const connected = snapshot?.status === "CONNECTED" || snapshot?.status === "DRAFT_READY";

  async function loadSnapshot() {
    try {
      const response = await fetch("/api/distribution/routenote", { cache: "no-store" });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      const next = data.snapshot as RouteNoteControlSnapshot;
      setSnapshot(next);
      setSelectedReleaseId(current =>
        current && next.releases.some(item => item.id === current)
          ? current
          : next.releases[0]?.id ?? ""
      );
    } catch (cause) {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_CONTROL_FAILED", message: "RouteNote control operation failed." }
      );
    }
  }

  async function loadLatestRun(releaseId: string) {
    if (!releaseId) return;
    try {
      const response = await fetch(
        `/api/distribution/routenote/runs?releaseId=${encodeURIComponent(releaseId)}`,
        { cache: "no-store" }
      );
      const data = await responseJson(response);
      if (response.ok && data?.ok) setRun((data.run as RouteNoteRun | null) ?? null);
    } catch {
      // The canonical snapshot remains usable even when no prior run exists.
    }
  }

  async function loadRun(runId: string) {
    const response = await fetch(
      `/api/distribution/routenote/runs/${encodeURIComponent(runId)}`,
      { cache: "no-store" }
    );
    const data = await responseJson(response);
    if (!response.ok || !data?.ok) throw readApiError(data);
    setRun(data.run as RouteNoteRun);
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  useEffect(() => {
    setPreflight(null);
    setError(null);
    setRun(null);
    void loadLatestRun(selectedReleaseId);
  }, [selectedReleaseId]);

  useEffect(() => {
    if (!run || (run.status !== "QUEUED" && run.status !== "RUNNING")) return;
    const timer = window.setInterval(() => {
      void loadRun(run.id).catch(cause => {
        setError(
          typeof cause === "object" && cause !== null && "code" in cause
            ? (cause as ApiError)
            : { code: "ROUTENOTE_CONTROL_FAILED", message: "Could not refresh RouteNote run status." }
        );
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [run?.id, run?.status]);

  async function connectionAction(kind: "login" | "check") {
    const desktopWindow =
      kind === "login"
        ? window.open("about:blank", "songforge-routenote-login")
        : null;
    if (kind === "login" && !desktopWindow) {
      setError(popupError());
      return;
    }

    setBusy(kind);
    setError(null);
    try {
      if (kind === "login" && desktopWindow) {
        const url = await issueDesktopSession("INTERACTIVE");
        desktopWindow.location.href = url;
      }
      const response = await fetch(`/api/distribution/routenote/${kind}`, { method: "POST" });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      await loadSnapshot();
    } catch (cause) {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_CONTROL_FAILED", message: "RouteNote connection operation failed." }
      );
    } finally {
      if (kind === "login") {
        await clearDesktopSession();
        if (desktopWindow && !desktopWindow.closed) desktopWindow.close();
      }
      setBusy(null);
    }
  }

  async function preflightSelected() {
    if (!selected) return;
    setBusy("preflight");
    setError(null);
    try {
      const response = await fetch("/api/distribution/routenote/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId: selected.id })
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      setPreflight(data.preflight as Preflight);
      await loadSnapshot();
    } catch (cause) {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_CONTROL_FAILED", message: "RouteNote preflight failed." }
      );
    } finally {
      setBusy(null);
    }
  }

  async function authorizeSelected() {
    if (!selected) return;
    setBusy("authorize");
    setError(null);
    try {
      const response = await fetch("/api/distribution/routenote/draft-authorization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId: selected.id })
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      setPreflight(data.authorization as Preflight);
    } catch (cause) {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_CONTROL_FAILED", message: "RouteNote package authorization failed." }
      );
    } finally {
      setBusy(null);
    }
  }

  async function startRun() {
    if (!selected || preflight?.approvalStatus !== "APPROVED") return;
    setBusy("run");
    setError(null);
    try {
      const response = await fetch("/api/distribution/routenote/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId: selected.id })
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      setRun(data.run as RouteNoteRun);
    } catch (cause) {
      setError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_CONTROL_FAILED", message: "Could not queue the RouteNote draft run." }
      );
    } finally {
      setBusy(null);
    }
  }

  async function openDraftInspection() {
    if (!run?.draft) return;
    const desktopWindow = window.open("about:blank", "songforge-routenote-draft-view");
    if (!desktopWindow) {
      setInspectionError(popupError());
      return;
    }

    setBusy("inspect");
    setInspectionError(null);
    try {
      const url = await issueDesktopSession("VIEW_ONLY");
      desktopWindow.location.href = url;
      const response = await fetch("/api/distribution/routenote/draft-inspection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId: run.releaseId })
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
    } catch (cause) {
      if (desktopWindow && !desktopWindow.closed) desktopWindow.close();
      setInspectionError(
        typeof cause === "object" && cause !== null && "code" in cause
          ? (cause as ApiError)
          : { code: "ROUTENOTE_CONTROL_FAILED", message: "RouteNote draft inspection failed." }
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="section-label mb-1">Distribution · RouteNote Free</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">RouteNote automation</h1>
        <p className="text-[13px] text-ash/50 mt-1 max-w-2xl">
          Preflight the canonical package, authorize that exact payload, then queue a durable browser run. The final RouteNote submission remains outside automation.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-ash/50">RouteNote account</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", connected ? "bg-accent" : "bg-amber-400")} />
              <span className="text-[14px] font-medium text-bone">
                {snapshot ? statusLabel(snapshot.status) : "Checking…"}
              </span>
            </div>
          </div>
          <span className={cn("text-[10px] uppercase tracking-wider", snapshot?.hostAvailable ? "text-accent" : "text-amber-400")}>
            {snapshot?.hostAvailable ? "Host ready" : "Host unavailable"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void connectionAction("login")}
            disabled={busy !== null || !snapshot?.hostAvailable}
            className="min-h-12 rounded-xl border border-accent/30 bg-accent/10 px-3 text-[12px] font-medium text-accent disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
            {busy === "login" ? "Waiting for sign-in" : "Connect RouteNote"}
          </button>
          <button
            type="button"
            onClick={() => void connectionAction("check")}
            disabled={busy !== null}
            className="min-h-12 rounded-xl border border-slate-700 bg-slate-900/70 px-3 text-[12px] font-medium text-bone disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", busy === "check" && "animate-spin")} />
            Check connection
          </button>
        </div>
        <p className="text-[11px] text-ash/40">
          Passwords, MFA and CAPTCHA stay inside the private RouteNote browser. SongForge retains only the durable authenticated browser profile.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
        <div>
          <label htmlFor="routenote-release" className="text-[11px] uppercase tracking-[0.14em] text-ash/50">
            Release
          </label>
          <select
            id="routenote-release"
            value={selectedReleaseId}
            onChange={event => setSelectedReleaseId(event.target.value)}
            className="mt-2 w-full min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[14px] text-bone outline-none focus:border-accent/60"
          >
            {(snapshot?.releases ?? []).length === 0 ? <option value="">No releases available</option> : null}
            {(snapshot?.releases ?? []).map(release => (
              <option key={release.id} value={release.id}>
                {release.title} · {statusLabel(release.status)}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ash/50">Canonical readiness</p>
              <span className={cn("text-[10px] uppercase tracking-wider font-medium", selected.readiness.ready ? "text-accent" : "text-amber-400")}>
                {selected.readiness.ready ? "Ready" : "Blocked"}
              </span>
            </div>
            <ReadinessRow label="Audio" ready={selected.readiness.groups.audio} />
            <ReadinessRow label="Artwork" ready={selected.readiness.groups.artwork} />
            <ReadinessRow label="Metadata" ready={selected.readiness.groups.metadata} />
            <ReadinessRow label="Rights" ready={selected.readiness.groups.rights} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void preflightSelected()}
          disabled={busy !== null || !selected?.readiness.ready}
          className="w-full min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-[12px] font-medium text-bone disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy === "preflight" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy === "preflight" ? "Verifying exact package" : "Run production preflight"}
        </button>
      </section>

      {preflight ? (
        <section className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-violet-300/70">Exact package authorization</p>
              <p className="mt-1 text-[14px] font-medium text-bone">{preflight.releaseTitle}</p>
            </div>
            <span className={cn("text-[10px] uppercase tracking-wider font-medium", preflight.approvalStatus === "APPROVED" ? "text-accent" : "text-amber-300")}>
              {preflight.approvalStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-ash/40">Payload hash</span>
              <code className="mt-1 block text-bone/80">{shortHash(preflight.payloadHash)}</code>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-ash/40">Approval expires</span>
              <span className="mt-1 block text-bone/80">{new Date(preflight.approvalExpiresAt).toLocaleString()}</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-ash/40">Master</span>
              <span className="mt-1 block text-accent">Hash verified</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-ash/40">Artwork</span>
              <span className="mt-1 block text-accent">Hash verified</span>
            </div>
          </div>

          {preflight.approvalStatus === "PENDING" ? (
            <button
              type="button"
              onClick={() => void authorizeSelected()}
              disabled={busy !== null}
              className="w-full min-h-13 rounded-xl bg-violet-300 px-4 text-[12px] font-semibold text-slate-950 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy === "authorize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {busy === "authorize" ? "Authorizing exact package" : "Authorize this package"}
            </button>
          ) : null}

          {preflight.approvalStatus === "APPROVED" ? (
            <button
              type="button"
              onClick={() => void startRun()}
              disabled={busy !== null || !connected || run?.status === "QUEUED" || run?.status === "RUNNING"}
              className="w-full min-h-14 rounded-xl bg-accent px-4 text-[13px] font-semibold text-void disabled:bg-slate-800 disabled:text-ash/40 flex items-center justify-center gap-2"
            >
              {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {busy === "run" ? "Queueing durable run" : "Run RouteNote draft automation"}
            </button>
          ) : null}

          {!connected && preflight.approvalStatus === "APPROVED" ? (
            <p className="text-[11px] text-amber-300/70 text-center">Connect RouteNote before starting the authorized run.</p>
          ) : null}
        </section>
      ) : null}

      {run ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ash/50">Durable run</p>
              <p className="mt-1 text-[14px] font-medium text-bone">{run.releaseTitle}</p>
              <p className="mt-1 text-[10px] text-ash/40">{run.id}</p>
            </div>
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-medium",
              run.status === "DRAFT_READY" ? "text-accent" :
                run.status === "BLOCKED_OPERATOR_REVIEW" || run.status === "FAILED" ? "text-amber-300" : "text-violet-300"
            )}>
              {statusLabel(run.status)}
            </span>
          </div>

          {(run.status === "QUEUED" || run.status === "RUNNING") ? (
            <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-3 text-[12px] text-violet-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              {run.status === "QUEUED" ? "Queued on the production worker" : STEP_LABELS[run.currentStep ?? ""] ?? "RouteNote browser automation running"}
            </div>
          ) : null}

          <div className="space-y-1">
            {Object.entries(STEP_LABELS).map(([step, label]) => {
              const done = run.completedSteps.includes(step);
              return (
                <div key={step} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                  <span className={cn("text-[11px]", done ? "text-bone/80" : "text-ash/30")}>{label}</span>
                  {done ? <Check className="h-3.5 w-3.5 text-accent" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />}
                </div>
              );
            })}
          </div>

          {run.status === "DRAFT_READY" && run.draft ? (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-4 space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[13px] font-semibold">ROUTENOTE DRAFT READY</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-ash/60">
                <span>Master</span><span className="text-right text-bone">Verified + uploaded</span>
                <span>Artwork</span><span className="text-right text-bone">Verified + uploaded</span>
                <span>Metadata</span><span className="text-right text-bone">Completed</span>
                <span>Stores</span><span className="text-right text-bone">Configured</span>
                <span>Final submission</span><span className="text-right text-amber-300">NOT PERFORMED</span>
              </div>
              <button
                type="button"
                onClick={() => void openDraftInspection()}
                disabled={busy !== null}
                className="w-full min-h-12 rounded-xl border border-accent/30 bg-accent/10 px-3 text-[12px] font-medium text-accent disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy === "inspect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {busy === "inspect" ? "Opening retained draft" : "Review in RouteNote"}
              </button>
            </div>
          ) : null}

          {run.status === "BLOCKED_OPERATOR_REVIEW" || run.status === "FAILED" ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                <div>
                  <p className="text-[12px] text-amber-200">Automation stopped safely. Inspect the retained provider state before any retry.</p>
                  {run.errorCode ? <p className="mt-1 text-[10px] uppercase tracking-wider text-ash/40">{run.errorCode}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          {inspectionError ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
              <p className="text-[12px] text-amber-200">{inspectionError.message}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-ash/40">{inspectionError.code}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
            <div>
              <p className="text-[12px] text-amber-200">{error.message}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-ash/40">{error.code}</p>
            </div>
          </div>
        </section>
      ) : null}

      <p className="text-[10px] leading-relaxed text-ash/35 text-center px-3">
        The worker can create and populate a RouteNote draft only. Accepting agreements, clicking Distribute Free, or recording a SUBMITTED state is not implemented in this control path.
      </p>
    </div>
  );
}
