import { resolve } from "node:path";

import type {
  RouteNoteBrowserJob,
  RouteNoteDistributionPayload,
  RouteNoteWriter
} from "../../../packages/integrations/src/index.ts";
import type {
  ActionPackageRecord,
  ReleaseRecord,
  ReleaseRepository
} from "../../../packages/release/src/index.ts";
import { resolveVerifiedAsset, type ResolveVerifiedAssetInput } from "./assets.ts";
import { RouteNoteRunnerError } from "./errors.ts";

export interface RouteNoteReleaseServiceLike {
  prepareDistribution(input: {
    releaseId: string;
    provider: string;
    actor: string;
    approvalTtlMs?: number;
  }): Promise<{
    release: ReleaseRecord;
    actionPackage: ActionPackageRecord;
    approval: { id: string };
  }>;
}

export interface PrepareRouteNoteJobDependencies {
  repository: ReleaseRepository;
  releaseService: RouteNoteReleaseServiceLike;
  workspaceRoot: string;
  cacheDir?: string;
  resolveAsset?: (input: ResolveVerifiedAssetInput) => Promise<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWriter(value: unknown): value is RouteNoteWriter {
  if (!isRecord(value)) return false;
  return (
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    (value.role === "composer" || value.role === "lyricist")
  );
}

function isRouteNoteBrowserPayload(
  value: unknown
): value is RouteNoteDistributionPayload {
  if (!isRecord(value)) return false;
  if (value.provider !== "routenote-free") return false;
  if (typeof value.releaseId !== "string") return false;
  if (typeof value.artistName !== "string" || typeof value.title !== "string") {
    return false;
  }

  const handoff = value.handoff;
  const routeNoteForm = value.routeNoteForm;
  const storePolicy = value.storePolicy;
  if (!isRecord(handoff) || handoff.mode !== "BROWSER_AUTOMATION") return false;
  if (!isRecord(routeNoteForm) || !isRecord(storePolicy)) return false;

  const releaseData = routeNoteForm.releaseData;
  const albumDetails = routeNoteForm.albumDetails;
  const publishingDetails = routeNoteForm.publishingDetails;
  const manageStores = routeNoteForm.manageStores;
  if (
    !isRecord(releaseData) ||
    !isRecord(albumDetails) ||
    !Array.isArray(publishingDetails) ||
    !isRecord(manageStores)
  ) {
    return false;
  }

  if (
    typeof releaseData.releaseTitle !== "string" ||
    (releaseData.upc !== "GENERATE_FREE" && typeof releaseData.upc !== "string") ||
    typeof albumDetails.language !== "string" ||
    typeof albumDetails.primaryArtist !== "string" ||
    typeof albumDetails.primaryGenre !== "string" ||
    typeof albumDetails.secondaryGenre !== "string" ||
    typeof albumDetails.compositionCopyright !== "string" ||
    typeof albumDetails.soundRecordingCopyright !== "string" ||
    typeof albumDetails.recordLabelName !== "string" ||
    typeof albumDetails.originalReleaseDate !== "string" ||
    typeof albumDetails.salesStartDate !== "string" ||
    typeof albumDetails.explicit !== "boolean" ||
    !publishingDetails.every(isWriter) ||
    !Array.isArray(manageStores.requested) ||
    !manageStores.requested.every(item => typeof item === "string") ||
    manageStores.territoryMode !== "WORLDWIDE" ||
    !Array.isArray(storePolicy.requested) ||
    !storePolicy.requested.every(item => typeof item === "string") ||
    !Array.isArray(storePolicy.excluded) ||
    !storePolicy.excluded.every(item => typeof item === "string")
  ) {
    return false;
  }

  return true;
}

function newestRouteNotePackage(
  packages: ActionPackageRecord[]
): ActionPackageRecord | null {
  const matching = packages
    .filter(
      item =>
        item.provider === "routenote-free" &&
        item.actionType === "DISTRIBUTOR_SUBMISSION"
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return matching[0] ?? null;
}

export async function prepareRouteNoteJob(
  releaseId: string,
  dependencies: PrepareRouteNoteJobDependencies
) {
  const release = await dependencies.repository.findRelease(releaseId);
  if (!release) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_RELEASE_NOT_FOUND",
      `SongForge release not found: ${releaseId}`
    );
  }

  const context = await dependencies.repository.findPreparationContext(releaseId);
  if (!context) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_CONTEXT_NOT_FOUND",
      `SongForge preparation context not found: ${releaseId}`
    );
  }

  let currentRelease = release;
  let actionPackage: ActionPackageRecord;
  let approvalId: string | undefined;

  if (release.status === "PREPARED") {
    const prepared = await dependencies.releaseService.prepareDistribution({
      releaseId,
      provider: "routenote-free",
      actor: "routenote-runner"
    });
    currentRelease = prepared.release;
    actionPackage = prepared.actionPackage;
    approvalId = prepared.approval.id;
  } else if (release.status === "AWAITING_AUTHORIZATION") {
    const existing = newestRouteNotePackage(
      await dependencies.repository.listActionPackages(releaseId)
    );
    if (!existing) {
      throw new RouteNoteRunnerError(
        "ROUTENOTE_ACTION_PACKAGE_NOT_FOUND",
        `No RouteNote action package exists for ${releaseId}`
      );
    }
    actionPackage = existing;
  } else {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ACTION_PACKAGE_STALE",
      `Release ${releaseId} is not in a draft-preparation state: ${release.status}`
    );
  }

  if (!isRouteNoteBrowserPayload(actionPackage.payload)) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ACTION_PACKAGE_STALE",
      `Newest RouteNote action package is not a current BROWSER_AUTOMATION payload: ${actionPackage.id}`
    );
  }

  if (!context.master || !context.coverArt) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_CONTEXT_NOT_FOUND",
      `Release ${releaseId} is missing approved master or artwork context`
    );
  }

  const resolveAsset = dependencies.resolveAsset ?? resolveVerifiedAsset;
  const cacheDir =
    dependencies.cacheDir ??
    resolve(dependencies.workspaceRoot, ".songforge", "routenote", "cache");
  const [audioPath, artworkPath] = await Promise.all([
    resolveAsset({
      fileUrl: context.master.fileUrl,
      sha256: context.master.sha256,
      contentType: context.master.contentType,
      workspaceRoot: dependencies.workspaceRoot,
      cacheDir
    }),
    resolveAsset({
      fileUrl: context.coverArt.fileUrl,
      sha256: context.coverArt.sha256,
      contentType: context.coverArt.contentType,
      workspaceRoot: dependencies.workspaceRoot,
      cacheDir
    })
  ]);

  const payload = actionPackage.payload;
  const albumDetails = payload.routeNoteForm.albumDetails;
  const job: RouteNoteBrowserJob = {
    payload,
    payloadHash: actionPackage.payloadHash,
    assets: {
      audio: [
        {
          trackIndex: 1,
          path: audioPath,
          sha256: context.master.sha256,
          title: payload.title,
          artistName: payload.artistName,
          language: albumDetails.language,
          explicit: albumDetails.explicit,
          writers: payload.routeNoteForm.publishingDetails
        }
      ],
      artwork: {
        path: artworkPath,
        sha256: context.coverArt.sha256
      }
    }
  };

  return {
    job,
    release: currentRelease,
    actionPackage,
    approvalId
  };
}
