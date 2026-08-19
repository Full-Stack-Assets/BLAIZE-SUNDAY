import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateVideoQc } from "./qc.ts";
import { InMemoryVideoRunRepository, type CaptionRecord, type VideoRunRecord } from "./repository.ts";
import { VideoRunService } from "./service.ts";

const briefInput = {
  title: "Why Galaxies Form the Cosmic Web",
  topic: "Why galaxies form the cosmic web",
  audience: "curious adults",
  tone: "clear, cinematic, scientifically accurate",
  targetDurationSeconds: 60,
  requiredCoverage: ["dark matter", "filaments", "nodes", "voids"],
  visualRequirements: ["dark space", "cyan/gold accents"]
};

function fixtureRun(overrides: Partial<VideoRunRecord> = {}): VideoRunRecord {
  return {
    id: "fixture-001-wisebase",
    lineageKey: "fixture-001-wisebase",
    version: 1,
    parentRunId: null,
    title: "Why Galaxies Form the Cosmic Web",
    topic: "Why galaxies form the cosmic web",
    provider: "WISEBASE",
    connectorMode: "CONNECTOR_MEDIATED",
    mutation: "ROOT",
    brief: { requiredCoverage: ["dark matter", "filaments", "nodes", "voids"] },
    briefHash: "fixture-001",
    compiledConcept: "Why galaxies form the cosmic web",
    compiledExplanation: "historical fixture",
    promptHash: "fixture-001",
    targetDurationSeconds: 60,
    durationTolerancePercent: 15,
    status: "GENERATED",
    externalTaskId: "8008938a45804a02946a31b9c0d9bb62",
    externalStatus: "completed",
    videoUrl: "https://example.test/fixture-001.mp4",
    providerMetrics: { totalDuration: 42.39 },
    providerError: { final_error: null },
    durationSeconds: 34,
    width: 854,
    height: 480,
    fps: 15,
    captionStatus: "MISSING",
    qc: null,
    completedAt: null,
    ...overrides
  };
}

function captions(runId: string): CaptionRecord[] {
  return [
    {
      id: "cap-1",
      runId,
      version: 1,
      locale: "en",
      source: "MANUAL_IMPORT",
      format: "srt",
      content: "captions",
      contentHash: "cap-hash",
      cueCount: 4,
      startSeconds: 0,
      endSeconds: 59,
      sourceMediaHash: null
    }
  ];
}

test("fixture 001 fails its known technical gates and cannot verify without captions", () => {
  const run = fixtureRun();
  const receipt = evaluateVideoQc({
    run,
    captions: [],
    transcript: "dark matter filaments nodes voids",
    technicalMetadata: {
      durationSeconds: 34,
      width: 854,
      height: 480,
      fps: 15
    }
  });

  assert.ok(receipt.failures.includes("FAIL_DURATION"));
  assert.ok(receipt.failures.includes("FAIL_RESOLUTION"));
  assert.ok(receipt.failures.includes("FAIL_FPS"));
  assert.ok(receipt.failures.includes("FAIL_CAPTIONS"));
  assert.equal(receipt.verified, false);
});

test("fixture 002 seed does not invent artifact duration, resolution, or fps", async () => {
  const seed = await readFile(new URL("../../database/src/seed.ts", import.meta.url), "utf8");
  const marker = 'id: "fixture-002-wisebase-causal"';
  const start = seed.indexOf(marker);
  assert.ok(start >= 0, "fixture 002 seed must exist");
  const end = seed.indexOf("\n    }\n  });", start);
  assert.ok(end > start, "fixture 002 seed block must terminate");
  const block = seed.slice(start, end);

  assert.doesNotMatch(block, /durationSeconds\s*:/);
  assert.doesNotMatch(block, /\bwidth\s*:/);
  assert.doesNotMatch(block, /\bheight\s*:/);
  assert.doesNotMatch(block, /\bfps\s*:/);
  assert.match(block, /totalDuration:\s*60\.88/);
});

test("provider completion never promotes a run directly to verified", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const root = await service.createRoot(briefInput);
  const completed = await service.recordExternalResult(root.id, {
    status: "completed",
    videoUrl: "https://example.test/video.mp4",
    metrics: { totalDuration: 60.88 },
    error: { final_error: null }
  });

  assert.equal(completed.status, "CAPTIONS_REQUIRED");
  assert.notEqual(completed.status, "VERIFIED");
});

test("valid 720p 24fps output with captions and causal coverage can verify", () => {
  const run = fixtureRun({
    id: "valid-run",
    lineageKey: "valid-run",
    durationSeconds: 60,
    width: 1280,
    height: 720,
    fps: 24,
    captionStatus: "AVAILABLE"
  });
  const receipt = evaluateVideoQc({
    run,
    captions: captions(run.id),
    transcript: "Dark matter forms the scaffold. Galaxies trace filaments and nodes around voids.",
    technicalMetadata: { durationSeconds: 60, width: 1280, height: 720, fps: 24 },
    staticEndingRisk: false
  });

  assert.equal(receipt.verified, true);
  assert.deepEqual(receipt.failures, []);
  assert.deepEqual(receipt.unresolved, []);
});

test("all five mutations create children while preserving the parent run", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const parent = await service.createRoot(briefInput);
  const before = structuredClone(parent);
  const mutations = [
    "REGENERATE",
    "MORE_CINEMATIC",
    "MORE_EXPLANATORY",
    "SHORTER",
    "LONGER"
  ] as const;

  for (const mutation of mutations) {
    const child = await service.createMutation(parent.id, mutation);
    assert.equal(child.parentRunId, parent.id);
    assert.equal(child.lineageKey, parent.lineageKey);
    assert.equal(child.mutation, mutation);
    assert.equal(child.status, "AWAITING_EXTERNAL_EXECUTION");
  }

  assert.deepEqual(await repo.get(parent.id), before);
});
