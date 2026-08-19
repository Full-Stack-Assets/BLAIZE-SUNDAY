import test from "node:test";
import assert from "node:assert/strict";
import { createVideoBrief } from "./domain.ts";
import { compileWisebasePayload, mutateVideoBrief } from "./prompt.ts";

const base = createVideoBrief({
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
});

test("Wisebase payload is deterministic", () => {
  assert.deepEqual(compileWisebasePayload(base), compileWisebasePayload(base));
});

test("more cinematic preserves required coverage", () => {
  const next = mutateVideoBrief(base, "MORE_CINEMATIC");
  assert.deepEqual(next.requiredCoverage, base.requiredCoverage);
  assert.ok(next.visualRequirements.some(value => value.includes("continuous motion")));
});

test("more explanatory preserves required coverage and strengthens causal instruction", () => {
  const next = mutateVideoBrief(base, "MORE_EXPLANATORY");
  assert.deepEqual(next.requiredCoverage, base.requiredCoverage);
  assert.ok(next.visualRequirements.some(value => value.includes("causal mechanism")));
});

test("shorter and longer obey v0.2a bounds", () => {
  assert.equal(mutateVideoBrief(base, "SHORTER").targetDurationSeconds, 50);
  assert.equal(mutateVideoBrief(base, "LONGER").targetDurationSeconds, 75);
  assert.equal(
    mutateVideoBrief({ ...base, targetDurationSeconds: 30 }, "SHORTER").targetDurationSeconds,
    30
  );
  assert.equal(
    mutateVideoBrief({ ...base, targetDurationSeconds: 115 }, "LONGER").targetDurationSeconds,
    120
  );
});
