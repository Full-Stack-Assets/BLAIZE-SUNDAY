import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { AlbumManifest } from "./types.ts";
import { lintDerivativeTerminology, validateAlbumPackage } from "./validator.ts";

test("rejects native label on derived filenames", () => {
  assert.deepEqual(
    lintDerivativeTerminology("01_LOOKS_EXPENSIVE_NATIVE_INSTRUMENTAL.wav", { nativeStem: false }),
    ["derived asset must not use native terminology"]
  );
});

test("blocked source gaps are reported without becoming validator errors", async () => {
  const tracks = Array.from({ length: 10 }, (_, index) => ({
    id: `${String(index + 1).padStart(2, "0")}_TEST`,
    title: `TEST ${index + 1}`,
    visualMode: "test",
    signatureSound: "test",
    evidenceState: index >= 3 ? ("BLOCKED_SOURCE_MISSING" as const) : ("VERIFIED" as const),
    lifecycleStatus: "QA" as const,
    deliverables: []
  }));
  const manifest: AlbumManifest = {
    artist: "BLAIZE SUNDAY",
    title: "LOOKS EXPENSIVE, FEELS WEIRD",
    edition: "Archive Remaster / Derived Production Edition",
    catalogState: "CURATED_REFERENCE_MASTER",
    releaseAuthorized: false,
    tracks
  };
  const report = await validateAlbumPackage({ root: "/tmp/album-validator-fixture", manifest });
  assert.equal(report.status, "PASS");
  assert.equal(report.blockedSources.length, 7);
  assert.equal(report.completionState, "BLOCKED");
});

function manifestWithPresentMaster(filename = "MASTER/test.bin"): AlbumManifest {
  return {
    artist: "BLAIZE SUNDAY",
    title: "LOOKS EXPENSIVE, FEELS WEIRD",
    edition: "Archive Remaster / Derived Production Edition",
    catalogState: "CURATED_REFERENCE_MASTER",
    releaseAuthorized: false,
    tracks: [
      {
        id: "01_TEST",
        title: "TEST",
        visualMode: "test",
        signatureSound: "test",
        evidenceState: "VERIFIED",
        lifecycleStatus: "QA",
        deliverables: [
          {
            assetId: "01_TEST:1",
            trackId: "01_TEST",
            filename,
            canonAssetState: "CANDIDATE",
            catalogState: "CURATED_REFERENCE_MASTER",
            evidenceState: "VERIFIED",
            presence: "present_needs_human_approval",
            nativeStem: false,
            canonical: false
          }
        ]
      }
    ]
  };
}

test("present masters require a checksum file", async () => {
  const root = await mkdtemp(join(tmpdir(), "album-validator-checksum-"));
  await mkdir(join(root, "01_TEST", "MASTER"), { recursive: true });
  await writeFile(join(root, "01_TEST", "MASTER", "test.bin"), "payload", "utf8");
  const report = await validateAlbumPackage({ root, manifest: manifestWithPresentMaster() });
  assert.equal(report.status, "FAIL");
  assert.ok(report.errors.some((error) => error.includes("checksum file missing or empty")));
  assert.deepEqual(report.verifiedAssets, []);
});

test("present masters must match their recorded checksum", async () => {
  const root = await mkdtemp(join(tmpdir(), "album-validator-hash-"));
  await mkdir(join(root, "01_TEST", "MASTER"), { recursive: true });
  await mkdir(join(root, "01_TEST", "METADATA"), { recursive: true });
  await writeFile(join(root, "01_TEST", "MASTER", "test.bin"), "payload", "utf8");
  await writeFile(
    join(root, "01_TEST", "METADATA", "checksums.sha256"),
    `${"0".repeat(64)}  test.bin\n`,
    "utf8"
  );
  const report = await validateAlbumPackage({ root, manifest: manifestWithPresentMaster() });
  assert.equal(report.status, "FAIL");
  assert.ok(report.errors.some((error) => error.includes("checksum mismatch")));
  assert.deepEqual(report.verifiedAssets, []);
});
