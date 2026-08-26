import assert from "node:assert/strict";
import test from "node:test";

import type { RouteNoteBrowserPort, RouteNoteExecutionReceipt } from "@songforge/integrations";
import {
  InMemoryReleaseRepository,
  ReleaseCommandService,
  type ReleasePreparationContext,
  type ReleaseRecord
} from "@songforge/release";
import {
  checkRouteNoteConnection,
  getRouteNoteControlSnapshot,
  loginRouteNote,
  prepareRouteNoteDraft,
  type RouteNoteControlDependencies
} from "./routenote-control.server.ts";

const now = new Date("2026-08-26T05:30:00.000Z");

function release(status: ReleaseRecord["status"] = "PREPARED"): ReleaseRecord {
  return {
    id: "release-1",
    projectId: "project-1",
    artistId: "artist-1",
    title: "Signal Test",
    status,
    provider: null,
    verifiedPlatformUrl: null,
    externalConfirmationId: null,
    createdAt: now,
    updatedAt: now
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

function fakePort(): RouteNoteBrowserPort {
  return {
    async goto() {},
    async currentUrl() { return "https://www.routenote.com/"; },
    async isVisible() { return false; },
    async click() {},
    async fill() {},
    async select() {},
    async check() {},
    async setInputFiles() {},
    async text() { return null; },
    async allText() { return []; },
    async waitForVisible() {},
    async screenshot() {}
  };
}

async function seededRepository() {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release());
  await repository.savePreparationContext(context());
  return repository;
}

async function dependencies(overrides: Partial<RouteNoteControlDependencies> = {}) {
  const repository = await seededRepository();
  const session = {
    port: fakePort(),
    profileDir: "/private/profile",
    executable: "/usr/bin/chromium",
    closed: false,
    async close() { this.closed = true; },
    async waitForClose() {}
  };

  const base: RouteNoteControlDependencies = {
    workspaceRoot: "/workspace",
    env: {},
    repository,
    releaseService: new ReleaseCommandService(repository),
    async launchBrowser() { return session; },
    async waitForAuthentication() {},
    async checkAuthenticated() { return true; },
    async prepareJob(releaseId) {
      return {
        job: { payload: {} as never, payloadHash: "hash", assets: { audio: [], artwork: { path: "", sha256: "" } } },
        release: release("AWAITING_AUTHORIZATION"),
        actionPackage: {} as never,
        approvalId: "approval-1"
      };
    },
    async executeWorkflow(): Promise<RouteNoteExecutionReceipt> {
      return {
        releaseId: "release-1",
        payloadHash: "hash",
        startedAt: now.toISOString(),
        completedAt: now.toISOString(),
        completedSteps: ["SESSION_VERIFIED", "DRAFT_RESOLVED", "PROVIDER_VALIDATED"],
        tracks: [{ trackIndex: 1, title: "Signal Test", uploaded: true }],
        artworkUploaded: true,
        storesConfigured: true,
        routeNoteReleaseUrl: "https://www.routenote.com/releases/route-1",
        outcome: "DRAFT_READY"
      };
    },
    async persistReceipt() { return { receiptPath: "/private/receipt.json" }; }
  };

  return { dependencies: { ...base, ...overrides }, repository, session };
}

test("snapshot projects canonical releases and current authenticated connection state", async () => {
  const { dependencies: deps } = await dependencies();

  const snapshot = await getRouteNoteControlSnapshot(deps);

  assert.equal(snapshot.status, "CONNECTED");
  assert.equal(snapshot.hostAvailable, true);
  assert.equal(snapshot.releases.length, 1);
  assert.equal(snapshot.releases[0]?.id, "release-1");
  assert.equal(snapshot.releases[0]?.readiness.ready, true);
});

test("snapshot reports browser host unavailable without hiding release readiness", async () => {
  const { dependencies: deps } = await dependencies({
    async launchBrowser() {
      throw Object.assign(new Error("private browser path"), { code: "ROUTENOTE_BROWSER_NOT_FOUND" });
    }
  });

  const snapshot = await getRouteNoteControlSnapshot(deps);

  assert.equal(snapshot.status, "NOT_CONNECTED");
  assert.equal(snapshot.hostAvailable, false);
  assert.equal(snapshot.releases[0]?.readiness.ready, true);
  assert.equal(JSON.stringify(snapshot).includes("private browser path"), false);
});

test("check requires a current provider-authenticated surface and closes the browser", async () => {
  const { dependencies: deps, session } = await dependencies({
    async checkAuthenticated() { return false; }
  });

  const connection = await checkRouteNoteConnection(deps);

  assert.equal(connection.status, "LOGIN_REQUIRED");
  assert.equal(session.closed, true);
});

test("login waits for operator authentication and closes the browser to flush the profile", async () => {
  let waited = false;
  const { dependencies: deps, session } = await dependencies({
    async waitForAuthentication() { waited = true; }
  });

  const connection = await loginRouteNote(deps);

  assert.equal(waited, true);
  assert.equal(connection.status, "CONNECTED");
  assert.equal(session.closed, true);
  assert.equal("profileDir" in connection, false);
});

test("draft preparation enforces canonical readiness before browser work", async () => {
  const repository = await seededRepository();
  const incomplete = context();
  incomplete.rights.warnings = ["unresolved"];
  await repository.savePreparationContext(incomplete);
  let launched = false;
  const { dependencies: deps } = await dependencies({
    repository,
    releaseService: new ReleaseCommandService(repository),
    async launchBrowser() {
      launched = true;
      throw new Error("should not launch");
    }
  });

  await assert.rejects(prepareRouteNoteDraft("release-1", deps), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "ROUTENOTE_RELEASE_NOT_READY");
    return true;
  });
  assert.equal(launched, false);
});

test("ready draft composition returns only sanitized DRAFT_READY provider evidence", async () => {
  const { dependencies: deps } = await dependencies();

  const draft = await prepareRouteNoteDraft("release-1", deps);

  assert.deepEqual(draft, {
    outcome: "DRAFT_READY",
    releaseId: "release-1",
    payloadHash: "hash",
    routeNoteReleaseUrl: "https://www.routenote.com/releases/route-1",
    completedSteps: ["SESSION_VERIFIED", "DRAFT_RESOLVED", "PROVIDER_VALIDATED"],
    tracks: [{ trackIndex: 1, title: "Signal Test", uploaded: true }],
    artworkUploaded: true,
    storesConfigured: true
  });
  assert.equal(JSON.stringify(draft).includes("/private/receipt.json"), false);
});

test("draft browser is closed when execution fails", async () => {
  const { dependencies: deps, session } = await dependencies({
    async executeWorkflow() { throw new Error("provider failed"); }
  });

  await assert.rejects(prepareRouteNoteDraft("release-1", deps), /provider failed/);
  assert.equal(session.closed, true);
});
