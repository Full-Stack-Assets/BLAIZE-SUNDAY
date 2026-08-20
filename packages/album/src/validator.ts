import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { inspectMedia } from "./media.ts";
import { hashFile } from "./provenance.ts";
import type { AlbumManifest } from "./types.ts";

export interface ValidationReport {
  status: "PASS" | "FAIL";
  completionState:
    "VERIFIED_COMPLETE" | "COMPLETE_PENDING_HUMAN_APPROVAL" | "BLOCKED" | "UNVERIFIED";
  errors: string[];
  warnings: string[];
  blockedSources: string[];
  verifiedAssets: string[];
}

export function lintDerivativeTerminology(
  filename: string,
  asset: { nativeStem: boolean }
): string[] {
  if (asset.nativeStem) return [];
  const upper = filename.toUpperCase();
  const forbidden = ["NATIVE_INSTRUMENTAL", "NATIVE_STEM", "DRY_LEAD", "ORIGINAL_MASTER"];
  return forbidden.some((term) => upper.includes(term))
    ? ["derived asset must not use native terminology"]
    : [];
}

async function existsNonZero(path: string): Promise<boolean> {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function parseChecksums(path: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const text = await readFile(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/i);
      if (match) map.set(match[2]!, match[1]!.toLowerCase());
    }
  } catch {
    return map;
  }
  return map;
}

export async function validateAlbumPackage(args: {
  root: string;
  manifest: AlbumManifest;
}): Promise<ValidationReport> {
  const { root, manifest } = args;
  const errors: string[] = [];
  const warnings: string[] = [];
  const blockedSources: string[] = [];
  const verifiedAssets: string[] = [];
  let humanApprovalPending = false;

  if (manifest.catalogState !== "CURATED_REFERENCE_MASTER") {
    errors.push("current edition must use CURATED_REFERENCE_MASTER catalog state");
  }
  if (manifest.releaseAuthorized)
    errors.push("album package validator cannot authorize public release");

  for (const track of manifest.tracks) {
    if (track.evidenceState === "BLOCKED_SOURCE_MISSING") blockedSources.push(track.id);
    const checksumPath = join(root, track.id, "METADATA", "checksums.sha256");
    const checksumMap = await parseChecksums(checksumPath);

    for (const asset of track.deliverables) {
      for (const issue of lintDerivativeTerminology(asset.filename, asset)) {
        errors.push(`${track.id}/${asset.filename}: ${issue}`);
      }
      if (asset.catalogState === "NATIVE_STEM_MASTER" && !asset.nativeStem) {
        errors.push(
          `${track.id}/${asset.filename}: non-native asset cannot claim NATIVE_STEM_MASTER`
        );
      }
      if (asset.presence === "blocked_source_missing" || asset.presence === "not_applicable")
        continue;
      if (asset.presence === "present_needs_human_approval") humanApprovalPending = true;

      const path = join(root, track.id, asset.filename);
      if (!(await existsNonZero(path))) {
        errors.push(`${track.id}/${asset.filename}: expected asset missing or zero-byte`);
        continue;
      }
      const assetErrorCountBefore = errors.length;

      if (/\.(wav|flac|mp3)$/i.test(asset.filename)) {
        try {
          const inspection = await inspectMedia(path);
          if (asset.filename.endsWith(".wav")) {
            if (inspection.sampleRateHz !== 48000 || inspection.bitDepth !== 24) {
              errors.push(`${track.id}/${asset.filename}: WAV must be 48 kHz / 24-bit`);
            }
          }
          if (asset.filename.endsWith("_REFERENCE_320.mp3") && (inspection.bitRate ?? 0) < 300000) {
            errors.push(`${track.id}/${asset.filename}: reference MP3 must be 320 kbps class`);
          }
        } catch (error) {
          errors.push(
            `${track.id}/${asset.filename}: ${error instanceof Error ? error.message : "media validation failed"}`
          );
        }
      }

      if (asset.filename.startsWith("MASTER/")) {
        const baseName = asset.filename.split("/").pop()!;
        if (checksumMap.size === 0) {
          errors.push(`${track.id}/${asset.filename}: checksum file missing or empty`);
        } else {
          const expectedHash = checksumMap.get(baseName);
          if (!expectedHash) {
            errors.push(`${track.id}/${asset.filename}: emitted master missing from checksum file`);
          } else {
            const actualHash = await hashFile(path);
            if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
              errors.push(`${track.id}/${asset.filename}: checksum mismatch`);
            }
          }
        }
      }

      if (errors.length === assetErrorCountBefore) {
        verifiedAssets.push(`${track.id}/${asset.filename}`);
      }
    }
  }

  const completionState: ValidationReport["completionState"] =
    errors.length > 0
      ? "UNVERIFIED"
      : blockedSources.length > 0
        ? "BLOCKED"
        : humanApprovalPending
          ? "COMPLETE_PENDING_HUMAN_APPROVAL"
          : "VERIFIED_COMPLETE";

  if (blockedSources.length > 0) {
    warnings.push(`audio source payload remains blocked for: ${blockedSources.join(", ")}`);
  }

  return {
    status: errors.length > 0 ? "FAIL" : "PASS",
    completionState,
    errors,
    warnings,
    blockedSources,
    verifiedAssets
  };
}
