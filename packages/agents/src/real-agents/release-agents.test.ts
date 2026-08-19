import assert from "node:assert/strict";
import test from "node:test";

import type { ReleasePreparationContext } from "@songforge/release";
import { DistributionAgent } from "./distribution-agent.ts";
import { DspPublishingAgent } from "./dsp-publishing-agent.ts";
import { YouTubeAgent } from "./youtube-agent.ts";

function context(): ReleasePreparationContext {
  return {
    releaseId: "release-1",
    projectId: "project-1",
    status: "PREPARED",
    artistName: "BLAIZE SUNDAY",
    title: "Chrome Receipt",
    master: {
      id: "master-1",
      fileUrl: "https://assets.example/master.wav",
      sha256: "a".repeat(64),
      approved: true,
      durationSeconds: 138,
      contentType: "audio/wav"
    },
    coverArt: {
      id: "cover-1",
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
      description: "The outfit survived. The operating system did not.",
      tags: ["blaize sunday", "luxury glitch"],
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

test("distribution agent only prepares an authorization-bound payload", () => {
  const output = new DistributionAgent().prepare(context(), "test-dsp");

  assert.equal(output.agentId, "distribution_agent");
  assert.equal(output.nextStatus, "AWAITING_AUTHORIZATION");
  assert.equal(output.submissionPerformed, false);
  assert.match(output.payloadHash, /^[a-f0-9]{64}$/);
});

test("DSP publishing agent exposes the exact failed requirements", () => {
  const input = context();
  input.coverArt = null;

  const output = new DspPublishingAgent().inspect(input);

  assert.equal(output.agentId, "dsp_publishing_agent");
  assert.equal(output.readyForAuthorization, false);
  assert.ok(output.missingRequirements.includes("APPROVED_COVER_ART"));
});

test("YouTube agent prepares a private payload without uploading", () => {
  const output = new YouTubeAgent().prepare(context());

  assert.equal(output.agentId, "youtube_agent");
  assert.equal(output.payload.privacyStatus, "private");
  assert.equal(output.uploadPerformed, false);
});
