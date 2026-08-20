import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  NodeWhisperAlignmentProvider,
  type ExecFileForAlignment
} from "./whisper-alignment.server.ts";

test("local Whisper adapter extracts audio, hashes it, and returns timed captions", async () => {
  const fixtureDir = await mkdtemp(join(tmpdir(), "songforge-whisper-test-"));
  const modelPath = join(fixtureDir, "ggml-base.en.bin");
  await writeFile(modelPath, "model-fixture");
  const audioBytes = Buffer.from("pcm-audio-fixture");
  const calls: Array<{ file: string; args: string[] }> = [];

  const execFile: ExecFileForAlignment = async (file, args) => {
    calls.push({ file, args });
    if (file === "ffmpeg") {
      await writeFile(args.at(-1)!, audioBytes);
      return { stdout: "" };
    }
    if (file === "whisper-cli") {
      const outputIndex = args.indexOf("-of");
      const outputBase = args[outputIndex + 1]!;
      await writeFile(
        `${outputBase}.json`,
        JSON.stringify({
          transcription: [
            {
              timestamps: { from: "00:00:00,000", to: "00:00:02,500" },
              text: "Dark matter supplied the scaffolding."
            }
          ]
        })
      );
      return { stdout: "" };
    }
    throw new Error(`unexpected executable ${file}`);
  };

  try {
    const provider = new NodeWhisperAlignmentProvider({
      execFile,
      modelPath,
      whisperCliPath: "whisper-cli",
      ffmpegPath: "ffmpeg"
    });
    assert.equal(await provider.health(), "CONFIGURED");

    const result = await provider.align({
      mediaPath: "https://sider-pub.s3.amazonaws.com/manim/video.mp4",
      locale: "en"
    });

    assert.equal(result.timeline.cues[0]?.endSeconds, 2.5);
    assert.equal(
      result.sourceMediaHash,
      `sha256:${createHash("sha256").update(audioBytes).digest("hex")}`
    );
    assert.equal(calls[0]?.file, "ffmpeg");
    assert.equal(calls[1]?.file, "whisper-cli");
    assert.ok(calls[1]?.args.includes("--output-json"));
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test("local Whisper adapter rejects untrusted media before spawning ffmpeg", async () => {
  const provider = new NodeWhisperAlignmentProvider({
    execFile: async () => {
      throw new Error("must not execute");
    },
    modelPath: "/models/ggml-base.en.bin",
    whisperCliPath: "whisper-cli",
    ffmpegPath: "ffmpeg"
  });

  await assert.rejects(
    () => provider.align({ mediaPath: "http://169.254.169.254/latest/meta-data/", locale: "en" }),
    /VIDEO_MEDIA_URL_NOT_ALLOWED/
  );
});
