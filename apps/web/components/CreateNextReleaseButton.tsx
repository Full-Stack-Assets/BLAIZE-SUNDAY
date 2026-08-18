"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateNextReleaseButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setPending(true);
    setMessage("");
    const token =
      typeof window !== "undefined" ? localStorage.getItem("songforge.operatorToken") || "" : "";
    try {
      const response = await fetch("/api/artists/blaize/create-next-release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ actor: "operator" })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "CREATE_FAILED");
      setMessage(`Queued ${result.projectId}`);
      router.push(`/projects`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CREATE_FAILED");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={pending}
        className="h-10 px-4 rounded-xl bg-accent text-void text-[13px] font-medium disabled:opacity-40"
      >
        {pending ? "Queuing…" : "CREATE NEXT RELEASE"}
      </button>
      {message ? <p className="text-[12px] text-ash/60">{message}</p> : null}
    </div>
  );
}
