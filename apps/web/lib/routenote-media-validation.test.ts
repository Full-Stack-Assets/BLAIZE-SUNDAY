import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRouteNoteJpeg,
  routeNoteArtworkTechnicalProblems,
  routeNoteAudioTechnicalProblems
} from "./routenote-media-validation.ts";

function jpegFixture(
  width = 3000,
  height = 3000,
  components = 3,
  precisionBits = 8
): Buffer {
  const segmentLength = 8 + 3 * components;
  const segment = Buffer.alloc(2 + segmentLength);
  segment[0] = 0xff;
  segment[1] = 0xc0;
  segment.writeUInt16BE(segmentLength, 2);
  segment[4] = precisionBits;
  segment.writeUInt16BE(height, 5);
  segment.writeUInt16BE(width, 7);
  segment[9] = components;
  for (let index = 0; index < components; index += 1) {
    const offset = 10 + index * 3;
    segment[offset] = index + 1;
    segment[offset + 1] = 0x11;
    segment[offset + 2] = 0;
  }
  return Buffer.concat([Buffer.from([0xff, 0xd8]), segment, Buffer.from([0xff, 0xd9])]);
}

test("accepts the exact RouteNote FLAC technical envelope", () => {
  assert.deepEqual(
    routeNoteAudioTechnicalProblems({
      durationSeconds: 213.5,
      channels: 2,
      sampleRateHz: 44_100,
      bitDepth: 16,
      bitrateKbps: 941
    }),
    []
  );
});

test("rejects audio that would falsely turn RouteNote readiness green", () => {
  const problems = routeNoteAudioTechnicalProblems({
    durationSeconds: 22,
    channels: 1,
    sampleRateHz: 48_000,
    bitDepth: 24,
    bitrateKbps: 256
  });
  assert.equal(problems.length, 5);
});

test("parses a 3000x3000 three-component JPEG as RGB-compatible", () => {
  const technical = inspectRouteNoteJpeg(jpegFixture());
  assert.equal(technical.width, 3000);
  assert.equal(technical.height, 3000);
  assert.equal(technical.precisionBits, 8);
  assert.equal(technical.components, 3);
  assert.equal(technical.colorSpace, "RGB");
  assert.deepEqual(routeNoteArtworkTechnicalProblems(technical), []);
});

test("rejects CMYK-style four-component JPEG artwork", () => {
  const technical = inspectRouteNoteJpeg(jpegFixture(3000, 3000, 4));
  assert.equal(technical.colorSpace, "NON_RGB");
  assert.match(routeNoteArtworkTechnicalProblems(technical).join(" "), /RGB-compatible/);
});

test("rejects truncated JPEG input", () => {
  assert.throws(
    () => inspectRouteNoteJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11])),
    /ROUTENOTE_MEDIA_JPEG_INVALID/
  );
});
