import assert from "node:assert/strict";
import test from "node:test";

import {
  executeRouteNoteWorkflow,
  RouteNoteBrowserError,
  type RouteNoteBrowserJob,
  type RouteNoteBrowserPort,
  type RouteNoteLocator
} from "./routenote/index.ts";

const locator: RouteNoteLocator = {
  operation: "release-title",
  candidates: [{ kind: "label", value: "Release Title" }]
};

class RecordingPort implements RouteNoteBrowserPort {
  readonly events: string[] = [];
  readonly visibility = new Map<string, boolean>();
  readonly texts = new Map<string, string | null>();
  readonly textLists = new Map<string, string[]>();
  readonly fileBatches: string[][] = [];
  readonly audioFileBatches: string[][] = [];
  readonly checks = new Map<string, boolean>();

  async goto(url: string) {
    this.events.push(`goto:${url}`);
  }

  async currentUrl() {
    return "https://www.routenote.com/distribution";
  }

  async isVisible(target: RouteNoteLocator) {
    this.events.push(`visible:${target.operation}`);
    return this.visibility.get(target.operation) ?? false;
  }

  async click(target: RouteNoteLocator) {
    this.events.push(`click:${target.operation}`);
  }

  async fill(target: RouteNoteLocator, value: string) {
    this.events.push(`fill:${target.operation}=${value}`);
  }

  async select(target: RouteNoteLocator, value: string) {
    this.events.push(`select:${target.operation}=${value}`);
  }

  async check(target: RouteNoteLocator, checked: boolean) {
    this.checks.set(target.operation, checked);
    this.events.push(`check:${target.operation}=${checked}`);
  }

  async setInputFiles(target: RouteNoteLocator, paths: string[]) {
    this.fileBatches.push([...paths]);
    if (target.operation === "audio-file-input") {
      this.audioFileBatches.push([...paths]);
    }
    this.events.push(`files:${target.operation}=${paths.length}`);
  }

  async text(target: RouteNoteLocator) {
    this.events.push(`text:${target.operation}`);
    return this.texts.get(target.operation) ?? null;
  }

  async allText(target: RouteNoteLocator) {
    this.events.push(`allText:${target.operation}`);
    return this.textLists.get(target.operation) ?? [];
  }

  async waitForVisible(target: RouteNoteLocator) {
    this.events.push(`wait:${target.operation}`);
  }

  async screenshot(path: string) {
    this.events.push(`screenshot:${path}`);
  }
}

function makeJob(trackCount = 1, excluded: string[] = []): RouteNoteBrowserJob {
  return {
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
        excluded
      },
      handoff: {
        mode: "BROWSER_AUTOMATION"
      }
    },
    assets: {
      audio: Array.from({ length: trackCount }, (_, offset) => {
        const trackIndex = trackCount - offset;
        return {
          trackIndex,
          path: `/tmp/track-${trackIndex}.flac`,
          sha256: "a".repeat(64),
          title: `Track ${trackIndex}`,
          artistName: "Test Artist",
          language: "en",
          explicit: false,
          writers: [
            { firstName: "Test", lastName: "Artist", role: "composer" as const }
          ]
        };
      }),
      artwork: {
        path: "/tmp/cover.jpg",
        sha256: "b".repeat(64)
      }
    }
  };
}

function readyPort(job: RouteNoteBrowserJob) {
  const port = new RecordingPort();
  for (const track of job.assets.audio) {
    port.visibility.set(`audio-upload-confirmation:${track.trackIndex}`, true);
  }
  port.visibility.set("artwork-upload-confirmation", true);
  return port;
}

test("RouteNote browser errors preserve stable codes", () => {
  const error = new RouteNoteBrowserError("ROUTENOTE_UI_CONTRACT_CHANGED");
  assert.equal(error.code, "ROUTENOTE_UI_CONTRACT_CHANGED");
  assert.equal(error.name, "RouteNoteBrowserError");
});

test("RouteNote browser port and job contracts are browser-runtime neutral", async () => {
  const port = new RecordingPort();
  await port.waitForVisible(locator);
  assert.equal(await port.currentUrl(), "https://www.routenote.com/distribution");
  assert.equal(makeJob().payload.routeNoteForm.releaseData.releaseTitle, "Test Release");
});

