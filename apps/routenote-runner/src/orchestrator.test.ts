import assert from "node:assert/strict";
import test from "node:test";

import type {
  RouteNoteBrowserJob,
  RouteNoteBrowserPort,
  RouteNoteExecutionReceipt
} from "../../../packages/integrations/src/index.ts";
import {
  createRouteNoteCliDependencies,
  type RouteNoteOrchestratorDependencies
} from "./orchestrator.ts";

function fakePort(): RouteNoteBrowserPort {
  return {
    async goto() {},
    async currentUrl() { return "https://www.routenote.com/"; },
    async isVisible() { return true; },
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

const job = {
  payload: {
    provider: "routenote-free",
    releaseId: "release-123",
    artistName: "BLAIZE SUNDAY",
    title: "Single",
    routeNoteForm: {
      releaseData: { upc: "GENERATE_FREE", releaseTitle: "Single" },
      albumDetails: {
        language: "en",
        primaryArtist: "BLAIZE SUNDAY",
        primaryGenre: "Hip-Hop/Rap",
        secondaryGenre: "Alternative",
        compositionCopyright: "2026 BLAIZE SUNDAY",
        soundRecordingCopyright: "2026 BLAIZE SUNDAY",
        recordLabelName: "BLAIZE SUNDAY",
        originalReleaseDate: "2026-08-26",
        salesStartDate: "2026-09-12",
        explicit: false
      },
      publishingDetails: [
        { firstName: "Test", lastName: "Writer", role: "composer" as const }
      ],
      manageStores: {
        requested: ["SPOTIFY", "APPLE_MUSIC", "YOUTUBE_MUSIC"],
        territoryMode: "WORLDWIDE" as const
      }
    },
    storePolicy: {
      requested: ["SPOTIFY", "APPLE_MUSIC", "YOUTUBE_MUSIC"],
      excluded: []
    },
    handoff: { mode: "BROWSER_AUTOMATION" as const }
  },
  payloadHash: "a".repeat(64),
  assets: {
    audio: [
      {
        trackIndex: 1,
        path: "/tmp/track.flac",
        sha256: "b".repeat(64),
        title: "Single",
        artistName: "BLAIZE SUNDAY",
        language: "en",
        explicit: false,
        writers: [
          { firstName: "Test", lastName: "Writer", role: "composer" as const }
        ]
      }
    ],
    artwork: { path: "/tmp/cover.jpg", sha256: "c".repeat(64) }
  }
} satisfies RouteNoteBrowserJob;

const receipt: RouteNoteExecutionReceipt = {
  releaseId: "release-123",
  payloadHash: "a".repeat(64),
  routeNoteReleaseId: "route-123",
  routeNoteReleaseUrl: "https://www.routenote.com/releases/route-123",
  startedAt: "2026-08-26T00:00:00.000Z",
  finishedAt: "2026-08-26T00:01:00.000Z",
  completedSteps: [
    "SESSION_VERIFIED",
    "DRAFT_RESOLVED",
    "RELEASE_DATA_SAVED",
    "ALBUM_DETAILS_SAVED",
    "AUDIO_UPLOADED",
    "ARTWORK_UPLOADED",
    "STORES_CONFIGURED",
    "PROVIDER_VALIDATED"
  ],
  tracks: [{ trackIndex: 1, title: "Single", uploaded: true }],
  artworkUploaded: true,
  storesConfigured: true,
  outcome: "DRAFT_READY"
};

function harness(env: NodeJS.ProcessEnv = {}) {
  const calls: string[] = [];
  const port = fakePort();
  const session = {
    port,
    profileDir: "/private/routenote-profile",
    executable: "/usr/bin/google-chrome",
    async close() { calls.push("browser:close"); },
    async waitForClose() { calls.push("browser:wait"); }
  };

  const dependencies: RouteNoteOrchestratorDependencies = {
    workspaceRoot: "/workspace",
    env,
    repository: {} as RouteNoteOrchestratorDependencies["repository"],
    releaseService: {} as RouteNoteOrchestratorDependencies["releaseService"],
    async prepareJob(releaseId) {
      calls.push(`prepare:${releaseId}`);
      return {
        job,
        release: {} as never,
        actionPackage: {} as never,
        approvalId: "approval-123"
      };
    },
    async launchBrowser(input) {
      calls.push(`launch:${input.headless === true ? "headless" : "headed"}`);
      return session;
    },
    async waitForAuthentication(_port, runtime) {
      calls.push(`auth:${runtime.timeoutMs}`);
    },
    async executeWorkflow(inputJob, inputPort) {
      assert.equal(inputJob, job);
      assert.equal(inputPort, port);
      calls.push("workflow");
      return receipt;
    },
    async persistReceipt(_repository, inputReceipt, workspaceRoot) {
      assert.equal(inputReceipt, receipt);
      assert.equal(workspaceRoot, "/workspace");
      calls.push("receipt");
      return { receiptPath: "/private/receipt.json" };
    }
  };

  return { dependencies, calls, session };
}

test("login launches headed Chrome, waits for authentication, then closes to flush profile", async () => {
  const { dependencies, calls } = harness({ ROUTENOTE_LOGIN_TIMEOUT_MS: "12345" });
  const cli = createRouteNoteCliDependencies(dependencies);

  const result = await cli.login();

  assert.deepEqual(result, { profileDir: "/private/routenote-profile" });
  assert.deepEqual(calls, ["launch:headed", "auth:12345", "browser:close"]);
});

test("upload composes canonical job, browser workflow, and DRAFT_READY persistence", async () => {
  const { dependencies, calls } = harness({ ROUTENOTE_HEADLESS: "1" });
  const cli = createRouteNoteCliDependencies(dependencies);

  const result = await cli.upload("release-123");

  assert.deepEqual(result, {
    outcome: "DRAFT_READY",
    releaseId: "release-123",
    receiptPath: "/private/receipt.json",
    routeNoteReleaseUrl: "https://www.routenote.com/releases/route-123",
    approvalId: "approval-123"
  });
  assert.deepEqual(calls, [
    "prepare:release-123",
    "launch:headless",
    "workflow",
    "receipt"
  ]);
});

test("upload closes Chrome after success when ROUTENOTE_CLOSE_BROWSER=1", async () => {
  const { dependencies, calls } = harness({ ROUTENOTE_CLOSE_BROWSER: "1" });
  const cli = createRouteNoteCliDependencies(dependencies);

  await cli.upload("release-123");

  assert.equal(calls.at(-1), "browser:close");
});

test("upload closes Chrome when browser workflow fails", async () => {
  const { dependencies, calls } = harness();
  dependencies.executeWorkflow = async () => {
    calls.push("workflow:error");
    throw new Error("provider changed");
  };
  const cli = createRouteNoteCliDependencies(dependencies);

  await assert.rejects(() => cli.upload("release-123"), /provider changed/);

  assert.equal(calls.at(-1), "browser:close");
});
