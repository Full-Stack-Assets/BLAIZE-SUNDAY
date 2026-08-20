import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { TRACKS, requiredDeliverables, REQUIRED_SUPPORT_FILES } from "./catalog.ts";
import type { AlbumAssetRecord, AlbumManifest, SourceStateRecord, TrackRecord } from "./types.ts";

export type SourceStateMap = Record<string, SourceStateRecord>;

export function buildAlbumManifest(sourceState: SourceStateMap): AlbumManifest {
  const tracks: TrackRecord[] = TRACKS.map((track) => {
    const state = sourceState[track.id]?.evidence_state ?? "UNKNOWN";
    const blocked = state === "BLOCKED_SOURCE_MISSING";
    const lifecycleStatus = Number(track.id.slice(0, 2)) <= 3 ? "QA" : "DEMO";
    const deliverables: AlbumAssetRecord[] = requiredDeliverables(track).map((filename, index) => {
      const isCurrentPlanPrimary =
        filename.startsWith("MASTER/") || filename.startsWith("METADATA/");
      const isAudioDependent =
        filename.startsWith("MASTER/") ||
        filename.startsWith("ALTERNATES/") ||
        filename.startsWith("METADATA/");
      const presence = blocked
        ? isAudioDependent
          ? "blocked_source_missing"
          : "not_applicable"
        : isCurrentPlanPrimary
          ? "present_needs_human_approval"
          : "not_applicable";
      return {
        assetId: `${track.id}:${index + 1}`,
        trackId: track.id,
        filename,
        canonAssetState:
          filename.includes("_DERIVED") || filename.includes("_MIX.wav")
            ? "DERIVED_REPAIR_ONLY"
            : "CANDIDATE",
        catalogState: "CURATED_REFERENCE_MASTER",
        evidenceState: state,
        presence,
        nativeStem: false,
        canonical: false
      };
    });
    return {
      ...track,
      evidenceState: state,
      lifecycleStatus,
      deliverables
    };
  });

  return {
    artist: "BLAIZE SUNDAY",
    title: "LOOKS EXPENSIVE, FEELS WEIRD",
    edition: "Archive Remaster / Derived Production Edition",
    catalogState: "CURATED_REFERENCE_MASTER",
    releaseAuthorized: false,
    tracks
  };
}

export async function bootstrapAlbumTree(outputRoot: string): Promise<void> {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(join(outputRoot, "00_ALBUM"), { recursive: true });
  await mkdir(join(outputRoot, "00_EVIDENCE"), { recursive: true });
  for (const track of TRACKS) {
    for (const subdir of ["MASTER", "ALTERNATES", "ART", "VIDEO", "METADATA"]) {
      await mkdir(join(outputRoot, track.id, subdir), { recursive: true });
    }
    for (const support of REQUIRED_SUPPORT_FILES) {
      const parent = support.split("/").slice(0, -1).join("/");
      await mkdir(join(outputRoot, track.id, parent), { recursive: true });
    }
  }
  for (const extra of ["90_CAMPAIGN", "95_RIGHTS_PROVENANCE", "99_QC_RECEIPTS"]) {
    await mkdir(join(outputRoot, extra), { recursive: true });
  }
}
