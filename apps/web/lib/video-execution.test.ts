import test from "node:test";
import assert from "node:assert/strict";
import { executionPayloadFromRunDetail } from "./video-view.ts";

test("existing runs reconstruct their connector execution payload after reload", () => {
  const payload = executionPayloadFromRunDetail({
    compiledConcept: "Why galaxies form the cosmic web",
    compiledExplanation: "Show dark matter scaffolding and anisotropic collapse.",
    promptHash: "abc123",
    brief: { locale: "en-GB" }
  });

  assert.deepEqual(payload, {
    provider: "WISEBASE",
    mode: "CONNECTOR_MEDIATED",
    concept: "Why galaxies form the cosmic web",
    explanation: "Show dark matter scaffolding and anisotropic collapse.",
    lang: "en-GB",
    promptHash: "abc123"
  });
});
