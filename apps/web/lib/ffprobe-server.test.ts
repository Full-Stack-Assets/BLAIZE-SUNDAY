import test from "node:test";
import assert from "node:assert/strict";
import { createNodeFfprobeInspector } from "./ffprobe.server.ts";

function ffprobeResult() {
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
}

test("node ffprobe adapter delegates trusted Wisebase media through an injectable executor", async () => {
  const calls: Array<{ file: string; args: string[] }> = [];
  const inspector = createNodeFfprobeInspector(async (file, args) => {
    calls.push({ file, args });
    return ffprobeResult();
  });
  const input = "https://sider-pub.s3.amazonaws.com/manim/video.mp4";

  const metadata = await inspector.inspect(input);
  assert.deepEqual(metadata, {
    durationSeconds: 60,
    width: 1280,
    height: 720,
    fps: 24
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.file, "ffprobe");
  assert.equal(calls[0]?.args.at(-1), input);
});

for (const input of [
  "http://127.0.0.1/private.mp4",
  "http://169.254.169.254/latest/meta-data/",
  "https://example.com/video.mp4",
  "/etc/passwd"
]) {
  test(`automatic ffprobe rejects untrusted target ${input}`, async () => {
    let calls = 0;
    const inspector = createNodeFfprobeInspector(async () => {
      calls += 1;
      return ffprobeResult();
    });

    await assert.rejects(inspector.inspect(input), /FFPROBE_INPUT_NOT_ALLOWED/);
    assert.equal(calls, 0);
  });
}
