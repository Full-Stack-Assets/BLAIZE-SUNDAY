"use client";

import { useState } from "react";

export function ApprovalControls({
  approvalId,
  payload
}: {
  approvalId: string;
  payload: unknown;
}) {
  const [actor, setActor] = useState("");
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function decide(action: "approve" | "reject" | "request-revision") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/approvals/${approvalId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ actor, note, payload })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "APPROVAL_ACTION_FAILED");
      setMessage(`Recorded: ${result.approval.status}`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "APPROVAL_ACTION_FAILED");
    } finally {
      setPending(false);
    }
  }

  const credentialsReady = Boolean(actor.trim() && token.trim());
  return (
    <div className="stack">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`actor-${approvalId}`}>Approver identity</label>
          <input id={`actor-${approvalId}`} value={actor} onChange={event => setActor(event.target.value)} placeholder="Name or operator ID" />
        </div>
        <div className="field">
          <label htmlFor={`token-${approvalId}`}>Approval token</label>
          <input id={`token-${approvalId}`} type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="APPROVAL_API_TOKEN" />
        </div>
        <div className="field span-2">
          <label htmlFor={`note-${approvalId}`}>Revision / rejection note</label>
          <textarea id={`note-${approvalId}`} value={note} onChange={event => setNote(event.target.value)} placeholder="Required when rejecting or requesting revision." />
        </div>
      </div>
      <div className="button-row">
        <button className="button button-primary" disabled={!credentialsReady || pending} onClick={() => decide("approve")}>Approve exact payload</button>
        <button className="button" disabled={!credentialsReady || !note.trim() || pending} onClick={() => decide("request-revision")}>Request revision</button>
        <button className="button button-danger" disabled={!credentialsReady || !note.trim() || pending} onClick={() => decide("reject")}>Reject</button>
      </div>
      {message ? <p className={message.startsWith("Recorded") ? "success small" : "error small"}>{message}</p> : null}
    </div>
  );
}
