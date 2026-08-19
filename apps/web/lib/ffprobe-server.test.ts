import test from "node:test";
import assert from "node:assert/strict";
import { createNodeFfprobeInspector } from "./ffprobe.server.ts";

test("node ffprobe adapter delegates inspection through an injectable executor", async () => {
  const calls: Array<{ file: string; args: string[] }> = [];
  const inspector = createNodeFfprobeInspector(async (file, args) => {
    calls.push({ file, args });
    return {
      stdout: JSON.stringify({
        streams: [
          {
            codec_type: "video",
            width: 1280,
            height: 720,
            avg_frame_rate: "24/1"
          }
        ],
        format: { duration: "60" }
      })
    };
  });

  const metadata = await inspector.inspect("/tmp/video.mp4");
  assert.deepEqual(metadata, {
    durationSeconds: 60,
    width: 1280,
    height: 720,
    fps: 24
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.file, "ffprobe");
  assert.equal(calls[0]?.args.at(-1), "/tmp/video.mp4");
});
