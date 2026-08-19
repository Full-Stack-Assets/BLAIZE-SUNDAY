"use client";

import { useEffect, useState } from "react";
import { resetLocalState } from "@/lib/persistence";

interface Health {
  database?: string;
  auth?: { approvalTokenConfigured?: boolean };
  llm?: { serverKeyConfigured?: boolean };
  integrations?: { id: string; status: string }[];
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("songforge.operatorToken") || "");
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">System</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">Settings</h1>
      </div>
      <div className="rounded-2xl border border-slate-800 divide-y divide-slate-800/80">
        <Row label="Artist identity" value="BLAIZE SUNDAY" />
        <Row label="Database" value={health?.database ?? "unknown"} />
        <Row
          label="Approval token"
          value={health?.auth?.approvalTokenConfigured ? "configured" : "UNCONFIGURED"}
        />
        <Row
          label="LLM server key"
          value={health?.llm?.serverKeyConfigured ? "configured" : "UNCONFIGURED"}
        />
      </div>
      <div className="rounded-2xl border border-slate-800 p-4 space-y-2">
        <p className="text-sm text-bone">Operator token</p>
        <p className="text-[12px] text-ash/50">Used for CREATE NEXT RELEASE and I4 actions. Stored in this browser only.</p>
        <input
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setSaved(false);
          }}
          className="w-full bg-void border border-slate-800 rounded-lg px-3 py-2.5 text-[14px]"
        />
        <button
          className="h-9 px-4 rounded-lg bg-accent text-void text-[12px]"
          onClick={() => {
            localStorage.setItem("songforge.operatorToken", token.trim());
            setSaved(true);
          }}
        >
          {saved ? "Saved" : "Save token"}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-800 p-4 space-y-2">
        <p className="text-sm text-bone">Integrations</p>
        {(health?.integrations ?? []).map((item) => (
          <div key={item.id} className="flex justify-between text-[12px] text-ash/70">
            <span>{item.id}</span>
            <span>{item.status}</span>
          </div>
        ))}
      </div>
      <button
        className="text-[12px] text-ash/50"
        onClick={() => {
          resetLocalState();
          window.location.href = "/";
        }}
      >
        Reset local Lab drafts (does not touch Postgres)
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between">
      <span className="text-sm text-bone">{label}</span>
      <span className="text-[12px] text-ash/50">{value}</span>
    </div>
  );
}
