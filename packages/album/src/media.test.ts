import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { inspectMedia, normalizeProbe } from "./media.ts";

const execFileAsync = promisify(execFile);

test("normalizeProbe extracts 24-bit 48 kHz PCM properties", () => {
  const inspection = normalizeProbe({
    streams: [{ codec_type: "audio", codec_name: "pcm_s24le", sample_rate: "48000", channels: 2, bits_per_raw_sample: "24" }],
    format: { duration: "208.091438", format_name: "wav" },
  });
  assert.equal(inspection.sampleRateHz, 48000);
  assert.equal(inspection.bitDepth, 24);
  assert.equal(inspection.channels, 2);
});

test("normalizeProbe treats zero MP3 bit depth as unknown", () => {
  const inspection = normalizeProbe({
    streams: [{ codec_type: "audio", codec_name: "mp3", sample_rate: "44100", channels: 1, bits_per_raw_sample: "0" }],
    format: { duration: "208.091429", format_name: "mp3" },
  });
  assert.equal(inspection.bitDepth, null);
});

test("inspectMedia reads a generated 24-bit WAV when ffmpeg is available", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "album-media-"));
  const fixture = join(dir, "fixture.wav");
  try {
    await execFileAsync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.25", "-ar", "48000", "-c:a", "pcm_s24le", fixture]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      t.skip("ffmpeg unavailable in this environment");
      return;
    }
    throw error;
  }
  const inspection = await inspectMedia(fixture);
  assert.equal(inspection.codec, "pcm_s24le");
  assert.equal(inspection.sampleRateHz, 48000);
  assert.equal(inspection.bitDepth, 24);
});
