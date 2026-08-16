import { prisma } from "@songforge/database";
import Link from "next/link";

import { Shell } from "../../components/Shell";
import { releaseTruthLabel } from "../../lib/release-view";

export default async function ReleasesPage() {
  const releases = await prisma.release.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { workingTitle: true } },
      approvals: { where: { status: "PENDING" }, select: { id: true } }
    }
  });

  return (
    <Shell>
      <p className="eyebrow">Distribution honesty gate</p>
      <h1 className="display">Release Manager</h1>
      <p className="lede">A prepared package is not a submitted release. A submitted release is not live. Every state below is backed by an append-only event and, where required, external evidence.</p>

      <section className="stack section">
        {releases.map(release => {
          const truth = releaseTruthLabel({
            status: release.status,
            verifiedPlatformUrl: release.verifiedPlatformUrl,
            externalConfirmationId: release.externalConfirmationId
          });
          return (
            <Link className="card link-card" href={`/releases/${release.id}`} key={release.id}>
              <div className="row">
                <div>
                  <p className="eyebrow">{truth}</p>
                  <h2 className="release-title">{release.title || release.project.workingTitle || "Untitled release"}</h2>
                  <p className="muted small">{release.distributor ?? "Provider not selected"} · {release.approvals.length} pending approval{release.approvals.length === 1 ? "" : "s"}</p>
                </div>
                <span className={`pill ${release.status === "LIVE" ? "pill-green" : release.status === "FAILED" ? "pill-red" : "pill-amber"}`}>{release.status.replaceAll("_", " ")}</span>
              </div>
            </Link>
          );
        })}
        {releases.length === 0 ? <div className="card empty">No prepared releases yet.</div> : null}
      </section>
    </Shell>
  );
}
