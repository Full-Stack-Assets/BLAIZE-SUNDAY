import assert from "node:assert/strict";
import test from "node:test";

import { buildAlbumManifest } from "./manifest.ts";

test("manifest blocks tracks 04-10 when source payload is missing", () => {
  const manifest = buildAlbumManifest({
    "01_LOOKS_EXPENSIVE": { evidence_state: "VERIFIED" },
    "02_MY_THERAPIST_BLOCKED_ME": { evidence_state: "VERIFIED" },
    "03_BAD_DECISIONS_GREAT_OUTFIT": { evidence_state: "VERIFIED" },
    "04_PRETTY_BOY_PROBLEMS": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
    "05_DELETE_AFTER_LISTENING": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
    "06_NO_SIGNAL": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
    "07_2_17_AM": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
    "08_PARALLEL_YOU": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
    "09_ROOM_SERVICE_FOR_ONE": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
    "10_WRONG_FLOOR": { evidence_state: "BLOCKED_SOURCE_MISSING", documented_render_evidence: true },
  });
  assert.equal(manifest.tracks[3]!.evidenceState, "BLOCKED_SOURCE_MISSING");
  assert.equal(manifest.tracks[3]!.deliverables[0]!.presence, "blocked_source_missing");
});

test("manifest keeps visual assets non-applicable during audio-only foundation plan", () => {
  const manifest = buildAlbumManifest({ "01_LOOKS_EXPENSIVE": { evidence_state: "VERIFIED" } });
  const cover = manifest.tracks[0]!.deliverables.find((asset) => asset.filename === "ART/cover_3000x3000.png");
  assert.equal(cover?.presence, "not_applicable");
});
