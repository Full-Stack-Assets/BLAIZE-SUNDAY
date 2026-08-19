"use client";

import { useState } from "react";

export function ReleaseEvidenceControls({
  releaseId,
  status,
  actionPackageId,
  approvedApprovalId
}: {
  releaseId: string;
  status: string;
  actionPackageId: string | null;
  approvedApprovalId: string | null;
}) {
  const [provider, setProvider] = useState("");
  const [actor, setActor] = useState("");
  const [token, setToken] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const operation =
    status === "PREPARED"
      ? { endpoint: "prepare-distribution", label: "Prepare authorization payload" }
      : status === "AWAITING_AUTHORIZATION"
        ? { endpoint: "submit", label: "Record verified submission" }
        : status === "SUBMITTED"
          ? { endpoint: "mark-accepted", label: "Record provider acceptance" }
          : status === "ACCEPTED"
            ? { endpoint: "mark-scheduled", label: "Record provider schedule" }
            : status === "SCHEDULED"
              ? { endpoint: "mark-live", label: "Verify release live" }
              : null;

  async function run() {
    if (!operation) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/releases/${releaseId}/${operation.endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actor: actor || "distribution_agent",
          provider,
          actionPackageId,
          approvalId: approvedApprovalId,
          externalConfirmationId: confirmation,
          verifiedPlatformUrl: platformUrl,
          scheduledReleaseDate: scheduleDate,
          rawReceipt: { recordedVia: "songforge-release-manager" }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "RELEASE_ACTION_FAILED");
      setMessage("Evidence recorded successfully.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "RELEASE_ACTION_FAILED");
    } finally {
      setPending(false);
    }
  }

  if (!operation) {
    return <p className="muted small">No manual state action is available from {status}.</p>;
  }

  const waitingWithoutApproval =
    status === "AWAITING_AUTHORIZATION" && (!actionPackageId || !approvedApprovalId);
  const credentialsReady = Boolean(actor.trim() && token.trim());
  const confirmationReady = status === "PREPARED" || Boolean(confirmation.trim());
  const extraReady =
    status === "ACCEPTED" ? Boolean(scheduleDate) : status === "SCHEDULED" ? Boolean(platformUrl.trim()) : true;

  return (
    <div className="stack">
      <p className="notice">
        {status === "PREPARED"
          ? "Preparation creates a payload hash and approval request. It performs no external action."
          : "This records evidence returned by an external provider. It does not call or simulate the provider."}
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="provider">Provider</label>
          <input id="provider" value={provider} onChange={event => setProvider(event.target.value)} placeholder="Distributor or platform" />
        </div>
        <div className="field">
          <label htmlFor="operator">Operator</label>
          <input id="operator" value={actor} onChange={event => setActor(event.target.value)} placeholder="Operator identity" />
        </div>
        <div className="field">
          <label htmlFor="evidence-token">Approval token</label>
          <input id="evidence-token" type="password" value={token} onChange={event => setToken(event.target.value)} />
        </div>
        {status !== "PREPARED" ? (
          <div className="field">
            <label htmlFor="confirmation">External confirmation ID</label>
            <input id="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          </div>
        ) : null}
        {status === "ACCEPTED" ? (
          <div className="field span-2">
            <label htmlFor="schedule">Scheduled release date</label>
            <input id="schedule" type="datetime-local" value={scheduleDate} onChange={event => setScheduleDate(event.target.value)} />
          </div>
        ) : null}
        {status === "SCHEDULED" ? (
          <div className="field span-2">
            <label htmlFor="platform-url">Verified HTTPS platform URL</label>
            <input id="platform-url" type="url" value={platformUrl} onChange={event => setPlatformUrl(event.target.value)} placeholder="https://..." />
          </div>
        ) : null}
      </div>
      {waitingWithoutApproval ? <p className="error small">A matching approved payload is required before submission evidence can be recorded.</p> : null}
      <div className="button-row">
        <button className="button button-primary" onClick={run} disabled={pending || !provider.trim() || !credentialsReady || !confirmationReady || !extraReady || waitingWithoutApproval}>{operation.label}</button>
      </div>
      {message ? <p className={message.startsWith("Evidence") ? "success small" : "error small"}>{message}</p> : null}
    </div>
  );
}
