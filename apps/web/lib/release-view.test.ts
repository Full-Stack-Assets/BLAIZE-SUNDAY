import { describe, expect, it } from "vitest";
import { buildReleaseTimeline, releaseTruthLabel } from "./release-view";

describe("release-view", () => {
  it("marks the current stage", () => {
    const timeline = buildReleaseTimeline("SUBMITTED");
    const current = timeline.find((s) => s.state === "CURRENT");
    expect(current?.status).toBe("SUBMITTED");
  });

  it("labels live with missing evidence as inconsistent", () => {
    expect(
      releaseTruthLabel({
        status: "LIVE",
        verifiedPlatformUrl: null,
        externalConfirmationId: null,
      })
    ).toContain("INCONSISTENT");
  });
});
