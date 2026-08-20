import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MasteringProfile {
  trackId: string;
  sourceSelectionReceipt: string;
  highpassHz: number | null;
  lowShelfHz: number | null;
  lowShelfDb: number;
  highShelfHz: number | null;
  highShelfDb: number;
  outputGainDb: number;
  applyCompressor: boolean;
  compressor?: {
    thresholdDb: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
  };
  note: string;
}

const requiredProfileKeys: Array<keyof MasteringProfile> = [
  "trackId",
  "sourceSelectionReceipt",
  "highpassHz",
  "lowShelfHz",
  "lowShelfDb",
  "highShelfHz",
  "highShelfDb",
  "outputGainDb",
  "applyCompressor",
  "note"
];

export function validateMasteringProfile(profile: MasteringProfile): void {
  if (!profile || typeof profile !== "object") throw new Error("explicit profile required");
  for (const key of requiredProfileKeys) {
    if (!(key in profile)) throw new Error(`explicit profile field missing: ${String(key)}`);
  }
  if (!profile.trackId || !profile.sourceSelectionReceipt || !profile.note) {
    throw new Error("explicit profile identifiers and note required");
  }
  if (profile.applyCompressor) {
    if (!profile.compressor) throw new Error("explicit profile compressor settings required");
    for (const key of ["thresholdDb", "ratio", "attackMs", "releaseMs"] as const) {
      if (!Number.isFinite(profile.compressor[key])) {
        throw new Error(`explicit profile compressor field invalid: ${key}`);
      }
    }
  }
}

export function buildAudioFilters(profile: MasteringProfile): string[] {
  validateMasteringProfile(profile);
  const filters: string[] = [];
  if (profile.highpassHz !== null) filters.push(`highpass=f=${profile.highpassHz}`);
  if (profile.lowShelfHz !== null && profile.lowShelfDb !== 0) {
    filters.push(`bass=g=${profile.lowShelfDb}:f=${profile.lowShelfHz}`);
  }
  if (profile.highShelfHz !== null && profile.highShelfDb !== 0) {
    filters.push(`treble=g=${profile.highShelfDb}:f=${profile.highShelfHz}`);
  }
  if (profile.applyCompressor && profile.compressor) {
    const c = profile.compressor;
    filters.push(
      `acompressor=threshold=${c.thresholdDb}dB:ratio=${c.ratio}:attack=${c.attackMs}:release=${c.releaseMs}`
    );
  }
  if (profile.outputGainDb !== 0) filters.push(`volume=${profile.outputGainDb}dB`);
  return filters;
}

export async function renderArchiveMasterCandidate(args: {
  inputPath: string;
  outputWav: string;
  outputFlac: string;
  outputMp3: string;
  profile: MasteringProfile;
}): Promise<void> {
  const { inputPath, outputWav, outputFlac, outputMp3, profile } = args;
  const filters = buildAudioFilters(profile);
  for (const path of [outputWav, outputFlac, outputMp3]) {
    await mkdir(dirname(path), { recursive: true });
  }

  const wavArgs = ["-y", "-v", "error", "-i", inputPath];
  if (filters.length > 0) wavArgs.push("-af", filters.join(","));
  wavArgs.push("-ar", "48000", "-c:a", "pcm_s24le", outputWav);
  await execFileAsync("ffmpeg", wavArgs, { maxBuffer: 8 * 1024 * 1024 });

  await execFileAsync(
    "ffmpeg",
    ["-y", "-v", "error", "-i", outputWav, "-c:a", "flac", outputFlac],
    { maxBuffer: 8 * 1024 * 1024 }
  );
  await execFileAsync(
    "ffmpeg",
    ["-y", "-v", "error", "-i", outputWav, "-c:a", "libmp3lame", "-b:a", "320k", outputMp3],
    { maxBuffer: 8 * 1024 * 1024 }
  );
}
