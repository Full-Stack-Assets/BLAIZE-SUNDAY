import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryReleaseRepository,
  ReleaseCommandService,
  buildDistributionPayload,
  type ActionPackageRecord,
  type ReleasePreparationContext,
  type ReleaseRecord,
  type ReleaseRepository
} from "../../../packages/release/src/index.ts";

import { RouteNoteRunnerError } from "./errors.ts";
import { prepareRouteNoteJob } from "./job.ts";

const NOW = new Date("2026-08-26T04:00:00.000Z");

function release(status: ReleaseRecord["status"] = "PREPARED"): ReleaseRecord {
  return {
    id: "release-1",
    projectId: "project-1",
    artistId: "artist-1",
    title: "Chrome Receipt",
    status,
    provider: status === "AWAITING_AUTHORIZATION" ? "routenote-free" : null,
    verifiedPlatformUrl: null,
    externalConfirmationId: null,
    scheduledReleaseDate: null,
    liveDate: null,
    createdAt: new Date(NOW.getTime() - 1000),
    updatedAt: new Date(NOW.getTime() - 1000)
  };
}

function context(
  status: ReleasePreparationContext["status"] = "PREPARED"
): ReleasePreparationContext {
  return {
    releaseId: "release-1",
    projectId: "project-1",
    status,
    artistName: "BLAIZE SUNDAY",
    title: "Chrome Receipt",
    master: {
      id: "audio-1",
      fileUrl: "album/chrome-receipt.flac",
      sha256: "a".repeat(64),
      approved: true,
      durationSeconds: 138,
      contentType: "audio/flac",
      channels: 2,
      sampleRateHz: 44_100,
      bitDepth: 16,
      bitrateKbps: 320
    },
    coverArt: {
      id: "art-1",
      fileUrl: "album/cover.jpg",
      sha256: "b".repeat(64),
      approved: true,
      width: 3000,
      height: 3000,
      contentType: "image/jpeg",
      fileSizeBytes: 5_000_000,
      colorSpace: "RGB"
    },
    metadata: {
      title: "Chrome Receipt",
      artistName: "BLAIZE SUNDAY",
      genre: "Pop",
      subgenre: "Alt Pop",
      language: "en",
      explicit: false,
      description: "test",
      tags: ["test"],
      credits: { primaryArtist: "BLAIZE SUNDAY" },
      labelName: "BLAIZE SUNDAY",
      cLine: "Test Artist",
      pLine: "Test Artist",
      writers: [
        { firstName: "Test", lastName: "Artist", role: "composer" },
        { firstName: "Test", lastName: "Artist", role: "lyricist" }
      ],
      originalReleaseDate: "2026-08-26",
      salesStartDate: "2026-09-15",
      aiAssisted: false,
      aiSourceUrls: []
    },
    rights: {
      approved: true,
      ownershipConfirmed: true,
      provenanceComplete: true,
      warnings: []
    }
  };
}

function service(repository: ReleaseRepository) {
  let counter = 0;
  return new ReleaseCommandService(repository, {
    now: () => NOW,
    id: prefix => `${prefix}-${++counter}`
  });
}

async function seeded(
  status: ReleaseRecord["status"] = "PREPARED"
): Promise<InMemoryReleaseRepository> {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release(status));
  await repository.savePreparationContext(
    context(status === "PREPARED" ? "PREPARED" : "AWAITING_AUTHORIZATION")
  );
  return repository;
}

const resolveAsset = async (input: { contentType: string }) =>
  input.contentType.startsWith("audio/")
    ? "/verified/chrome-receipt.flac"
    : "/verified/cover.jpg";

test("job builder fails when the canonical release does not exist", async () => {
  const repository = new InMemoryReleaseRepository();

  await assert.rejects(
    prepareRouteNoteJob("missing", {
      repository,
      releaseService: service(repository),
      resolveAsset,
      workspaceRoot: "/workspace"
    }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_RELEASE_NOT_FOUND");
      return true;
    }
  );
});

test("job builder fails when canonical preparation context is unavailable", async () => {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release());

  await assert.rejects(
    prepareRouteNoteJob("release-1", {
      repository,
      releaseService: service(repository),
      resolveAsset,
      workspaceRoot: "/workspace"
    }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_CONTEXT_NOT_FOUND");
      return true;
    }
  );
});

