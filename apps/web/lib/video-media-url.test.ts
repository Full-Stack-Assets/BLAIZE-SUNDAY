import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedVideoMediaUrl } from "./video-media-url.ts";

test("Wisebase Sider media host is trusted over HTTPS", () => {
  assert.equal(
    isTrustedVideoMediaUrl(
      "https://sider-pub.s3.amazonaws.com/manim/manim-example.mp4"
    ),
    true
  );
});

for (const input of [
  "http://sider-pub.s3.amazonaws.com/manim/video.mp4",
  "https://example.com/video.mp4",
  "http://127.0.0.1/video.mp4",
  "http://169.254.169.254/latest/meta-data/",
  "/etc/passwd"
]) {
  test(`untrusted video media URL is rejected: ${input}`, () => {
    assert.equal(isTrustedVideoMediaUrl(input), false);
  });
}

test("operator allowlist can extend trusted HTTPS hosts", () => {
  assert.equal(
    isTrustedVideoMediaUrl("https://media.example.test/video.mp4", [
      "media.example.test"
    ]),
    true
  );
});
