import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAlbumManifest, bootstrapAlbumTree, type SourceStateMap } from "./manifest.ts";

test("manifest fail-closes tracks 04 through 10", () => {
  const sourceState = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      const ids = [
        "01_LOOKS_EXPENSIVE",
        "02_MY_THERAPIST_BLOCKED_ME",
        "03_BAD_DECISIONS_GREAT_OUTFIT",
        "04_PRETTY_BOY_PROBLEMS",
        "05_DELETE_AFTER_LISTENING",
        "06_NO_SIGNAL",
        "07_2_17_AM",
        "08_PARALLEL_YOU",
        "09_ROOM_SERVICE_FOR_ONE",
        "10_WRONG_FLOOR",
      ];
      return [ids[i]!, { evidence_state: Number(n) <= 3 ? "VERIFIED" : "BLOCKED_SOURCE_MISSING" }];
    }),
  ) as SourceStateMap;
  const manifest = buildAlbumManifest(sourceState);
  assert.equal(manifest.tracks[3]!.evidenceState, "BLOCKED_SOURCE_MISSING");
  assert.equal(manifest.tracks[3]!.deliverables[0]!.presence, "blocked_source_missing");
  assert.equal(manifest.releaseAuthorized, false);
});

test("bootstrap creates directories without fake media placeholders", async () => {
  const root = await mkdtemp(join(tmpdir(), "album-tree-"));
  await bootstrapAlbumTree(root);
  assert.ok((await stat(join(root, "01_LOOKS_EXPENSIVE", "MASTER"))).isDirectory());
  assert.ok((await stat(join(root, "10_WRONG_FLOOR", "VIDEO"))).isDirectory());
});

test("phase-one manifest defers visual/video/alternate deliverables for source-backed tracks", () => {
  const manifest = buildAlbumManifest({
    "01_LOOKS_EXPENSIVE": { evidence_state: "VERIFIED" },
  });
  const first = manifest.tracks[0]!;
  assert.equal(first.deliverables.find((d) => d.filename.startsWith("MASTER/"))!.presence, "present_needs_human_approval");
  assert.equal(first.deliverables.find((d) => d.filename.startsWith("ALTERNATES/"))!.presence, "not_applicable");
  assert.equal(first.deliverables.find((d) => d.filename.startsWith("ART/"))!.presence, "not_applicable");
  assert.equal(first.deliverables.find((d) => d.filename.startsWith("VIDEO/"))!.presence, "not_applicable");
});