test("draft preparation enters canonical metadata and never distributes", async () => {
  const job = makeJob();
  const port = readyPort(job);

  const receipt = await executeRouteNoteWorkflow(job, port, {
    now: () => new Date("2026-08-25T22:00:00.000Z")
  });

  assert.equal(receipt.outcome, "DRAFT_READY");
  assert.equal(receipt.releaseId, "release-1");
  assert.equal(receipt.payloadHash, "abc123");
  assert.ok(port.events.includes("fill:release-title=Test Release"));
  assert.ok(port.events.includes("select:album-language=en"));
  assert.ok(port.events.includes("fill:album-primary-artist=Test Artist"));
  assert.ok(port.events.includes("select:album-primary-genre=Pop"));
  assert.ok(port.events.includes("fill:album-record-label=Test Artist"));
  assert.equal(port.events.some(event => event.includes("distribute-free")), false);
});

test("audio is sorted by canonical track index and uploaded in batches of at most 15", async () => {
  const job = makeJob(16);
  const port = readyPort(job);

  await executeRouteNoteWorkflow(job, port);

  assert.deepEqual(port.audioFileBatches.map(batch => batch.length), [15, 1]);
  assert.equal(port.audioFileBatches[0]?.[0], "/tmp/track-1.flac");
  assert.equal(port.audioFileBatches[0]?.[14], "/tmp/track-15.flac");
  assert.equal(port.audioFileBatches[1]?.[0], "/tmp/track-16.flac");
});

test("audio upload requires provider-side confirmation", async () => {
  const job = makeJob();
  const port = readyPort(job);
  port.visibility.set("audio-upload-confirmation:1", false);

  await assert.rejects(
    executeRouteNoteWorkflow(job, port),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteBrowserError);
      assert.equal(error.code, "ROUTENOTE_AUDIO_CONFIRMATION_MISSING");
      return true;
    }
  );
});

test("artwork upload requires provider-side confirmation", async () => {
  const job = makeJob();
  const port = readyPort(job);
  port.visibility.set("artwork-upload-confirmation", false);

  await assert.rejects(
    executeRouteNoteWorkflow(job, port),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteBrowserError);
      assert.equal(error.code, "ROUTENOTE_ARTWORK_CONFIRMATION_MISSING");
      return true;
    }
  );
});

test("requested stores are enabled and explicit exclusions are disabled", async () => {
  const job = makeJob(1, ["AMAZON_MUSIC"]);
  const port = readyPort(job);

  await executeRouteNoteWorkflow(job, port);

  assert.equal(port.checks.get("store:SPOTIFY"), true);
  assert.equal(port.checks.get("store:APPLE_MUSIC"), true);
  assert.equal(port.checks.get("store:YOUTUBE_MUSIC"), true);
  assert.equal(port.checks.get("store:AMAZON_MUSIC"), false);
});

test("worldwide territory mode does not invent territory restrictions", async () => {
  const job = makeJob();
  const port = readyPort(job);

  await executeRouteNoteWorkflow(job, port);

  assert.equal(
    port.events.some(event => event.includes("territory-include") || event.includes("territory-exclude")),
    false
  );
});

test("ambiguous matching drafts fail closed instead of creating a duplicate", async () => {
  const job = makeJob();
  const port = readyPort(job);
  port.textLists.set("draft-list-rows", ["Test Release", "Test Release"]);

  await assert.rejects(
    executeRouteNoteWorkflow(job, port),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteBrowserError);
      assert.equal(error.code, "ROUTENOTE_DUPLICATE_DRAFT_AMBIGUOUS");
      return true;
    }
  );
  assert.equal(port.events.includes("click:create-new-release"), false);
});

test("provider validation failures are surfaced rather than converted to readiness", async () => {
  const job = makeJob();
  const port = readyPort(job);
  port.textLists.set("provider-validation-errors", ["Album artwork needs review"]);

  await assert.rejects(
    executeRouteNoteWorkflow(job, port),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteBrowserError);
      assert.equal(error.code, "ROUTENOTE_PROVIDER_VALIDATION_FAILED");
      return true;
    }
  );
});
