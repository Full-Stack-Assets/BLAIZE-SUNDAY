import assert from "node:assert/strict";
import test from "node:test";
import type { AlbumManifest } from "./types.ts";
import { lintDerivativeTerminology, validateAlbumPackage } from "./validator.ts";

test("rejects native label on derived filenames", () => {
  assert.deepEqual(
    lintDerivativeTerminology("01_LOOKS_EXPENSIVE_NATIVE_INSTRUMENTAL.wav", { nativeStem: false }),
    ["derived asset must not use native terminology"],
  );
});

test("blocked source gaps are reported without becoming validator errors", async () => {
  const tracks = Array.from({ length: 10 }, (_, index) => ({
    id: `${String(index + 1).padStart(2, "0")}_TEST`,
    title: `TEST ${index + 1}`,
    visualMode: "test",
    signatureSound: "test",
    evidenceState: index >= 3 ? "BLOCKED_SOURCE_MISSING" as const : "VERIFIED" as const,
    lifecycleStatus: "QA" as const,
    deliverables: [],
  }));
  const manifest: AlbumManifest = {
    artist: "BLAIZE SUNDAY",
    title: "LOOKS EXPENSIVE, FEELS WEIRD",
    edition: "Archive Remaster / Derived Production Edition",
    catalogState: "CURATED_REFERENCE_MASTER",
    releaseAuthorized: false,
    tracks,
  };
  const report = await validateAlbumPackage({ root: "/tmp/album-validator-fixture", manifest });
  assert.equal(report.status, "PASS");
  assert.equal(report.blockedSources.length, 7);
  assert.equal(report.completionState, "BLOCKED");
});
