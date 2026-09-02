import assert from "node:assert/strict";
import test from "node:test";

import {
  executeRouteNoteWorkflow,
  type RouteNoteBrowserJob,
  type RouteNoteBrowserPort,
  type RouteNoteExecutionStep,
  type RouteNoteLocator
} from "./routenote/index.ts";

class ProgressPort implements RouteNoteBrowserPort {
  async goto() {}
  async currentUrl() { return "https://www.routenote.com/releases/release-1"; }
  async isVisible(target: RouteNoteLocator) {
    return target.operation.startsWith("audio-upload-confirmation:") ||
      target.operation === "artwork-upload-confirmation";
  }
  async click() {}
  async fill() {}
  async select() {}
  async check() {}
  async setInputFiles() {}
  async text() { return null; }
  async allText() { return []; }
  async waitForVisible() {}
  async screenshot() {}
}

function job(): RouteNoteBrowserJob {
  return {
    payloadHash: "payload-hash",
    payload: {
      provider: "routenote-free",
      releaseId: "release-1",
      artistName: "BLAIZE SUNDAY",
      title: "Signal",
      routeNoteForm: {
        releaseData: { upc: "GENERATE_FREE", releaseTitle: "Signal" },
        albumDetails: {
          language: "en",
          primaryArtist: "BLAIZE SUNDAY",
          primaryGenre: "Hip-Hop/Rap",
          secondaryGenre: "Alternative",
          compositionCopyright: "BLAIZE SUNDAY",
          soundRecordingCopyright: "BLAIZE SUNDAY",
          recordLabelName: "BLAIZE SUNDAY",
          originalReleaseDate: "2026-08-26",
          salesStartDate: "2026-09-12",
          explicit: false
        },
        publishingDetails: [
          { firstName: "Test", lastName: "Writer", role: "composer" }
        ],
        manageStores: {
          requested: ["SPOTIFY", "APPLE_MUSIC"],
          territoryMode: "WORLDWIDE"
        }
      },
      storePolicy: { requested: ["SPOTIFY", "APPLE_MUSIC"], excluded: [] },
      handoff: { mode: "BROWSER_AUTOMATION" }
    },
    assets: {
      audio: [{
        trackIndex: 1,
        path: "/tmp/master.flac",
        sha256: "a".repeat(64),
        title: "Signal",
        artistName: "BLAIZE SUNDAY",
        language: "en",
        explicit: false,
        writers: [{ firstName: "Test", lastName: "Writer", role: "composer" }]
      }],
      artwork: { path: "/tmp/cover.jpg", sha256: "b".repeat(64) }
    }
  };
}

test("RouteNote workflow emits durable progress after each completed provider step", async () => {
  const observed: RouteNoteExecutionStep[] = [];

  const receipt = await executeRouteNoteWorkflow(job(), new ProgressPort(), {
    onStep: step => { observed.push(step); }
  });

  assert.deepEqual(observed, receipt.completedSteps);
  assert.deepEqual(observed, [
    "SESSION_VERIFIED",
    "DRAFT_RESOLVED",
    "RELEASE_DATA_SAVED",
    "ALBUM_DETAILS_SAVED",
    "AUDIO_UPLOADED",
    "ARTWORK_UPLOADED",
    "STORES_CONFIGURED",
    "PROVIDER_VALIDATED"
  ]);
});
