"use client";

import { useState, useEffect } from "react";
import { ApprovalCard } from "@/components/ApprovalCard";
import {
  getApprovals,
  updateApproval,
  applyApprovalToProject,
} from "@/lib/persistence";
import type { ApprovalItem } from "@/lib/types";

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    setItems(getApprovals());
  }, []);

  const handleAction = (id: string, status: ApprovalItem["status"]) => {
    const next = updateApproval(id, status);
    setItems(next);

    // When approved, push the decision into the project + release state machine
    if (status === "APPROVED") {
      const item = next.find((i) => i.id === id);
      if (item) applyApprovalToProject(item);
    }
  };

  const pending = items.filter(
    (i) => i.status === "PENDING" || i.status === "NEEDS_CHANGES"
  );
  const resolved = items.filter(
    (i) => i.status === "APPROVED" || i.status === "REJECTED"
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Approvals</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">
          Decision queue
        </h1>
        <p className="text-[13px] text-ash/50 mt-1">
          One gate at a time. Nothing moves without a clear yes or no.
        </p>
      </div>

      {pending.length === 0 && resolved.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <p className="text-ash/50 text-sm">Queue is empty.</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="section-label">Needs decision</p>
          {pending.map((item) => (
            <ApprovalCard key={item.id} item={item} onAction={handleAction} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="section-label">Resolved</p>
          {resolved.map((item) => (
            <ApprovalCard key={item.id} item={item} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
