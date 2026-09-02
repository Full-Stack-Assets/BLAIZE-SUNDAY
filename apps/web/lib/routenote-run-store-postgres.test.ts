import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@songforge/database";
import type { RouteNoteExecutionStep } from "@songforge/integrations";

import { PrismaRouteNoteRunStore } from "./routenote-run-store.server.ts";

const enabled = process.env.RUN_POSTGRES_TESTS === "1";

test("RouteNote run ledger is idempotent, durable, progress-aware and fail-closed after interruption", { skip: !enabled }, async () => {
  const artist = await prisma.artist.findFirst({ orderBy: { createdAt: "asc" } });
  const project = await prisma.songProject.findFirst({
    where: artist ? { artistId: artist.id } : undefined,
    orderBy: { createdAt: "asc" }
  });
  assert.ok(artist, "test seed must provide an artist");
  assert.ok(project, "test seed must provide a SongProject");

  const store = new PrismaRouteNoteRunStore();
  const idempotencyKey = `ci-routenote-${Date.now()}-${Math.random()}`;
  let runId: string | null = null;

  try {
    const input = {
      idempotencyKey,
      releaseId: "ci-release",
      releaseTitle: "CI RouteNote Draft",
      projectId: project.id,
      artistId: artist.id,
      actionPackageId: "ci-package",
      approvalId: "ci-approval",
      payloadHash: "c".repeat(64)
    };

    const first = await store.createOrGet(input);
    runId = first.id;
    const second = await store.createOrGet(input);
    assert.equal(second.id, first.id);
    assert.equal(first.status, "QUEUED");

    const claimed = await store.claimNextQueued();
    assert.equal(claimed?.id, first.id);
    assert.equal(claimed?.status, "RUNNING");

    const steps: RouteNoteExecutionStep[] = ["SESSION_VERIFIED", "DRAFT_RESOLVED"];
    await store.updateProgress(first.id, steps);
    const progressed = await store.get(first.id);
    assert.deepEqual(progressed?.completedSteps, steps);
    assert.equal(progressed?.currentStep, "DRAFT_RESOLVED");

    // Simulate a process restart before provider completion. Production must not
    // replay a potentially partial RouteNote draft automatically.
    const recovered = await store.recoverInterrupted();
    assert.ok(recovered >= 1);
    const blocked = await store.get(first.id);
    assert.equal(blocked?.status, "BLOCKED_OPERATOR_REVIEW");
    assert.equal(blocked?.errorCode, "ROUTENOTE_RUN_INTERRUPTED");

    const latest = await store.latestForRelease("ci-release");
    assert.equal(latest?.id, first.id);
  } finally {
    if (runId) {
      await prisma.workflowRun.delete({ where: { id: runId } }).catch(() => undefined);
    }
  }
});
