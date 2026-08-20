import test from "node:test";
import assert from "node:assert/strict";
import {
  MUTATION_ACTIONS,
  describeVideoRunStatus,
  formatTechnicalSummary
} from "./video-view.ts";

test("video status copy never equates provider completion with verification", () => {
  assert.match(describeVideoRunStatus("CAPTIONS_REQUIRED"), /captions/i);
  assert.doesNotMatch(describeVideoRunStatus("CAPTIONS_REQUIRED"), /verified/i);
  assert.match(describeVideoRunStatus("NEEDS_REVISION"), /evidence|revision/i);
  assert.match(describeVideoRunStatus("VERIFIED"), /verified/i);
});

test("UI exposes exactly the five controlled mutations", () => {
  assert.deepEqual(
    MUTATION_ACTIONS.map(action => action.value),
    ["REGENERATE", "MORE_CINEMATIC", "MORE_EXPLANATORY", "SHORTER", "LONGER"]
  );
});

test("technical summary only reports measured values that exist", () => {
  assert.equal(formatTechnicalSummary({ durationSeconds: null, width: null, height: null, fps: null }), "Not inspected");
  assert.equal(
    formatTechnicalSummary({ durationSeconds: 59.8, width: 1280, height: 720, fps: 24 }),
    "59.8s · 1280×720 · 24fps"
  );
});
