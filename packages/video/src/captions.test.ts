import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCaptionTimeline,
  parseSrt,
  parseVtt,
  toSrt,
  toVtt,
  UnconfiguredLocalAlignmentProvider
} from "./captions.ts";

const srt = `1\n00:00:00,000 --> 00:00:02,000\nThe universe is not random.\n\n2\n00:00:02,000 --> 00:00:05,500\nOn the largest scales, it forms a web.\n`;

const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nThe universe is not random.\n\n00:00:02.000 --> 00:00:05.500\nOn the largest scales, it forms a web.\n`;

test("parses SRT into one canonical ordered caption timeline", () => {
  const timeline = parseSrt(srt, "en");
  assert.equal(timeline.cues.length, 2);
  assert.equal(timeline.cues[0]?.startSeconds, 0);
  assert.equal(timeline.cues[1]?.endSeconds, 5.5);
  assert.equal(parseSrt(toSrt(timeline), "en").cues.length, 2);
});

test("parses VTT and exports stable WebVTT", () => {
  const timeline = parseVtt(vtt, "en");
  assert.equal(timeline.cues.length, 2);
  assert.match(toVtt(timeline), /^WEBVTT/);
  assert.equal(parseVtt(toVtt(timeline), "en").cues[1]?.endSeconds, 5.5);
});

test("normalization rejects negative, reversed, overlapping, and empty cues", () => {
  assert.throws(
    () =>
      normalizeCaptionTimeline({
        locale: "en",
        cues: [{ startSeconds: -1, endSeconds: 1, text: "bad" }]
      }),
    /INVALID_CAPTION_TIMING/
  );
  assert.throws(
    () =>
      normalizeCaptionTimeline({
        locale: "en",
        cues: [{ startSeconds: 2, endSeconds: 1, text: "bad" }]
      }),
    /INVALID_CAPTION_TIMING/
  );
  assert.throws(
    () =>
      normalizeCaptionTimeline({
        locale: "en",
        cues: [
          { startSeconds: 0, endSeconds: 3, text: "one" },
          { startSeconds: 2.5, endSeconds: 4, text: "two" }
        ]
      }),
    /OVERLAPPING_CAPTIONS/
  );
  assert.throws(
    () =>
      normalizeCaptionTimeline({
        locale: "en",
        cues: [{ startSeconds: 0, endSeconds: 1, text: "   " }]
      }),
    /EMPTY_CAPTION_TEXT/
  );
});

test("unconfigured alignment provider fails truthfully", async () => {
  const provider = new UnconfiguredLocalAlignmentProvider();
  assert.equal(await provider.health(), "UNCONFIGURED");
  await assert.rejects(
    () => provider.align({ mediaPath: "/tmp/video.mp4", locale: "en" }),
    /LOCAL_ALIGNMENT_UNCONFIGURED/
  );
});
