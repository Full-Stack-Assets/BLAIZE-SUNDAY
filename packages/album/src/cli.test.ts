import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parseCli, runCli } from "./cli.ts";

test("audit requires an explicit source map", () => {
  assert.throws(() => parseCli(["audit"]), /--source-map/);
});

test("render requires a profile", () => {
  assert.throws(() => parseCli(["render", "--track", "01_LOOKS_EXPENSIVE"]), /--profile/);
});

test("bootstrap requires an output directory", () => {
  assert.throws(() => parseCli(["bootstrap"]), /--output/);
});

test("render rejects a source-selection receipt for another track", async () => {
  const dir = await mkdtemp(join(tmpdir(), "album-cli-receipt-"));
  const source = join(dir, "source.wav");
  const receiptPath = join(dir, "receipt.json");
  const profilePath = join(dir, "profile.json");
  const sourceMapPath = join(dir, "source-map.json");
  await writeFile(source, "not audio", "utf8");
  await writeFile(
    receiptPath,
    JSON.stringify({
      trackId: "02_MY_THERAPIST_BLOCKED_ME",
      generatedAt: new Date().toISOString(),
      candidates: [
        {
          role: "original_full_mix",
          path: source,
          filename: "source.wav",
          sha256: "abc",
          inspection: {
            codec: "pcm_s24le",
            durationSeconds: 1,
            sampleRateHz: 48000,
            channels: 2,
            bitDepth: 24,
            formatName: "wav",
            bitRate: null
          },
          selectionStatus: "selected_for_archive_candidate",
          notes: []
        }
      ],
      selectedPath: source,
      humanSelectionRequired: false
    }),
    "utf8"
  );
  await writeFile(
    profilePath,
    JSON.stringify({
      trackId: "01_LOOKS_EXPENSIVE",
      sourceSelectionReceipt: receiptPath,
      highpassHz: null,
      lowShelfHz: null,
      lowShelfDb: 0,
      highShelfHz: null,
      highShelfDb: 0,
      outputGainDb: 0,
      applyCompressor: false,
      note: "test"
    }),
    "utf8"
  );
  await writeFile(
    sourceMapPath,
    JSON.stringify({
      "01_LOOKS_EXPENSIVE": [{ role: "original_full_mix", path: source }]
    }),
    "utf8"
  );

  await assert.rejects(
    () =>
      runCli([
        "render",
        "--track",
        "01_LOOKS_EXPENSIVE",
        "--profile",
        profilePath,
        "--source-map",
        sourceMapPath,
        "--output",
        join(dir, "out")
      ]),
    /receipt track does not match --track/
  );
});

test("render rejects a selected path absent from the selection receipt", async () => {
  const dir = await mkdtemp(join(tmpdir(), "album-cli-selected-"));
  const source = join(dir, "source.wav");
  const receiptPath = join(dir, "receipt.json");
  const profilePath = join(dir, "profile.json");
  const sourceMapPath = join(dir, "source-map.json");
  await writeFile(source, "not audio", "utf8");
  await writeFile(
    receiptPath,
    JSON.stringify({
      trackId: "01_LOOKS_EXPENSIVE",
      generatedAt: new Date().toISOString(),
      candidates: [],
      selectedPath: source,
      humanSelectionRequired: false
    }),
    "utf8"
  );
  await writeFile(
    profilePath,
    JSON.stringify({
      trackId: "01_LOOKS_EXPENSIVE",
      sourceSelectionReceipt: receiptPath,
      highpassHz: null,
      lowShelfHz: null,
      lowShelfDb: 0,
      highShelfHz: null,
      highShelfDb: 0,
      outputGainDb: 0,
      applyCompressor: false,
      note: "test"
    }),
    "utf8"
  );
  await writeFile(
    sourceMapPath,
    JSON.stringify({
      "01_LOOKS_EXPENSIVE": [{ role: "original_full_mix", path: source }]
    }),
    "utf8"
  );

  await assert.rejects(
    () =>
      runCli([
        "render",
        "--track",
        "01_LOOKS_EXPENSIVE",
        "--profile",
        profilePath,
        "--source-map",
        sourceMapPath,
        "--output",
        join(dir, "out")
      ]),
    /selected source missing from selection receipt/
  );
});
