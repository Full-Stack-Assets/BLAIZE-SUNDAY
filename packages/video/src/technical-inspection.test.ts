import test from "node:test";
import assert from "node:assert/strict";
import { FfprobeInspector } from "./technical-inspection.ts";

test("ffprobe inspector extracts duration, dimensions, and rational fps", async () => {
  const calls: { file: string; args: string[] }[] = [];
  const inspector = new FfprobeInspector(async (file, args) => {
    calls.push({ file, args });
    return {
      stdout: JSON.stringify({
        streams: [{ codec_type: "video", width: 1280, height: 720, avg_frame_rate: "24/1" }],
        format: { duration: "60.25" }
      })
    };
  });

  const metadata = await inspector.inspect("https://example.test/video.mp4");

  assert.deepEqual(metadata, {
    durationSeconds: 60.25,
    width: 1280,
    height: 720,
    fps: 24
  });
  assert.equal(calls[0]?.file, "ffprobe");
  assert.deepEqual(calls[0]?.args, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    "https://example.test/video.mp4"
  ]);
});

test("ffprobe inspector fails closed when required metadata is absent", async () => {
  const inspector = new FfprobeInspector(async () => ({ stdout: JSON.stringify({ streams: [], format: {} }) }));
  await assert.rejects(
    () => inspector.inspect("missing.mp4"),
    /TECHNICAL_METADATA_UNAVAILABLE/
  );
});
