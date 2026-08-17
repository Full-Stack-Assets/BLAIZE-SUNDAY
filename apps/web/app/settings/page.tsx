"use client";

import { useState, useEffect } from "react";
import { resetLocalState } from "@/lib/persistence";
import { cn } from "@/lib/utils";

const LLM_KEY_STORAGE = "songforge.llmKey";

export default function SettingsPage() {
  const [llmKey, setLlmKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(LLM_KEY_STORAGE) || "";
    setLlmKey(stored);
    setKeySaved(Boolean(stored));
  }, []);

  const saveKey = () => {
    if (typeof window === "undefined") return;
    const trimmed = llmKey.trim();
    if (trimmed) {
      localStorage.setItem(LLM_KEY_STORAGE, trimmed);
      setKeySaved(true);
    } else {
      localStorage.removeItem(LLM_KEY_STORAGE);
      setKeySaved(false);
    }
  };

  const clearKey = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LLM_KEY_STORAGE);
    setLlmKey("");
    setKeySaved(false);
  };

  const handleReset = () => {
    resetLocalState();
    setConfirmReset(false);
    setResetDone(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">System</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">Settings</h1>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <span className="text-sm text-bone">Artist identity</span>
          <span className="text-[12px] text-ash/50">BLAIZE SUNDAY</span>
        </div>
        <div className="px-4 py-3.5 flex items-center justify-between">
          <span className="text-sm text-bone">Approval gates</span>
          <span className="text-[12px] text-accent">Active</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <div>
          <p className="text-sm text-bone">LLM key (local only)</p>
          <p className="text-[12px] text-ash/50 mt-0.5">
            Optional. Enables remote forge via /api/forge. Stored only in this browser.
          </p>
        </div>
        <input
          type="password"
          value={llmKey}
          onChange={(e) => {
            setLlmKey(e.target.value);
            setKeySaved(false);
          }}
          placeholder="sk-… or provider key"
          className="w-full bg-void border border-slate-800 rounded-lg px-3 py-2.5 text-[14px] text-bone placeholder:text-ash/30 focus:outline-none focus:border-accent/40"
          style={{ fontSize: "16px" }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex gap-2">
          <button
            onClick={saveKey}
            className={cn(
              "h-9 px-4 rounded-lg text-[12px] font-medium transition-colors",
              keySaved
                ? "bg-slate-800 text-ash/60"
                : "bg-accent text-void hover:bg-accent-soft"
            )}
          >
            {keySaved ? "Saved" : "Save key"}
          </button>
          {keySaved && (
            <button
              onClick={clearKey}
              className="h-9 px-3 rounded-lg text-[12px] text-ash/50 hover:text-glitch-magenta border border-slate-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <div>
          <p className="text-sm text-bone">Local data</p>
          <p className="text-[12px] text-ash/50 mt-0.5">
            Wipe projects, versions, approvals, agent runs, and local LLM key.
          </p>
        </div>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="h-9 px-4 rounded-lg text-[12px] font-medium border border-slate-700 text-ash/70 hover:border-glitch-magenta/40 hover:text-glitch-magenta"
          >
            Reset local state
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-glitch-magenta">This cannot be undone.</span>
            <button
              onClick={handleReset}
              className="h-9 px-4 rounded-lg text-[12px] font-medium bg-glitch-magenta text-void"
            >
              Confirm reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="h-9 px-3 rounded-lg text-[12px] text-ash/50"
            >
              Cancel
            </button>
          </div>
        )}
        {resetDone && (
          <p className="text-[12px] text-accent">Reset complete. Reloading…</p>
        )}
      </div>
    </div>
  );
}
