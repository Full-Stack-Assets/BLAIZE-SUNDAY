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
  if (typeof profile.trackId !== "string" || !profile.trackId.trim()) {
    throw new Error("explicit profile trackId required");
  }
  if (
    typeof profile.sourceSelectionReceipt !== "string" ||
    !profile.sourceSelectionReceipt.trim()
  ) {
    throw new Error("explicit profile sourceSelectionReceipt required");
  }
  if (typeof profile.note !== "string" || !profile.note.trim()) {
    throw new Error("explicit profile note required");
  }

  for (const key of ["highpassHz", "lowShelfHz", "highShelfHz"] as const) {
    const value = profile[key];
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`explicit profile ${key} must be null or a positive finite number`);
    }
  }
  for (const key of ["lowShelfDb", "highShelfDb", "outputGainDb"] as const) {
    if (!Number.isFinite(profile[key])) {
      throw new Error(`explicit profile ${key} must be a finite number`);
    }
  }
  if (typeof profile.applyCompressor !== "boolean") {
    throw new Error("explicit profile applyCompressor must be boolean");
  }
  if (profile.applyCompressor) {
    if (!profile.compressor) throw new Error("explicit profile compressor settings required");
    const { thresholdDb, ratio, attackMs, releaseMs } = profile.compressor;
    if (!Number.isFinite(thresholdDb)) {
      throw new Error("explicit profile compressor thresholdDb must be finite");
    }
    if (!Number.isFinite(ratio) || ratio <= 0) {
      throw new Error("explicit profile compressor ratio must be positive and finite");
    }
    if (!Number.isFinite(attackMs) || attackMs < 0) {
      throw new Error("explicit profile compressor attackMs must be non-negative and finite");
    }
    if (!Number.isFinite(releaseMs) || releaseMs < 0) {
      throw new Error("explicit profile compressor releaseMs must be non-negative and finite");
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
