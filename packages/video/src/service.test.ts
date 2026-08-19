import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryVideoRunRepository } from "./repository.ts";
import { VideoRunService } from "./service.ts";

const briefInput = {
  title: "Why Galaxies Form the Cosmic Web",
  topic: "Why galaxies form the cosmic web",
  audience: "curious adults",
  tone: "clear, cinematic, scientifically accurate",
  targetDurationSeconds: 60,
  requiredCoverage: [
    "primordial density fluctuations",
    "dark matter",
    "filaments",
    "nodes",
    "voids"
  ],
  visualRequirements: ["dark space", "cyan/gold accents"]
};

test("root run waits for connector-mediated Wisebase execution", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);

  const run = await service.createRoot(briefInput);

  assert.equal(run.status, "AWAITING_EXTERNAL_EXECUTION");
  assert.equal(run.provider, "WISEBASE");
  assert.equal(run.connectorMode, "CONNECTOR_MEDIATED");
  assert.equal(run.version, 1);
  assert.equal(run.parentRunId, null);
});

test("external task attachment moves a run to pending", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  const pending = await service.attachExternalTask(run.id, "task-123");

  assert.equal(pending.status, "PENDING");
  assert.equal(pending.externalTaskId, "task-123");
});

test("successful Wisebase completion stops at captions required", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);
  await service.attachExternalTask(run.id, "task-123");

  const completed = await service.recordExternalResult(run.id, {
    status: "completed",
    videoUrl: "https://example.test/video.mp4",
    metrics: { total_duration: 60 },
    error: { final_error: null }
  });

  assert.equal(completed.status, "CAPTIONS_REQUIRED");
  assert.equal(completed.videoUrl, "https://example.test/video.mp4");
  assert.notEqual(completed.status, "VERIFIED");
});

test("provider error fails the run", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  const failed = await service.recordExternalResult(run.id, {
    status: "completed",
    videoUrl: "https://example.test/video.mp4",
    metrics: null,
    error: { final_error: "render failed" }
  });

  assert.equal(failed.status, "FAILED");
});

test("completed result without a video URL fails closed", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  const failed = await service.recordExternalResult(run.id, {
    status: "completed",
    videoUrl: null,
    metrics: null,
    error: { final_error: null }
  });

  assert.equal(failed.status, "FAILED");
});

test("controlled mutation creates a child version in the same lineage", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const root = await service.createRoot(briefInput);

  const child = await service.createMutation(root.id, "MORE_EXPLANATORY");

  assert.equal(child.parentRunId, root.id);
  assert.equal(child.lineageKey, root.lineageKey);
  assert.equal(child.version, 2);
  assert.equal(child.mutation, "MORE_EXPLANATORY");
  assert.equal(child.status, "AWAITING_EXTERNAL_EXECUTION");
  assert.deepEqual(
    (child.brief as typeof briefInput).requiredCoverage,
    (root.brief as typeof briefInput).requiredCoverage
  );
});
