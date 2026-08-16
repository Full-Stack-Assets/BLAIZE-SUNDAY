import { prisma } from "@songforge/database";
import Link from "next/link";

import { Shell } from "../components/Shell";

export default async function HomePage() {
  const [projects, releases, approvals] = await Promise.all([
    prisma.songProject.count(),
    prisma.release.count(),
    prisma.approval.count({ where: { status: "PENDING" } })
  ]);

  return (
    <Shell>
      <p className="eyebrow">BLAIZE SUNDAY / supervised autonomy</p>
      <h1 className="display">The artist operation behind the immaculate malfunction.</h1>
      <p className="lede">Songforge can decide, create, validate, and prepare. External publishing, rights changes, spend, and platform actions stop at a payload-bound human authorization gate.</p>

      <section className="grid grid-3 section" aria-label="System metrics">
        <div className="card"><span className="eyebrow">Projects</span><p className="metric">{projects}</p><p className="muted small">Creative systems in the catalog</p></div>
        <div className="card"><span className="eyebrow">Releases</span><p className="metric">{releases}</p><p className="muted small">Prepared and externally evidenced states</p></div>
        <div className="card"><span className="eyebrow">Approvals</span><p className="metric">{approvals}</p><p className="muted small">Pending human decisions</p></div>
      </section>

      <section className="grid grid-2 section">
        <Link className="card link-card" href="/releases"><p className="eyebrow">Release command</p><h2 className="section-title">Open Release Manager →</h2><p className="muted">Inspect exact payload hashes, approve or revise them, and record provider evidence without overstating what happened.</p></Link>
        <Link className="card link-card" href="/projects"><p className="eyebrow">Creative memory</p><h2 className="section-title">Browse projects →</h2><p className="muted">Strategy, concepts, lyrics, compositions, assets, and agent decisions remain linked to canon and provenance.</p></Link>
      </section>
    </Shell>
  );
}
