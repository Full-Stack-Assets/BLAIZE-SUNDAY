import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDistributionPayload,
  buildDspChecklist,
  buildYouTubePayload,
  type ReleasePreparationContext
} from "./payloads.ts";

function completeContext(): ReleasePreparationContext {
  return {
    releaseId: "release-1",
    projectId: "project-1",
    status: "PREPARED",
    artistName: "BLAIZE SUNDAY",
    title: "Chrome Receipt",
    master: {
      id: "audio-1",
      fileUrl: "https://assets.example/audio-1.wav",
      sha256: "a".repeat(64),
      approved: true,
      durationSeconds: 138,
      contentType: "audio/wav"
    },
    coverArt: {
      id: "visual-1",
      fileUrl: "https://assets.example/cover.png",
      sha256: "b".repeat(64),
      approved: true,
      width: 3000,
      height: 3000,
      contentType: "image/png"
    },
    metadata: {
      title: "Chrome Receipt",
      artistName: "BLAIZE SUNDAY",
      genre: "Alt Pop",
      subgenre: "Luxury Glitch Pop",
      language: "en",
      explicit: false,
      description: "The outfit survived. The emotional operating system did not.",
      tags: ["blaize sunday", "luxury glitch", "alt pop"],
      credits: { primaryArtist: "BLAIZE SUNDAY" }
    },
    rights: {
      approved: true,
      ownershipConfirmed: true,
      provenanceComplete: true,
      warnings: []
    }
  };
}

test("DSP checklist reports missing approved assets and rights", () => {
  const context = completeContext();
  context.master = null;
  context.rights.approved = false;

  const checklist = buildDspChecklist(context);

  assert.equal(checklist.readyForAuthorization, false);
  assert.ok(checklist.missingRequirements.includes("APPROVED_MASTER"));
  assert.ok(checklist.missingRequirements.includes("RIGHTS_APPROVED"));
});

test("DSP checklist passes a complete package", () => {
  assert.equal(buildDspChecklist(completeContext()).readyForAuthorization, true);
});

test("distribution payload is deterministic and stops at authorization", () => {
  const first = buildDistributionPayload(completeContext(), "test-dsp");
  const second = buildDistributionPayload(completeContext(), "test-dsp");

  assert.equal(first.payloadHash, second.payloadHash);
  assert.equal(first.nextStatus, "AWAITING_AUTHORIZATION");
  assert.equal(first.submissionPerformed, false);
});

test("YouTube payload maps assets and remains private without uploading", () => {
  const result = buildYouTubePayload(completeContext());

  assert.deepEqual(result.payload, {
    title: "BLAIZE SUNDAY — Chrome Receipt",
    description:
      "The outfit survived. The emotional operating system did not.",
    tags: ["blaize sunday", "luxury glitch", "alt pop"],
    audioAssetId: "audio-1",
    thumbnailAssetId: "visual-1",
    privacyStatus: "private",
    madeForKids: false
  });
  assert.equal(result.uploadPerformed, false);
});
