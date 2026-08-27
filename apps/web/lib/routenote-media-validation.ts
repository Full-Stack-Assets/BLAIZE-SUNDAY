export const ROUTENOTE_MASTER_MAX_BYTES = 512 * 1024 * 1024;
export const ROUTENOTE_ARTWORK_MAX_BYTES = 25 * 1024 * 1024;

export interface RouteNoteAudioTechnical {
  durationSeconds: number;
  channels: number;
  sampleRateHz: number;
  bitDepth: number;
  bitrateKbps: number;
}

export interface RouteNoteJpegTechnical {
  width: number;
  height: number;
  precisionBits: number;
  components: number;
  colorSpace: "RGB" | "NON_RGB";
  fileSizeBytes: number;
}

export function routeNoteAudioTechnicalProblems(
  input: RouteNoteAudioTechnical
): string[] {
  const problems: string[] = [];
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < 30 || input.durationSeconds > 600) {
    problems.push("duration must be between 30 and 600 seconds");
  }
  if (input.channels !== 2) problems.push("audio must be stereo");
  if (input.sampleRateHz !== 44_100) problems.push("sample rate must be 44.1 kHz");
  if (input.bitDepth !== 16) problems.push("bit depth must be 16-bit");
  if (!Number.isFinite(input.bitrateKbps) || input.bitrateKbps < 320) {
    problems.push("effective bitrate must be at least 320 kbps");
  }
  return problems;
}

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

export function inspectRouteNoteJpeg(buffer: Uint8Array): RouteNoteJpegTechnical {
  const bytes = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (
    bytes.length < 12 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  ) {
    throw new Error("ROUTENOTE_MEDIA_JPEG_INVALID");
  }

  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset]!;
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new Error("ROUTENOTE_MEDIA_JPEG_INVALID");
    }

    if (SOF_MARKERS.has(marker)) {
      if (segmentLength < 8) throw new Error("ROUTENOTE_MEDIA_JPEG_INVALID");
      const precisionBits = bytes[offset + 2]!;
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      const components = bytes[offset + 7]!;
      return {
        width,
        height,
        precisionBits,
        components,
        colorSpace: components === 3 ? "RGB" : "NON_RGB",
        fileSizeBytes: bytes.length
      };
    }

    offset += segmentLength;
  }

  throw new Error("ROUTENOTE_MEDIA_JPEG_INVALID");
}

export function routeNoteArtworkTechnicalProblems(
  input: RouteNoteJpegTechnical
): string[] {
  const problems: string[] = [];
  if (input.width !== 3000 || input.height !== 3000) {
    problems.push("artwork must be exactly 3000×3000 pixels");
  }
  if (input.precisionBits !== 8) problems.push("artwork must be 8-bit JPEG");
  if (input.components !== 3 || input.colorSpace !== "RGB") {
    problems.push("artwork must be RGB-compatible, not grayscale or CMYK");
  }
  if (input.fileSizeBytes <= 0 || input.fileSizeBytes > ROUTENOTE_ARTWORK_MAX_BYTES) {
    problems.push("artwork must be 25 MiB or smaller");
  }
  return problems;
}
