import assert from "node:assert/strict";
import test from "node:test";

import type { RouteNoteExecutionStep } from "@songforge/integrations";
import {
  InMemoryReleaseRepository,
  ReleaseCommandService,
  type ActionPackageRecord,
  type ReleasePreparationContext,
  type ReleaseRecord
} from "@songforge/release";
import {
  authorizeRouteNoteRelease,
  enqueueRouteNoteRun,
  preflightRouteNoteRelease,
  processNextRouteNoteRun,
  type RouteNoteRunControlDependencies,
  type RouteNoteRunRecord,
  type RouteNoteRunStore
} from "./routenote-run.server.ts";

const NOW = new Date("2026-08-26T16:00:00.000Z");

function release(): ReleaseRecord {
  return {
    id: "release-1",
    projectId: "project-1",
    artistId: "artist-1",
    title: "Signal Test",
    status: "PREPARED",
    provider: null,
    verifiedPlatformUrl: null,
    externalConfirmationId: null,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function context(): ReleasePreparationContext {
  return {
    releaseId: "release-1",
    projectId: "project-1",
    status: "PREPARED",
    artistName: "BLAIZE SUNDAY",
    title: "Signal Test",
    master: {
      id: "master-1",
      fileUrl: "/tmp/master.flac",
      sha256: "a".repeat(64),
      approved: true,
      durationSeconds: 180,
      contentType: "audio/flac",
      channels: 2,
      sampleRateHz: 44100,
      bitDepth: 16,
      bitrateKbps: 320
    },
    coverArt: {
      id: "cover-1",
      fileUrl: "/tmp/cover.jpg",
      sha256: "b".repeat(64),
      approved: true,
      width: 3000,
      height: 3000,
      contentType: "image/jpeg",
      fileSizeBytes: 5_000_000,
      colorSpace: "RGB"
    },
    metadata: {
      title: "Signal Test",
      artistName: "BLAIZE SUNDAY",
      genre: "Hip-Hop/Rap",
      subgenre: "Alternative",
      language: "en",
      explicit: false,
      description: "Test release",
      tags: [],
      credits: { artist: "BLAIZE SUNDAY" },
      labelName: "BLAIZE SUNDAY",
      cLine: "BLAIZE SUNDAY",
      pLine: "BLAIZE SUNDAY",
      writers: [{ firstName: "Test", lastName: "Writer", role: "composer" }],
      originalReleaseDate: "2026-08-26",
      salesStartDate: "2026-09-12",
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

class MemoryRunStore implements RouteNoteRunStore {
  records = new Map<string, RouteNoteRunRecord>();
  private byKey = new Map<string, string>();
  private sequence = 0;

  async createOrGet(input: Omit<RouteNoteRunRecord, "id" | "createdAt" | "updatedAt" | "status" | "currentStep" | "completedSteps" | "errorCode" | "draft"> & { idempotencyKey: string }) {
    const existingId = this.byKey.get(input.idempotencyKey);
    if (existingId) return structuredClone(this.records.get(existingId)!);
    const id = `run-${++this.sequence}`;
    const record: RouteNoteRunRecord = {
      id,
      ...input,
      status: "QUEUED",
      currentStep: null,
      completedSteps: [],
      errorCode: null,
      draft: null,
      createdAt: NOW,
      updatedAt: NOW
    };
    this.records.set(id, structuredClone(record));
    this.byKey.set(input.idempotencyKey, id);
    return structuredClone(record);
  }

  async get(id: string) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async latestForRelease(releaseId: string) {
    return [...this.records.values()].filter(item => item.releaseId === releaseId).at(-1) ?? null;
  }

  async claimNextQueued() {
    const record = [...this.records.values()].find(item => item.status === "QUEUED");
    if (!record) return null;
    record.status = "RUNNING";
    record.updatedAt = NOW;
    return structuredClone(record);
  }

  async updateProgress(id: string, completedSteps: RouteNoteExecutionStep[]) {
    const record = this.records.get(id)!;
    record.completedSteps = [...completedSteps];
    record.currentStep = completedSteps.at(-1) ?? null;
  }

  async complete(id: string, draft: NonNullable<RouteNoteRunRecord["draft"]>) {
    const record = this.records.get(id)!;
    record.status = "DRAFT_READY";
    record.draft = structuredClone(draft);
    record.completedSteps = [...draft.completedSteps];
    record.currentStep = draft.completedSteps.at(-1) ?? null;
  }

  async fail(id: string, errorCode: string, blocked: boolean) {
    const record = this.records.get(id)!;
    record.status = blocked ? "BLOCKED_OPERATOR_REVIEW" : "FAILED";
    record.errorCode = errorCode;
  }

  async recoverInterrupted() {
    let recovered = 0;
    for (const record of this.records.values()) {
      if (record.status !== "RUNNING") continue;
      record.status = "BLOCKED_OPERATOR_REVIEW";
      record.errorCode = "ROUTENOTE_RUN_INTERRUPTED";
      recovered += 1;
    }
    return recovered;
  }
}

async function fixture() {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release());
  await repository.savePreparationContext(context());
  const releaseService = new ReleaseCommandService(repository, {
    now: () => NOW,
    id: prefix => `${prefix}-1`
  });

  const dependencies: RouteNoteRunControlDependencies = {
    repository,
    releaseService,
    now: () => NOW,
    async prepareVerifiedJob(releaseId) {
      const current = await repository.findRelease(releaseId);
      if (!current) throw Object.assign(new Error("missing"), { code: "ROUTENOTE_RELEASE_NOT_FOUND" });
      let actionPackage: ActionPackageRecord;
      let approvalId: string | undefined;
      let preparedRelease = current;
      if (current.status === "PREPARED") {
        const prepared = await releaseService.prepareDistribution({
          releaseId,
          provider: "routenote-free",
          actor: "routenote-preflight"
        });
        actionPackage = prepared.actionPackage;
        approvalId = prepared.approval.id;
        preparedRelease = prepared.release;
      } else {
        const packages = await repository.listActionPackages(releaseId);
        actionPackage = packages.at(-1)!;
      }
      return {
        job: {
          payload: actionPackage.payload as never,
          payloadHash: actionPackage.payloadHash,
          assets: {
            audio: [{ trackIndex: 1, path: "/tmp/master.flac", sha256: "a".repeat(64), title: "Signal Test", artistName: "BLAIZE SUNDAY", language: "en", explicit: false, writers: [{ firstName: "Test", lastName: "Writer", role: "composer" as const }] }],
            artwork: { path: "/tmp/cover.jpg", sha256: "b".repeat(64) }
          }
        },
        release: preparedRelease,
        actionPackage,
        approvalId
      };
    },
    async executeDraft(releaseId, onStep) {
      const completedSteps: RouteNoteExecutionStep[] = [];
      for (const step of ["SESSION_VERIFIED", "DRAFT_RESOLVED", "AUDIO_UPLOADED", "ARTWORK_UPLOADED", "STORES_CONFIGURED", "PROVIDER_VALIDATED"] as RouteNoteExecutionStep[]) {
        completedSteps.push(step);
        await onStep(step);
      }
      return {
        outcome: "DRAFT_READY",
        releaseId,
        payloadHash: (await repository.listActionPackages(releaseId)).at(-1)!.payloadHash,
        routeNoteReleaseUrl: "https://www.routenote.com/releases/release-1",
        completedSteps,
        tracks: [{ trackIndex: 1, title: "Signal Test", uploaded: true }],
        artworkUploaded: true,
        storesConfigured: true
      };
    }
  };

  return { repository, dependencies, store: new MemoryRunStore() };
}

test("preflight creates an exact payload-bound pending approval and verifies approved asset hashes", async () => {
  const { dependencies } = await fixture();
  const preflight = await preflightRouteNoteRelease("release-1", dependencies);

  assert.equal(preflight.ready, true);
  assert.equal(preflight.releaseId, "release-1");
  assert.equal(preflight.actionPackageId, "package-1");
  assert.equal(preflight.approvalId, "approval-1");
  assert.equal(preflight.approvalStatus, "PENDING");
  assert.deepEqual(preflight.audioSha256, ["a".repeat(64)]);
  assert.equal(preflight.artworkSha256, "b".repeat(64));
});

test("authorization resolves the exact current package rather than granting release-wide permission", async () => {
  const { dependencies, repository } = await fixture();
  const authorized = await authorizeRouteNoteRelease("release-1", dependencies);
  const approval = await repository.findApproval(authorized.approvalId);

  assert.equal(authorized.approvalStatus, "APPROVED");
  assert.equal(approval?.status, "APPROVED");
  assert.equal(approval?.payloadHash, authorized.payloadHash);
});

test("run enqueue is fail-closed before package approval and idempotent after approval", async () => {
  const { dependencies, store } = await fixture();
  await preflightRouteNoteRelease("release-1", dependencies);

  await assert.rejects(
    enqueueRouteNoteRun("release-1", dependencies, store),
    (error: unknown) => (error as { code?: string }).code === "ROUTENOTE_PACKAGE_NOT_AUTHORIZED"
  );

  await authorizeRouteNoteRelease("release-1", dependencies);
  const first = await enqueueRouteNoteRun("release-1", dependencies, store);
  const second = await enqueueRouteNoteRun("release-1", dependencies, store);

  assert.equal(first.status, "QUEUED");
  assert.equal(first.id, second.id);
});

test("queued browser work survives the request boundary and records real progress plus DRAFT_READY evidence", async () => {
  const { dependencies, store } = await fixture();
  await authorizeRouteNoteRelease("release-1", dependencies);
  const queued = await enqueueRouteNoteRun("release-1", dependencies, store);

  assert.equal(queued.status, "QUEUED");
  assert.equal(await processNextRouteNoteRun(dependencies, store), true);

  const finished = await store.get(queued.id);
  assert.equal(finished?.status, "DRAFT_READY");
  assert.equal(finished?.currentStep, "PROVIDER_VALIDATED");
  assert.equal(finished?.draft?.outcome, "DRAFT_READY");
  assert.equal(finished?.draft?.storesConfigured, true);
});
