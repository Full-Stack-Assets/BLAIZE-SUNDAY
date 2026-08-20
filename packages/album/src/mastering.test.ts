import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { inspectMedia } from "./media.ts";
import {
  buildAudioFilters,
  renderArchiveMasterCandidate,
  validateMasteringProfile,
  type MasteringProfile
} from "./mastering.ts";

const execFileAsync = promisify(execFile);
const neutralProfile: MasteringProfile = {
  trackId: "01_LOOKS_EXPENSIVE",
  sourceSelectionReceipt: "album/edition/source-selection/01_LOOKS_EXPENSIVE.json",
  highpassHz: null,
  lowShelfHz: null,
  lowShelfDb: 0,
  highShelfHz: null,
  highShelfDb: 0,
  outputGainDb: 0,
  applyCompressor: false,
  note: "Neutral technical render for deterministic test."
};

test("mastering profile rejects implicit defaults", () => {
  assert.throws(
    () => validateMasteringProfile({ trackId: "01_LOOKS_EXPENSIVE" } as never),
    /explicit profile/
  );
});

test("neutral profile produces no audio filters", () => {
  assert.deepEqual(buildAudioFilters(neutralProfile), []);
});

test("mastering profile rejects non-numeric filter values", () => {
  assert.throws(
    () =>
      validateMasteringProfile({
        ...neutralProfile,
        highpassHz: "80,volume=30" as unknown as number
      }),
    /highpassHz/
  );
});

test("mastering profile rejects invalid compressor ranges", () => {
  assert.throws(
    () =>
      validateMasteringProfile({
        ...neutralProfile,
        applyCompressor: true,
        compressor: { thresholdDb: -12, ratio: 0, attackMs: -1, releaseMs: 80 }
      }),
    /compressor/
  );
});

test("archive render creates 24-bit 48 kHz WAV, FLAC, and high-bitrate MP3", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "album-master-"));
  const input = join(dir, "source.wav");
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=0.25",
      "-ar",
      "48000",
      "-c:a",
      "pcm_s24le",
      input
    ]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      t.skip("ffmpeg unavailable in this environment");
      return;
    }
    throw error;
  }
  const wav = join(dir, "master.wav");
  const flac = join(dir, "master.flac");
  const mp3 = join(dir, "reference.mp3");
  await renderArchiveMasterCandidate({
    inputPath: input,
    outputWav: wav,
    outputFlac: flac,
    outputMp3: mp3,
    profile: neutralProfile
  });
  const [wavInfo, flacInfo, mp3Info] = await Promise.all([
    inspectMedia(wav),
    inspectMedia(flac),
    inspectMedia(mp3)
  ]);
  assert.equal(wavInfo.sampleRateHz, 48000);
  assert.equal(wavInfo.bitDepth, 24);
  assert.equal(flacInfo.sampleRateHz, 48000);
  assert.ok(Math.abs(wavInfo.durationSeconds - flacInfo.durationSeconds) < 0.01);
  assert.ok((mp3Info.bitRate ?? 0) >= 300000);
});