test("PREPARED release becomes an authorization-gated RouteNote browser job", async () => {
  const repository = await seeded("PREPARED");

  const result = await prepareRouteNoteJob("release-1", {
    repository,
    releaseService: service(repository),
    resolveAsset,
    workspaceRoot: "/workspace"
  });

  assert.equal(result.release.status, "AWAITING_AUTHORIZATION");
  assert.equal(result.actionPackage.provider, "routenote-free");
  assert.equal(result.approvalId?.startsWith("approval-"), true);
  assert.equal(result.job.payloadHash, result.actionPackage.payloadHash);
  assert.equal(result.job.payload.handoff.mode, "BROWSER_AUTOMATION");
  assert.equal(result.job.assets.audio.length, 1);
  assert.deepEqual(result.job.assets.audio[0], {
    trackIndex: 1,
    path: "/verified/chrome-receipt.flac",
    sha256: "a".repeat(64),
    title: "Chrome Receipt",
    artistName: "BLAIZE SUNDAY",
    language: "en",
    explicit: false,
    writers: [
      { firstName: "Test", lastName: "Artist", role: "composer" },
      { firstName: "Test", lastName: "Artist", role: "lyricist" }
    ]
  });
  assert.deepEqual(result.job.assets.artwork, {
    path: "/verified/cover.jpg",
    sha256: "b".repeat(64)
  });

  assert.equal((await repository.listExternalReceipts("release-1")).length, 0);
});

test("AWAITING_AUTHORIZATION reuses the newest current browser action package", async () => {
  const repository = await seeded("AWAITING_AUTHORIZATION");
  const preparedPayload = buildDistributionPayload(context("PREPARED"), "routenote-free");

  const older: ActionPackageRecord = {
    id: "package-old",
    releaseId: "release-1",
    actionType: "DISTRIBUTOR_SUBMISSION",
    provider: "routenote-free",
    payload: { stale: true },
    payloadHash: "old",
    createdAt: new Date(NOW.getTime() - 2000)
  };
  const current: ActionPackageRecord = {
    id: "package-current",
    releaseId: "release-1",
    actionType: "DISTRIBUTOR_SUBMISSION",
    provider: "routenote-free",
    payload: preparedPayload.payload,
    payloadHash: preparedPayload.payloadHash,
    createdAt: new Date(NOW.getTime() - 1000)
  };
  await repository.saveActionPackage(older);
  await repository.saveActionPackage(current);

  const result = await prepareRouteNoteJob("release-1", {
    repository,
    releaseService: {
      async prepareDistribution() {
        throw new Error("prepareDistribution must not run while awaiting authorization");
      }
    },
    resolveAsset,
    workspaceRoot: "/workspace"
  });

  assert.equal(result.actionPackage.id, "package-current");
  assert.equal(result.approvalId, undefined);
  assert.equal(result.job.payloadHash, preparedPayload.payloadHash);
});

test("AWAITING_AUTHORIZATION rejects a stale manual RouteNote package", async () => {
  const repository = await seeded("AWAITING_AUTHORIZATION");
  const preparedPayload = buildDistributionPayload(context("PREPARED"), "routenote-free");
  const payload = structuredClone(preparedPayload.payload) as Record<string, any>;
  payload.handoff = {
    mode: "MANUAL_IOS_REQUIRED",
    submissionSupported: false
  };

  await repository.saveActionPackage({
    id: "package-manual",
    releaseId: "release-1",
    actionType: "DISTRIBUTOR_SUBMISSION",
    provider: "routenote-free",
    payload,
    payloadHash: "manual-hash",
    createdAt: NOW
  });

  await assert.rejects(
    prepareRouteNoteJob("release-1", {
      repository,
      releaseService: service(repository),
      resolveAsset,
      workspaceRoot: "/workspace"
    }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_ACTION_PACKAGE_STALE");
      return true;
    }
  );
});

test("AWAITING_AUTHORIZATION fails when no RouteNote action package exists", async () => {
  const repository = await seeded("AWAITING_AUTHORIZATION");

  await assert.rejects(
    prepareRouteNoteJob("release-1", {
      repository,
      releaseService: service(repository),
      resolveAsset,
      workspaceRoot: "/workspace"
    }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_ACTION_PACKAGE_NOT_FOUND");
      return true;
    }
  );
});
