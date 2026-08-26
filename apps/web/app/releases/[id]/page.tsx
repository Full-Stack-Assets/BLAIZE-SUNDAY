import { prisma } from "@songforge/database";
import { notFound } from "next/navigation";

import { ApprovalControls } from "../../../components/ApprovalControls";
import { ReleaseEvidenceControls } from "../../../components/ReleaseEvidenceControls";
import { StatusTimeline } from "../../../components/StatusTimeline";
import { releaseTruthLabel } from "../../../lib/release-view";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          metadata: true,
          rights: true,
          audioAssets: { orderBy: { createdAt: "desc" } },
          visualAssets: { orderBy: { createdAt: "desc" } }
        }
      },
      approvals: { orderBy: { requestedAt: "desc" } },
      actionPackages: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "asc" } },
      receipts: { orderBy: { createdAt: "asc" } },
      revisions: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!release) notFound();

  const latestPackage = release.actionPackages[0] ?? null;
  const approvedApproval = (release.approvals as any[]).find(
    (approval: any) => approval.status === "APPROVED" && approval.payloadHash === latestPackage?.payloadHash
  );
  const truth = releaseTruthLabel({
    status: release.status,
    verifiedPlatformUrl: release.verifiedPlatformUrl,
    externalConfirmationId: release.externalConfirmationId
  });

  return (
    <div className="space-y-4">
      <section className="card detail-hero">
        <div><p className="eyebrow">{release.releaseType} / {release.distributor ?? "provider unselected"}</p><h1>{release.title}</h1><p className="muted">Release ID <span className="hash">{release.id}</span></p></div>
        <div className="truth"><span className={`pill ${release.status === "LIVE" && release.verifiedPlatformUrl && release.externalConfirmationId ? "pill-green" : release.status === "FAILED" ? "pill-red" : "pill-amber"}`}>{truth}</span></div>
      </section>

      <section className="card section"><h2 className="section-title">Status timeline</h2><p className="muted small">Forward transitions require the evidence appropriate to that stage.</p><StatusTimeline status={release.status} /></section>

      <section className="grid grid-2 section">
        <div className="card"><p className="eyebrow">Master</p><p className="metric">{(release.project.audioAssets as any[]).some((asset: any) => asset.type === "MASTER" && asset.approved) ? "Approved" : "Missing"}</p><p className="muted small">Verification remains separate from generation metadata.</p></div>
        <div className="card"><p className="eyebrow">Rights</p><p className="metric">{release.project.rights?.approved && release.project.rights.ownershipConfirmed ? "Cleared" : "Open"}</p><p className="muted small">Ownership and provenance must both be confirmed.</p></div>
      </section>

      <section className="card section"><h2 className="section-title">Release action</h2><ReleaseEvidenceControls releaseId={release.id} status={release.status} actionPackageId={latestPackage?.id ?? null} approvedApprovalId={approvedApproval?.id ?? null} /></section>

      <section className="card section"><h2 className="section-title">Approvals</h2><p className="muted small">Each approval is bound to the exact canonical payload hash shown below.</p><div className="stack section">
        {(release.approvals as any[]).map((approval: any) => (
          <article className="card" key={approval.id}>
            <div className="row"><div><p className="eyebrow">{approval.actionType.replaceAll("_", " ")}</p><p className="hash">{approval.payloadHash}</p></div><span className={`pill ${approval.status === "APPROVED" ? "pill-green" : approval.status === "REJECTED" ? "pill-red" : "pill-amber"}`}>{approval.status.replaceAll("_", " ")}</span></div>
            <p className="muted small">Requested by {approval.requestedBy} · expires {approval.expiresAt.toISOString()}</p>
            {approval.status === "PENDING" ? <><hr className="divider" /><ApprovalControls approvalId={approval.id} payload={approval.payload} /></> : approval.resolutionNote ? <p className="notice">{approval.resolutionNote}</p> : null}
          </article>
        ))}
        {release.approvals.length === 0 ? <p className="empty">No approvals have been requested.</p> : null}
      </div></section>

      <section className="card section"><h2 className="section-title">Immutable event log</h2><div>
        {(release.events as any[]).map((event: any) => <article className="event" key={event.id}><time>{event.createdAt.toISOString()}</time><div><h3>{event.type.replaceAll("_", " ")}</h3><p className="muted small">{event.actor}{event.fromStatus || event.toStatus ? ` · ${event.fromStatus ?? "—"} → ${event.toStatus ?? "—"}` : ""}</p><pre>{JSON.stringify(event.evidence, null, 2)}</pre></div></article>)}
        {release.events.length === 0 ? <p className="empty">No release events recorded.</p> : null}
      </div></section>

      <section className="grid grid-2 section">
        <div className="card"><h2 className="section-title">External receipts</h2><p className="metric">{release.receipts.length}</p><p className="muted small">Provider evidence stored independently from internal decisions.</p></div>
        <div className="card"><h2 className="section-title">Revision queue</h2><p className="metric">{(release.revisions as any[]).filter((item: any) => item.status === "QUEUED").length}</p><p className="muted small">Structured instructions routed to the orchestrator.</p></div>
      </section>
    </div>
  );
}
