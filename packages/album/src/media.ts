import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MediaInspection {
  codec: string | null;
  durationSeconds: number;
  sampleRateHz: number | null;
  channels: number | null;
  bitDepth: number | null;
  formatName: string | null;
  bitRate: number | null;
}

interface ProbeLike {
  streams?: Array<Record<string, unknown>>;
  format?: Record<string, unknown>;
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeProbe(probe: ProbeLike): MediaInspection {
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio") ?? probe.streams?.[0] ?? {};
  const format = probe.format ?? {};
  const streamBitRate = numberOrNull(audio.bit_rate);
  const formatBitRate = numberOrNull(format.bit_rate);
  const duration = numberOrNull(format.duration) ?? numberOrNull(audio.duration) ?? 0;
  return {
    codec: typeof audio.codec_name === "string" ? audio.codec_name : null,
    durationSeconds: duration,
    sampleRateHz: numberOrNull(audio.sample_rate),
    channels: numberOrNull(audio.channels),
    bitDepth: (() => {
      const depth = numberOrNull(audio.bits_per_raw_sample) ?? numberOrNull(audio.bits_per_sample);
      return depth && depth > 0 ? depth : null;
    })(),
    formatName: typeof format.format_name === "string" ? format.format_name : null,
    bitRate: streamBitRate ?? formatBitRate,
  };
}

export function assertAudioDecodes(inspection: MediaInspection): void {
  if (!inspection.codec || inspection.durationSeconds <= 0) {
    throw new Error("MEDIA_DECODE_INVALID");
  }
}

export async function inspectMedia(path: string): Promise<MediaInspection> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      path,
    ], { maxBuffer: 8 * 1024 * 1024 });
    const inspection = normalizeProbe(JSON.parse(stdout) as ProbeLike);
    assertAudioDecodes(inspection);
    return inspection;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT") throw new Error("FFPROBE_UNAVAILABLE", { cause: error });
    if (error instanceof Error && error.message === "MEDIA_DECODE_INVALID") throw error;
    throw new Error("MEDIA_PROBE_FAILED", { cause: error });
  }
}
