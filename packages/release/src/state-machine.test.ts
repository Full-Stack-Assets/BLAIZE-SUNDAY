import assert from "node:assert/strict";
import test from "node:test";

import {
  ReleaseTransitionError,
  transitionRelease
} from "./state-machine.ts";

test("release state follows the forward chain", () => {
  assert.equal(
    transitionRelease("PREPARED", "AWAITING_AUTHORIZATION", {}),
    "AWAITING_AUTHORIZATION"
  );
});

test("release state prevents status skipping", () => {
  assert.throws(
    () => transitionRelease("PREPARED", "SUBMITTED", {}),
    new ReleaseTransitionError("INVALID_RELEASE_TRANSITION")
  );
});

test("release submission requires a matching approved payload", () => {
  assert.throws(
    () =>
      transitionRelease("AWAITING_AUTHORIZATION", "SUBMITTED", {
        actionPayloadHash: "payload-a",
        approval: {
          status: "APPROVED",
          payloadHash: "payload-b",
          expiresAt: new Date("2026-08-18T00:00:00.000Z")
        },
        now: new Date("2026-08-16T00:00:00.000Z")
      }),
    new ReleaseTransitionError("SUBMISSION_NOT_AUTHORIZED")
  );

  assert.equal(
    transitionRelease("AWAITING_AUTHORIZATION", "SUBMITTED", {
      actionPayloadHash: "payload-a",
      approval: {
        status: "APPROVED",
        payloadHash: "payload-a",
        expiresAt: new Date("2026-08-18T00:00:00.000Z")
      },
      now: new Date("2026-08-16T00:00:00.000Z")
    }),
    "SUBMITTED"
  );
});

test("release LIVE requires a verified URL and confirmation", () => {
  assert.throws(
    () =>
      transitionRelease("SCHEDULED", "LIVE", {
        verifiedPlatformUrl: "https://music.example/releases/123"
      }),
    new ReleaseTransitionError("LIVE_EVIDENCE_REQUIRED")
  );

  assert.equal(
    transitionRelease("SCHEDULED", "LIVE", {
      verifiedPlatformUrl: "https://music.example/releases/123",
      externalConfirmationId: "confirmation-123"
    }),
    "LIVE"
  );
});

test("release revision rollback requires explicit revision evidence", () => {
  assert.throws(
    () => transitionRelease("AWAITING_AUTHORIZATION", "PREPARED", {}),
    new ReleaseTransitionError("REVISION_EVIDENCE_REQUIRED")
  );

  assert.equal(
    transitionRelease("AWAITING_AUTHORIZATION", "PREPARED", {
      revisionRequested: true
    }),
    "PREPARED"
  );
});
