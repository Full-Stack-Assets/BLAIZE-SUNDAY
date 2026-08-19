import assert from "node:assert/strict";
import test from "node:test";

test("persist suite runs against Postgres when DATABASE_URL is reachable", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL unset");
    return;
  }

  const { prisma } = await import("@songforge/database");
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip("postgres unavailable");
    await prisma.$disconnect();
    return;
  }

  await prisma.artist.upsert({
    where: { slug: "blaize-sunday" },
    update: {},
    create: {
      slug: "blaize-sunday",
      name: "BLAIZE SUNDAY",
      status: "ACTIVE",
      canonVersion: "BLAIZE_CANON_v4.0"
    }
  });

  const { executeCreateNextRelease, markWorkflowEnqueued, queueCreateNextRelease } = await import(
    "./persist.ts"
  );
  const key = `test-${Date.now()}`;
  const first = await executeCreateNextRelease({ actor: "test", idempotencyKey: key });
  const second = await executeCreateNextRelease({ actor: "test", idempotencyKey: key });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.workflow.id, second.workflow.id);
  assert.ok(first.workflow.projectId);
  assert.equal(first.workflow.status, "BLOCKED");

  const queueKey = `queue-test-${Date.now()}`;
  const reserved = await queueCreateNextRelease({ actor: "test", idempotencyKey: queueKey });
  assert.equal(reserved.created, true);
  assert.equal(reserved.workflow.status, "QUEUED");
  assert.equal(reserved.workflow.queue, "BULLMQ_PENDING");

  const enqueued = await markWorkflowEnqueued(reserved.workflow.id);
  assert.equal(enqueued.queue, "BULLMQ");

  await prisma.$disconnect();
});
