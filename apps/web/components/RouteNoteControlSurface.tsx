"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";

import { RouteNoteControlPanel } from "@/components/RouteNoteControlPanel";

type AuthorityState = "CHECKING" | "LOCKED" | "READY" | "NOT_CONFIGURED";

type ApiError = {
  code: string;
  message: string;
};

async function safeJson(response: Response): Promise<any> {
  return response.json().catch(() => ({
    ok: false,
    error: {
      code: "ROUTENOTE_CONTROL_FAILED",
      message: "RouteNote control operation failed."
    }
  }));
}

function apiError(data: any): ApiError {
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

export function RouteNoteControlSurface() {
  const [authority, setAuthority] = useState<AuthorityState>("CHECKING");
  const [passphrase, setPassphrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function checkAuthority() {
    setAuthority("CHECKING");
    setError(null);
    try {
      const response = await fetch("/api/distribution/routenote", {
        cache: "no-store"
      });
      const data = await safeJson(response);
      if (response.ok && data?.ok) {
        setAuthority("READY");
        return;
      }

      const safe = apiError(data);
      if (safe.code === "ROUTENOTE_CONTROL_LOCKED") {
        setAuthority("LOCKED");
        return;
      }
      if (safe.code === "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED") {
        setAuthority("NOT_CONFIGURED");
        setError(safe);
        return;
      }

      // A normal provider/runtime error proves the owner authority middleware was
      // passed; keep the control panel available so it can show the safe error.
      setAuthority("READY");
    } catch {
      setAuthority("LOCKED");
      setError({
        code: "ROUTENOTE_CONTROL_AUTH_CHECK_FAILED",
        message: "SongForge could not verify RouteNote owner authority."
      });
    }
  }

  useEffect(() => {
    void checkAuthority();
  }, []);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passphrase.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/distribution/routenote/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase })
      });
      const data = await safeJson(response);
      if (!response.ok || !data?.ok) {
        const safe = apiError(data);
        if (safe.code === "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED") {
          setAuthority("NOT_CONFIGURED");
        }
        setError(safe);
        return;
      }

      setPassphrase("");
      setAuthority("READY");
    } catch {
      setError({
        code: "ROUTENOTE_CONTROL_FAILED",
        message: "RouteNote control authorization failed."
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (authority === "READY") {
    return <RouteNoteControlPanel />;
  }

  if (authority === "CHECKING") {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[12px] text-ash/50">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Checking RouteNote control authority…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-lg mx-auto pt-4">
      <div>
        <p className="section-label mb-1">Distribution · RouteNote Free</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">
          RouteNote controls locked
        </h1>
        <p className="text-[13px] text-ash/50 mt-1">
          This gate protects browser-control and provider-draft actions on the SongForge host.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-accent/20 bg-accent/10 p-2">
            {authority === "NOT_CONFIGURED" ? (
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            ) : (
              <KeyRound className="h-4 w-4 text-accent" />
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-bone">Owner authorization</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ash/45">
              {authority === "NOT_CONFIGURED"
                ? "Owner authorization must be configured on this production host before RouteNote controls can be used."
                : "Enter the SongForge RouteNote control passphrase. This is separate from your RouteNote account password."}
            </p>
          </div>
        </div>

        {authority === "LOCKED" ? (
          <form onSubmit={unlock} className="space-y-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ash/50">
                Control passphrase
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={passphrase}
                onChange={event => setPassphrase(event.target.value)}
                className="mt-2 w-full min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[14px] text-bone outline-none focus:border-accent/60"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || !passphrase.trim()}
              className="w-full min-h-12 rounded-xl bg-accent px-4 text-[12px] font-semibold text-void disabled:bg-slate-800 disabled:text-ash/40 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {submitting ? "Unlocking" : "Unlock RouteNote Controls"}
            </button>
          </form>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[12px] text-amber-300">{error.message}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-ash/40">
              {error.code}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
