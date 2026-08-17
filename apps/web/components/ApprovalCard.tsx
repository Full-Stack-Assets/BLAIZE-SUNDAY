"use client";

import { cn } from "@/lib/utils";
import type { ApprovalItem } from "@/lib/types";
import { Check, X, MessageSquareWarning, Shield } from "lucide-react";

const riskStyles = {
  LOW: "text-ash/60 border-slate-700",
  MODERATE: "text-accent border-accent/30",
  HIGH: "text-glitch-magenta border-glitch-magenta/30",
};

const statusStyles = {
  PENDING: "bg-slate-900 border-slate-700",
  APPROVED: "bg-accent/5 border-accent/20",
  REJECTED: "bg-glitch-magenta/5 border-glitch-magenta/20",
  NEEDS_CHANGES: "bg-glitch-cyan/5 border-glitch-cyan/20",
};

interface ApprovalCardProps {
  item: ApprovalItem;
  onAction: (id: string, status: ApprovalItem["status"]) => void;
}

export function ApprovalCard({ item, onAction }: ApprovalCardProps) {
  const isPending = item.status === "PENDING" || item.status === "NEEDS_CHANGES";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3 transition-all",
        statusStyles[item.status]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ash/50">
              {item.type.replace("_", " ")}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                riskStyles[item.risk]
              )}
            >
              {item.risk}
            </span>
          </div>
          <h3 className="text-[14px] font-medium text-bone tracking-tight leading-snug">
            {item.title}
          </h3>
          <p className="text-[12px] text-ash/55">{item.projectTitle}</p>
        </div>
        <div className="shrink-0 pt-0.5">
          <Shield className="w-4 h-4 text-ash/30" />
        </div>
      </div>

      <p className="text-[13px] text-ash/75 leading-relaxed">{item.summary}</p>

      {item.payloadPreview && (
        <div className="rounded-lg bg-void/60 border border-slate-800/80 px-3 py-2.5">
          <pre className="text-[12px] text-bone/80 lyric-surface whitespace-pre-wrap font-sans leading-relaxed">
            {item.payloadPreview}
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-ash/40">
        <span>Required by {item.requiredBy}</span>
        <span>
          {new Date(item.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {isPending && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onAction(item.id, "APPROVED")}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-accent text-void text-[13px] font-medium hover:bg-accent-soft active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Approve
          </button>
          <button
            onClick={() => onAction(item.id, "NEEDS_CHANGES")}
            className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-slate-700 text-ash/70 text-[13px] font-medium hover:border-glitch-cyan/40 hover:text-glitch-cyan active:scale-[0.98] transition-all"
          >
            <MessageSquareWarning className="w-4 h-4" />
            Changes
          </button>
          <button
            onClick={() => onAction(item.id, "REJECTED")}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-700 text-ash/50 hover:border-glitch-magenta/40 hover:text-glitch-magenta active:scale-[0.98] transition-all"
            title="Reject"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isPending && (
        <div
          className={cn(
            "text-[11px] font-medium uppercase tracking-wider pt-1",
            item.status === "APPROVED" && "text-accent",
            item.status === "REJECTED" && "text-glitch-magenta",
            item.status === "NEEDS_CHANGES" && "text-glitch-cyan"
          )}
        >
          {item.status.replace("_", " ")}
        </div>
      )}
    </div>
  );
}
