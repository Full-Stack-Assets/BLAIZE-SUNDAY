import test from "node:test";
import assert from "node:assert/strict";
import type { LocalAlignmentProvider } from "./captions.ts";
import { InMemoryVideoRunRepository } from "./repository.ts";
import { VideoRunService } from "./service.ts";

const briefInput = {
  title: "Why Galaxies Form the Cosmic Web",
  topic: "Why galaxies form the cosmic web",
  audience: "curious adults",
  tone: "clear, cinematic, scientifically accurate",
  targetDurationSeconds: 60,
  requiredCoverage: ["dark matter", "filaments", "nodes", "voids"],
  visualRequirements: ["dark space"]
};

test("automatic alignment persists source-bound JSON SRT and VTT captions", async () => {
  const repo = new InMemoryVideoRunRepository();
  const aligner: LocalAlignmentProvider = {
    async health() {
      return "CONFIGURED";
    },
    async align(input) {
      assert.equal(input.mediaPath, "https://example.test/video.mp4");
      assert.equal(input.locale, "en");
      return {
        timeline: {
          locale: "en",
          cues: [
            {
              startSeconds: 0,
              endSeconds: 3.5,
              text: "Dark matter supplied the gravitational scaffolding."
            }
          ]
        },
        sourceMediaHash: "sha256:audio-fixture"
      };
    }
  };
  const service = new VideoRunService(repo, undefined, aligner);
  const run = await service.createRoot(briefInput);
  await service.attachExternalTask(run.id, "task-auto-captions");
  await service.recordExternalResult(run.id, {
    status: "completed",
    videoUrl: "https://example.test/video.mp4",
    error: { final_error: null }
  });

  const result = await service.alignCaptions(run.id, "en");

  assert.equal(result.run.captionStatus, "AVAILABLE");
  assert.deepEqual(result.captions.map(item => item.format).sort(), ["json", "srt", "vtt"]);
  assert.ok(result.captions.every(item => item.source === "LOCAL_ALIGNMENT"));
  assert.ok(
    result.captions.every(item => item.sourceMediaHash === "sha256:audio-fixture")
  );
});

test("automatic alignment fails closed when the aligner is unavailable", async () => {
  const repo = new InMemoryVideoRunRepository();
  const aligner: LocalAlignmentProvider = {
    async health() {
      return "UNCONFIGURED";
    },
    async align() {
      throw new Error("should not run");
    }
  };
  const service = new VideoRunService(repo, undefined, aligner);
  const run = await service.createRoot(briefInput);
  await service.attachExternalTask(run.id, "task-no-aligner");
  await service.recordExternalResult(run.id, {
    status: "completed",
    videoUrl: "https://example.test/video.mp4",
    error: { final_error: null }
  });

  await assert.rejects(() => service.alignCaptions(run.id, "en"), /LOCAL_ALIGNMENT_UNCONFIGURED/);
});
