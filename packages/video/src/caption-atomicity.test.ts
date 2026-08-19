import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryVideoRunRepository,
  type CaptionRecord
} from "./repository.ts";
import { VideoRunService } from "./service.ts";

const briefInput = {
  title: "Caption atomicity fixture",
  topic: "Caption atomicity",
  audience: "curious adults",
  tone: "clear",
  targetDurationSeconds: 60,
  requiredCoverage: ["dark matter"],
  visualRequirements: ["dark space"]
};

class AtomicTrackingRepository extends InMemoryVideoRunRepository {
  singleWrites = 0;
  batchWrites = 0;

  override async attachCaption(caption: CaptionRecord): Promise<CaptionRecord> {
    this.singleWrites += 1;
    throw new Error(`NON_ATOMIC_CAPTION_WRITE:${caption.format}`);
  }

  async attachCaptions(captions: CaptionRecord[]): Promise<CaptionRecord[]> {
    this.batchWrites += 1;
    return super.attachCaptions(captions);
  }
}

test("one caption version persists JSON, SRT, and VTT through one atomic repository call", async () => {
  const repo = new AtomicTrackingRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  const result = await service.attachCaptions(run.id, {
    source: "MANUAL_IMPORT",
    locale: "en",
    format: "srt",
    content: `1\n00:00:00,000 --> 00:00:02,000\nDark matter forms a scaffold.\n`
  });

  assert.equal(repo.batchWrites, 1);
  assert.equal(repo.singleWrites, 0);
  assert.deepEqual(result.captions.map(item => item.format).sort(), ["json", "srt", "vtt"]);
});

test("an invalid caption batch leaves no partial version behind", async () => {
  const repo = new InMemoryVideoRunRepository();
  const service = new VideoRunService(repo);
  const run = await service.createRoot(briefInput);

  const base: Omit<CaptionRecord, "id" | "format" | "content" | "contentHash"> = {
    runId: run.id,
    version: 1,
    locale: "en",
    source: "MANUAL_IMPORT",
    cueCount: 1,
    startSeconds: 0,
    endSeconds: 2,
    sourceMediaHash: null
  };

  await assert.rejects(
    repo.attachCaptions([
      { ...base, id: "json-1", format: "json", content: "{}", contentHash: "a" },
      { ...base, id: "srt-1", format: "srt", content: "srt", contentHash: "b" },
      { ...base, id: "srt-2", format: "srt", content: "duplicate", contentHash: "c" }
    ]),
    /CAPTION_VERSION_ALREADY_EXISTS/
  );

  assert.deepEqual(await repo.listCaptions(run.id), []);
});
