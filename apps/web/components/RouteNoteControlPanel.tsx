"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlugZap,
  RefreshCw,
  UploadCloud,
  X
} from "lucide-react";

import {
  canPrepareSelectedRelease,
  createInitialRouteNoteControlState,
  reduceRouteNoteControlState,
  selectedRouteNoteRelease
} from "@/lib/routenote-control-client";
import type {
  RouteNoteControlSnapshot,
  RouteNoteDraftSummary
} from "@/lib/routenote-control";
import { cn } from "@/lib/utils";

const PENDING_STAGES = [
  "Verify release",
  "Verify assets",
  "Open RouteNote",
  "Create or resume draft",
  "Metadata",
  "Audio",
  "Artwork",
  "Stores",
  "Provider validation",
  "DRAFT READY"
];

const STEP_LABELS: Record<string, string> = {
  SESSION_VERIFIED: "RouteNote session verified",
  DRAFT_RESOLVED: "Release draft resolved",
  RELEASE_DATA_SAVED: "Release data saved",
  ALBUM_DETAILS_SAVED: "Album metadata saved",
  AUDIO_UPLOADED: "Audio uploaded and confirmed",
  ARTWORK_UPLOADED: "Artwork uploaded and confirmed",
  STORES_CONFIGURED: "Stores configured",
  PROVIDER_VALIDATED: "Provider validation passed"
};

