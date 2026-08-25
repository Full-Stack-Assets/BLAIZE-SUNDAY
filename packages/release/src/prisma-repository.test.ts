import assert from "node:assert/strict";
import test from "node:test";

import { PrismaReleaseRepository } from "./prisma-repository.ts";

function routeNoteReleaseFixture(dspMetadata: unknown) {
  return {
    id: "release-1",
    projectId: "project-1",
    artistId: "artist-1",
    title: "Chrome Receipt",
    status: "PREPARED",
    distributor: null,
    verifiedPlatformUrl: null,
    externalConfirmationId: null,
    scheduledReleaseDate: null,
    liveDate: null,
    createdAt: new Date("2026-08-25T12:00:00.000Z"),
    updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    artist: { name: "BLAIZE SUNDAY" },
    project: {
      audioAssets: [
        {
          id: "audio-1",
          fileUrl: "https://assets.example/master.flac",
          sha256: "a".repeat(64),
          approved: true,
          durationSeconds: 138,
          contentType: "audio/flac",
          sampleRate: 44_100,
          bitDepth: 16
        }
      ],
      visualAssets: [
        {
          id: "cover-1",
          fileUrl: "https://assets.example/cover.jpg",
          sha256: "b".repeat(64),
          approved: true,
          width: 3000,
          height: 3000,
          contentType: "image/jpeg"
        }
      ],
      metadata: {
        title: "Chrome Receipt",
        artistName: "BLAIZE SUNDAY",
        genre: "Alt Pop",
        subgenre: "Luxury Glitch Pop",
        language: "en",
        explicit: false,
        description: "Test release",
        tags: ["proof-cycle"],
        credits: { primaryArtist: "BLAIZE SUNDAY" },
        dspMetadata
      },
      rights: {
        approved: true,
        ownershipConfirmed: true,
        provenanceComplete: true,
        rightsWarnings: []
      }
    }
  };
}

function repositoryForFixture(fixture: unknown) {
  const client = {
    release: {
      findUnique: async () => fixture
    }
  };
  return new PrismaReleaseRepository(client as never);
}

test("Prisma preparation context reconstructs RouteNote handoff evidence", async () => {
  const repository = repositoryForFixture(
    routeNoteReleaseFixture({
      routenote: {
        labelName: "BLAIZE SUNDAY",
        cLine: "Test Artist Legal Name",
        pLine: "Test Artist Legal Name",
        writers: [
          { firstName: "Test", lastName: "Artist", role: "composer" },
          { firstName: "Test", lastName: "Artist", role: "lyricist" }
        ],
        originalReleaseDate: "2026-08-25",
        salesStartDate: "2026-09-15",
        aiAssisted: true,
        aiSourceUrls: ["https://example.ai/source"],
        audio: {
          channels: 2,
          bitrateKbps: 320
        },
        artwork: {
          fileSizeBytes: 5_000_000,
          colorSpace: "RGB"
        }
      }
    })
  );

  const context = await repository.findPreparationContext("release-1");

  assert.equal(context?.master?.channels, 2);
  assert.equal(context?.master?.sampleRateHz, 44_100);
  assert.equal(context?.master?.bitDepth, 16);
  assert.equal(context?.master?.bitrateKbps, 320);
  assert.equal(context?.coverArt?.fileSizeBytes, 5_000_000);
  assert.equal(context?.coverArt?.colorSpace, "RGB");
  assert.equal(context?.metadata?.labelName, "BLAIZE SUNDAY");
  assert.equal(context?.metadata?.cLine, "Test Artist Legal Name");
  assert.equal(context?.metadata?.pLine, "Test Artist Legal Name");
  assert.deepEqual(context?.metadata?.writers, [
    { firstName: "Test", lastName: "Artist", role: "composer" },
    { firstName: "Test", lastName: "Artist", role: "lyricist" }
  ]);
  assert.equal(context?.metadata?.originalReleaseDate, "2026-08-25");
  assert.equal(context?.metadata?.salesStartDate, "2026-09-15");
  assert.equal(context?.metadata?.aiAssisted, true);
  assert.deepEqual(context?.metadata?.aiSourceUrls, ["https://example.ai/source"]);
});

test("Prisma preparation context does not coerce malformed RouteNote evidence", async () => {
  const repository = repositoryForFixture(
    routeNoteReleaseFixture({
      routenote: {
        labelName: 42,
        writers: [{ firstName: "Test", role: "composer" }],
        aiAssisted: "yes",
        aiSourceUrls: "https://example.ai/source",
        audio: { channels: "2", bitrateKbps: "320" },
        artwork: { fileSizeBytes: "5000000", colorSpace: 123 }
      }
    })
  );

  const context = await repository.findPreparationContext("release-1");

  assert.equal(context?.master?.channels, undefined);
  assert.equal(context?.master?.bitrateKbps, undefined);
  assert.equal(context?.coverArt?.fileSizeBytes, undefined);
  assert.equal(context?.coverArt?.colorSpace, undefined);
  assert.equal(context?.metadata?.labelName, undefined);
  assert.equal(context?.metadata?.writers, undefined);
  assert.equal(context?.metadata?.aiAssisted, undefined);
  assert.equal(context?.metadata?.aiSourceUrls, undefined);
});
