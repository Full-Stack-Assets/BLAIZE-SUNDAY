"use client";

import { useEffect, useState } from "react";

interface ApprovalRow {
  id: string;
  actionType: string;
  status: string;
  payloadHash: string;
  payload: unknown;
  requestedBy: string;
  project: { title: string | null };
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  function load() {
    fetch("/api/approvals")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "APPROVALS_UNAVAILABLE");
        setItems(data.approvals ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "APPROVALS_UNAVAILABLE"));
  }

  useEffect(() => {
    setToken(localStorage.getItem("songforge.operatorToken") || "");
    load();
  }, []);

  async function resolve(id: string, decision: "approve" | "reject" | "request-revision", payload: unknown) {
    const response = await fetch(`/api/approvals/${id}/${decision}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
        body: JSON.stringify({
        actor: "operator",
        payload,
        note: decision === "reject" ? "Rejected from queue" : "Revise package"
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "APPROVAL_FAILED");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Approvals</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">Payload-bound queue</h1>
      </div>
      {error ? <p className="text-[13px] text-glitch-magenta">{error}</p> : null}
      {items.length === 0 && !error ? <p className="text-ash/50 text-sm">No Prisma approvals.</p> : null}
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-800 p-4 space-y-2">
          <p className="text-[14px] text-bone">{item.actionType}</p>
          <p className="text-[11px] text-ash/50 font-mono break-all">{item.payloadHash}</p>
          <p className="text-[12px] text-ash/60">{item.project.title} · {item.status}</p>
          {item.status === "PENDING" ? (
            <div className="flex gap-2">
              <button className="h-9 px-3 rounded-lg bg-accent text-void text-[12px]" onClick={() => resolve(item.id, "approve", item.payload)}>Approve</button>
              <button className="h-9 px-3 rounded-lg border border-slate-700 text-[12px]" onClick={() => resolve(item.id, "request-revision", item.payload)}>Revision</button>
              <button className="h-9 px-3 rounded-lg border border-slate-700 text-[12px]" onClick={() => resolve(item.id, "reject", item.payload)}>Reject</button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