type ApiError = { code: string; message: string };

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

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
  const [state, dispatch] = useReducer(
    reduceRouteNoteControlState,
    undefined,
    createInitialRouteNoteControlState
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"login" | "check" | "prepare" | null>(null);

  const selected = useMemo(() => selectedRouteNoteRelease(state), [state]);
  const canPrepare = canPrepareSelectedRelease(state) && busy === null;

  async function loadSnapshot() {
    setLoading(true);
    try {
      const response = await fetch("/api/distribution/routenote", {
        cache: "no-store"
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      dispatch({
        type: "SNAPSHOT_LOADED",
        snapshot: data.snapshot as RouteNoteControlSnapshot
      });
    } catch (error) {
      const safe =
        typeof error === "object" && error !== null && "code" in error
          ? (error as ApiError)
          : {
              code: "ROUTENOTE_CONTROL_FAILED",
              message: "RouteNote control operation failed."
            };
      dispatch({ type: "FAILED", error: safe });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  async function connectionAction(kind: "login" | "check") {
    setBusy(kind);
    try {
      const response = await fetch(`/api/distribution/routenote/${kind}`, {
        method: "POST"
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      dispatch({
        type: "CONNECTION_RESULT",
        status: data.connection.status
      });
    } catch (error) {
      const safe =
        typeof error === "object" && error !== null && "code" in error
          ? (error as ApiError)
          : {
              code: "ROUTENOTE_CONTROL_FAILED",
              message: "RouteNote control operation failed."
            };
      if (
        safe.code === "ROUTENOTE_SESSION_REQUIRED" ||
        safe.code === "ROUTENOTE_LOGIN_TIMEOUT"
      ) {
        dispatch({ type: "CONNECTION_RESULT", status: "LOGIN_REQUIRED" });
      } else {
        dispatch({ type: "FAILED", error: safe });
      }
    } finally {
      setBusy(null);
    }
  }

  async function prepareDraft() {
    if (!selected || !canPrepare) return;
    setBusy("prepare");
    dispatch({ type: "PREPARE_STARTED" });
    try {
      const response = await fetch("/api/distribution/routenote/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseId: selected.id })
      });
      const data = await responseJson(response);
      if (!response.ok || !data?.ok) throw readApiError(data);
      dispatch({
        type: "DRAFT_READY",
        draft: data.draft as RouteNoteDraftSummary
      });
    } catch (error) {
      const safe =
        typeof error === "object" && error !== null && "code" in error
          ? (error as ApiError)
          : {
              code: "ROUTENOTE_CONTROL_FAILED",
              message: "RouteNote draft preparation failed."
            };
      dispatch({ type: "FAILED", error: safe });
    } finally {
      setBusy(null);
    }
  }

  const connected = state.status === "CONNECTED" || state.status === "DRAFT_READY";

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="section-label mb-1">Distribution · RouteNote Free</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">
          RouteNote control
        </h1>
        <p className="text-[13px] text-ash/50 mt-1 max-w-2xl">
          Prepare a verified provider draft from SongForge. Final distribution remains a separate authorization step.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-ash/50">
              RouteNote account
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  connected
                    ? "bg-accent"
                    : state.status === "LOGIN_REQUIRED"
                      ? "bg-amber-400"
                      : "bg-slate-600"
                )}
              />
              <span className="text-[14px] font-medium text-bone">
                {loading ? "Checking…" : statusLabel(state.status)}
              </span>
            </div>
          </div>
          {state.hostAvailable ? (
            <span className="text-[10px] uppercase tracking-wider text-ash/40">
              Host ready
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-amber-400">
              Host unavailable
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void connectionAction("login")}
            disabled={busy !== null || !state.hostAvailable}
            className="min-h-12 rounded-xl border border-accent/30 bg-accent/10 px-3 text-[12px] font-medium text-accent disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy === "login" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlugZap className="h-4 w-4" />
            )}
            {busy === "login" ? "Waiting for sign-in" : "Connect RouteNote"}
          </button>
          <button
            type="button"
            onClick={() => void connectionAction("check")}
            disabled={busy !== null}
            className="min-h-12 rounded-xl border border-slate-700 bg-slate-900/70 px-3 text-[12px] font-medium text-bone disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", busy === "check" && "animate-spin")}
            />
            Check connection
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
        <div>
          <label
            htmlFor="routenote-release"
            className="text-[11px] uppercase tracking-[0.14em] text-ash/50"
          >
            Release
          </label>
          <select
            id="routenote-release"
            value={state.selectedReleaseId ?? ""}
            onChange={event =>
              dispatch({
                type: "RELEASE_SELECTED",
                releaseId: event.target.value
              })
            }
            className="mt-2 w-full min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[14px] text-bone outline-none focus:border-accent/60"
          >
            {state.releases.length === 0 ? (
              <option value="">No releases available</option>
            ) : null}
            {state.releases.map(release => (
              <option key={release.id} value={release.id}>
                {release.title} · {statusLabel(release.status)}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ash/50">
                Readiness
              </p>
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-medium",
                  selected.readiness.ready ? "text-accent" : "text-amber-400"
                )}
              >
                {selected.readiness.ready ? "RouteNote ready" : "Blocked"}
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
          onClick={() => void prepareDraft()}
          disabled={!canPrepare}
          className="w-full min-h-14 rounded-xl bg-accent text-void px-4 text-[13px] font-semibold tracking-wide disabled:bg-slate-800 disabled:text-ash/40 flex items-center justify-center gap-2"
        >
          {busy === "prepare" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {busy === "prepare" ? "Preparing RouteNote draft" : "Prepare RouteNote Draft"}
        </button>

        {!connected ? (
          <p className="text-[11px] text-ash/40 text-center">
            Connect RouteNote before preparing a draft.
          </p>
        ) : selected && !selected.readiness.ready ? (
          <p className="text-[11px] text-ash/40 text-center">
            Complete the blocked release evidence before preparing this draft.
          </p>
        ) : null}
      </section>

      {(state.status === "PREPARING" || state.draft || state.error) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center gap-2">
            {state.status === "DRAFT_READY" ? (
              <CheckCircle2 className="h-4 w-4 text-accent" />
            ) : state.status === "FAILED" ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            )}
            <p className="text-[12px] uppercase tracking-[0.14em] text-bone">
              {state.status === "DRAFT_READY"
                ? "DRAFT READY"
                : state.status === "FAILED"
                  ? "Stopped safely"
                  : "Preparing"}
            </p>
          </div>

          {state.status === "PREPARING" ? (
            <div className="space-y-1.5">
              {PENDING_STAGES.map((stage, index) => (
                <div key={stage} className="flex items-center gap-2 text-[12px] text-ash/50">
                  <span className="w-5 text-right text-[10px] text-ash/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {stage}
                </div>
              ))}
            </div>
          ) : null}

          {state.draft ? (
            <div className="space-y-2">
              {state.draft.completedSteps.map(step => (
                <div key={step} className="flex items-center gap-2 text-[12px] text-ash/70">
                  <Check className="h-3.5 w-3.5 text-accent" />
                  {STEP_LABELS[step] ?? statusLabel(step)}
                </div>
              ))}
              {state.draft.routeNoteReleaseUrl ? (
                <a
                  href={state.draft.routeNoteReleaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 min-h-12 rounded-xl border border-accent/30 bg-accent/10 px-4 text-[12px] font-medium text-accent flex items-center justify-center gap-2"
                >
                  Open RouteNote Draft
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          ) : null}

          {state.error ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[12px] font-medium text-amber-300">
                {state.error.message}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-ash/40">
                {state.error.code}
              </p>
            </div>
          ) : null}
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-ash/35 px-1">
        This surface stops at DRAFT READY. It does not accept RouteNote agreements or distribute the release.
      </p>
    </div>
  );
}
