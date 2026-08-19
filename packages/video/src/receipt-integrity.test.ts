import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryVideoRunRepository } from "./repository.ts";
import { VideoRunService } from "./service.ts";

const briefInput = {
  title: "Receipt integrity fixture",
  topic: "Receipt integrity",
  audience: "curious adults",
  tone: "clear",
  targetDurationSeconds: 60,
  requiredCoverage: ["dark matter"],
  visualRequirements: ["dark space"]
};

test("provider result requires an external task receipt at the service boundary", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  await assert.rejects(
    service.recordExternalResult(run.id, {
      status: "completed",
      videoUrl: "https://example.test/video.mp4",
      error: { final_error: null }
    }),
    /EXTERNAL_TASK_RECEIPT_REQUIRED/
  );
});

test("external task receipt cannot be replaced with a different task id", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);
  await service.attachExternalTask(run.id, "task-123");

  await assert.rejects(
    service.attachExternalTask(run.id, "task-456"),
    /EXTERNAL_TASK_RECEIPT_IMMUTABLE/
  );

  const stored = await repo.get(run.id);
  assert.equal(stored?.externalTaskId, "task-123");
});

test("reattaching the same external task receipt is idempotent", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);
  const first = await service.attachExternalTask(run.id, "task-123");
  const second = await service.attachExternalTask(run.id, "task-123");

  assert.deepEqual(second, first);
});

test("terminal provider result receipt cannot be replaced", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);
  await service.attachExternalTask(run.id, "task-123");
  const first = await service.recordExternalResult(run.id, {
    status: "completed",
    videoUrl: "https://example.test/first.mp4",
    metrics: { total_duration: 42 },
    error: { final_error: null }
  });

  await assert.rejects(
    service.recordExternalResult(run.id, {
      status: "completed",
      videoUrl: "https://example.test/replacement.mp4",
      metrics: { total_duration: 43 },
      error: { final_error: null }
    }),
    /EXTERNAL_RESULT_RECEIPT_IMMUTABLE/
  );

  const stored = await repo.get(run.id);
  assert.equal(stored?.videoUrl, first.videoUrl);
  assert.deepEqual(stored?.providerMetrics, first.providerMetrics);
});

test("QC cannot rewrite lifecycle state before provider completion", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  await assert.rejects(
    service.runQc(run.id, {
      transcript: "dark matter",
      technicalMetadata: {
        durationSeconds: 60,
        width: 1280,
        height: 720,
        fps: 24
      }
    }),
    /QC_NOT_READY/
  );

  const stored = await repo.get(run.id);
  assert.equal(stored?.status, "AWAITING_EXTERNAL_EXECUTION");
});
