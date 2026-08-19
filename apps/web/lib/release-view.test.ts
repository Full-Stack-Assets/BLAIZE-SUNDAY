import assert from "node:assert/strict";
import test from "node:test";

import { buildReleaseTimeline, releaseTruthLabel } from "./release-view.ts";

test("timeline marks only reached states", () => {
  const timeline = buildReleaseTimeline("ACCEPTED");

  assert.equal(timeline.find(item => item.status === "ACCEPTED")?.state, "CURRENT");
  assert.equal(timeline.find(item => item.status === "SCHEDULED")?.state, "UPCOMING");
  assert.equal(timeline.find(item => item.status === "PREPARED")?.state, "COMPLETE");
});

test("LIVE never appears verified without both evidence fields", () => {
  assert.equal(
    releaseTruthLabel({
      status: "LIVE",
      verifiedPlatformUrl: null,
      externalConfirmationId: null
    }),
    "INCONSISTENT — LIVE EVIDENCE MISSING"
  );

  assert.equal(
    releaseTruthLabel({
      status: "LIVE",
      verifiedPlatformUrl: "https://music.example/releases/1",
      externalConfirmationId: "receipt-1"
    }),
    "LIVE — EXTERNALLY VERIFIED"
  );
});

test("awaiting authorization label explicitly says not submitted", () => {
  assert.equal(
    releaseTruthLabel({
      status: "AWAITING_AUTHORIZATION",
      verifiedPlatformUrl: null,
      externalConfirmationId: null
    }),
    "AWAITING AUTHORIZATION — NOT SUBMITTED"
  );
});
