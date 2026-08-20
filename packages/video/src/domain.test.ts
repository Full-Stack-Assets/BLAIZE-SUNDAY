import test from "node:test";
import assert from "node:assert/strict";
import { createVideoBrief } from "./domain.ts";

test("creates a generic 60 second video brief with fail-closed caption policy", () => {
  const brief = createVideoBrief({
    title: "Why Galaxies Form the Cosmic Web",
    topic: "Why galaxies form the cosmic web",
    audience: "curious adults",
    tone: "clear, cinematic, scientifically accurate",
    requiredCoverage: ["dark matter", "filaments", "voids"],
    visualRequirements: ["dark space", "cyan/gold accents"]
  });

  assert.equal(brief.targetDurationSeconds, 60);
  assert.equal(brief.durationTolerancePercent, 15);
  assert.equal(brief.captionPolicy, "REQUIRED");
  assert.equal(brief.locale, "en");
});
