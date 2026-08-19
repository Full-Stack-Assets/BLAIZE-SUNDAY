import test from "node:test";
import assert from "node:assert/strict";
import { evaluateVideoQc } from "./qc.ts";
import type { CaptionRecord, VideoRunRecord } from "./repository.ts";

function run(overrides: Partial<VideoRunRecord> = {}): VideoRunRecord {
  return {
    id: "run-1",
    lineageKey: "lineage-1",
    version: 1,
    parentRunId: null,
    title: "Why Galaxies Form the Cosmic Web",
    topic: "Why galaxies form the cosmic web",
    provider: "WISEBASE",
    connectorMode: "CONNECTOR_MEDIATED",
    mutation: "ROOT",
    brief: {
      requiredCoverage: ["dark matter", "filaments", "nodes", "voids"]
    },
    briefHash: "brief",
    compiledConcept: "Why Galaxies Form the Cosmic Web",
    compiledExplanation: "explain",
    promptHash: "prompt",
    targetDurationSeconds: 60,
    durationTolerancePercent: 15,
    status: "CAPTIONS_REQUIRED",
    externalTaskId: "task-1",
    externalStatus: "completed",
    videoUrl: "https://example.test/video.mp4",
    providerMetrics: null,
    providerError: { final_error: null },
    durationSeconds: null,
    width: null,
    height: null,
    fps: null,
    captionStatus: "MISSING",
    qc: null,
    completedAt: null,
    ...overrides
  };
}

function caption(overrides: Partial<CaptionRecord> = {}): CaptionRecord {
  return {
    id: "caption-1",
    runId: "run-1",
    version: 1,
    locale: "en",
    source: "MANUAL_IMPORT",
    format: "srt",
    content: "captions",
    contentHash: "caption-hash",
    cueCount: 4,
    startSeconds: 0,
    endSeconds: 59,
    sourceMediaHash: null,
    ...overrides
  };
}

test("fixture 001 fails known duration, resolution, fps, and caption gates", () => {
  const receipt = evaluateVideoQc({
    run: run({
      id: "fixture-001-wisebase",
      videoUrl: "https://example.test/fixture.mp4"
    }),
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

test("beautiful output cannot verify when causal coverage is missing", () => {
  const receipt = evaluateVideoQc({
    run: run(),
    captions: [caption()],
    transcript: "A beautiful fly-through of galaxies in deep space.",
    technicalMetadata: {
      durationSeconds: 60,
      width: 1280,
      height: 720,
      fps: 24
    }
  });
  assert.ok(receipt.failures.includes("FAIL_COVERAGE:dark matter"));
  assert.equal(receipt.verified, false);
});

test("absence of transcript or technical metadata remains unresolved, never pass", () => {
  const receipt = evaluateVideoQc({ run: run(), captions: [caption()] });
  assert.ok(receipt.unresolved.includes("UNKNOWN_COVERAGE"));
  assert.ok(receipt.unresolved.includes("TECHNICAL_METADATA_UNAVAILABLE"));
  assert.equal(receipt.verified, false);
});

test("valid technical output, captions, and causal coverage can verify", () => {
  const receipt = evaluateVideoQc({
    run: run(),
    captions: [caption()],
    transcript: "Dark matter forms the scaffolding. Galaxies trace filaments and nodes around cosmic voids.",
    technicalMetadata: {
      durationSeconds: 60,
      width: 1280,
      height: 720,
      fps: 24
    },
    staticEndingRisk: false
  });
  assert.deepEqual(receipt.failures, []);
  assert.deepEqual(receipt.unresolved, []);
  assert.equal(receipt.verified, true);
});

test("static ending risk is a warning rather than an automatic technical failure", () => {
  const receipt = evaluateVideoQc({
    run: run(),
    captions: [caption()],
    transcript: "dark matter filaments nodes voids",
    technicalMetadata: { durationSeconds: 60, width: 1280, height: 720, fps: 24 },
    staticEndingRisk: true
  });
  assert.ok(receipt.warnings.includes("STATIC_ENDING_RISK"));
  assert.equal(receipt.verified, true);
});
