import assert from "node:assert/strict";
import test from "node:test";

import {
  RouteNoteBrowserError,
  type RouteNoteBrowserJob,
  type RouteNoteBrowserPort,
  type RouteNoteLocator
} from "./routenote/index.ts";

const locator: RouteNoteLocator = {
  operation: "release-title",
  candidates: [{ kind: "label", value: "Release Title" }]
};

const fakePort: RouteNoteBrowserPort = {
  async goto() {},
  async currentUrl() {
    return "https://www.routenote.com/distribution";
  },
  async isVisible() {
    return true;
  },
  async click() {},
  async fill() {},
  async select() {},
  async check() {},
  async setInputFiles() {},
  async text() {
    return null;
  },
  async allText() {
    return [];
  },
  async waitForVisible() {},
  async screenshot() {}
};

const job: RouteNoteBrowserJob = {
  payloadHash: "abc123",
  payload: {
    provider: "routenote-free",
    releaseId: "release-1",
    artistName: "Test Artist",
    title: "Test Release",
    routeNoteForm: {
      releaseData: {
        upc: "GENERATE_FREE",
        releaseTitle: "Test Release"
      },
      albumDetails: {
        language: "en",
        primaryArtist: "Test Artist",
        primaryGenre: "Pop",
        secondaryGenre: "Alt Pop",
        compositionCopyright: "Test Artist",
        soundRecordingCopyright: "Test Artist",
        recordLabelName: "Test Artist",
        originalReleaseDate: "2026-08-25",
        salesStartDate: "2026-09-15",
        explicit: false
      },
      publishingDetails: [
        { firstName: "Test", lastName: "Artist", role: "composer" }
      ],
      manageStores: {
        requested: ["SPOTIFY", "APPLE_MUSIC", "YOUTUBE_MUSIC"],
        territoryMode: "WORLDWIDE"
      }
    },
    storePolicy: {
      requested: ["SPOTIFY", "APPLE_MUSIC", "YOUTUBE_MUSIC"],
      excluded: []
    },
    handoff: {
      mode: "BROWSER_AUTOMATION"
    }
  },
  assets: {
    audio: [
      {
        trackIndex: 1,
        path: "/tmp/track.flac",
        sha256: "a".repeat(64),
        title: "Test Release",
        artistName: "Test Artist",
        language: "en",
        explicit: false,
        writers: [
          { firstName: "Test", lastName: "Artist", role: "composer" }
        ]
      }
    ],
    artwork: {
      path: "/tmp/cover.jpg",
      sha256: "b".repeat(64)
    }
  }
};

test("RouteNote browser errors preserve stable codes", () => {
  const error = new RouteNoteBrowserError("ROUTENOTE_UI_CONTRACT_CHANGED");
  assert.equal(error.code, "ROUTENOTE_UI_CONTRACT_CHANGED");
  assert.equal(error.name, "RouteNoteBrowserError");
});

test("RouteNote browser port and job contracts are browser-runtime neutral", async () => {
  await fakePort.waitForVisible(locator);
  assert.equal(await fakePort.currentUrl(), "https://www.routenote.com/distribution");
  assert.equal(job.payload.routeNoteForm.releaseData.releaseTitle, "Test Release");
  assert.equal(job.assets.audio[0]?.trackIndex, 1);
});
