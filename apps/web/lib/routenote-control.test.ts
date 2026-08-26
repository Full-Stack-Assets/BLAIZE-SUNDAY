import assert from "node:assert/strict";
import test from "node:test";

import type { ReleasePreparationContext } from "@songforge/release";
import {
  mapRouteNoteControlError,
  projectRouteNoteReadiness
} from "./routenote-control.ts";

function readyContext(): ReleasePreparationContext {
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
      tags: ["test"],
      credits: { artist: "BLAIZE SUNDAY" },
      labelName: "BLAIZE SUNDAY",
      cLine: "BLAIZE SUNDAY",
      pLine: "BLAIZE SUNDAY",
      writers: [
        { firstName: "Test", lastName: "Writer", role: "composer" },
        { firstName: "Test", lastName: "Writer", role: "lyricist" }
      ],
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

test("projects a complete canonical RouteNote context into four ready operator groups", () => {
  const readiness = projectRouteNoteReadiness(readyContext());

  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.groups, {
    audio: true,
    artwork: true,
    metadata: true,
    rights: true
  });
  assert.deepEqual(readiness.missingRequirements, []);
});

test("incomplete artwork remains visible as an artwork readiness failure", () => {
  const context = readyContext();
  context.coverArt = { ...context.coverArt!, width: 2500 };

  const readiness = projectRouteNoteReadiness(context);

  assert.equal(readiness.ready, false);
  assert.equal(readiness.groups.audio, true);
  assert.equal(readiness.groups.artwork, false);
  assert.equal(readiness.groups.metadata, true);
  assert.equal(readiness.groups.rights, true);
  assert.ok(readiness.missingRequirements.includes("ROUTENOTE_ARTWORK_DIMENSIONS"));
});

test("browser missing maps to NOT_CONNECTED without leaking raw stack data", () => {
  const mapped = mapRouteNoteControlError(
    Object.assign(new Error("Chrome missing at /private/browser"), {
      code: "ROUTENOTE_BROWSER_NOT_FOUND",
      stack: "SECRET_STACK"
    })
  );

  assert.equal(mapped.status, "NOT_CONNECTED");
  assert.equal(mapped.code, "ROUTENOTE_BROWSER_NOT_FOUND");
  assert.equal(mapped.message.includes("/private/browser"), false);
  assert.equal(JSON.stringify(mapped).includes("SECRET_STACK"), false);
});

test("session-required and login-timeout failures map to LOGIN_REQUIRED", () => {
  for (const code of ["ROUTENOTE_SESSION_REQUIRED", "ROUTENOTE_LOGIN_TIMEOUT"]) {
    const mapped = mapRouteNoteControlError(Object.assign(new Error(code), { code }));
    assert.equal(mapped.status, "LOGIN_REQUIRED");
    assert.equal(mapped.code, code);
  }
});

test("provider UI drift fails closed as FAILED", () => {
  const mapped = mapRouteNoteControlError(
    Object.assign(new Error("selector ambiguity"), {
      code: "ROUTENOTE_UI_CONTRACT_CHANGED"
    })
  );

  assert.equal(mapped.status, "FAILED");
  assert.equal(mapped.code, "ROUTENOTE_UI_CONTRACT_CHANGED");
  assert.match(mapped.message, /RouteNote interface/i);
});

test("unknown errors are sanitized to a stable generic failure", () => {
  const mapped = mapRouteNoteControlError(new Error("postgres password=secret"));

  assert.deepEqual(mapped, {
    status: "FAILED",
    code: "ROUTENOTE_CONTROL_FAILED",
    message: "RouteNote control operation failed."
  });
});
