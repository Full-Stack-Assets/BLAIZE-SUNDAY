import assert from "node:assert/strict";
import test from "node:test";

import type { RouteNoteControlSnapshot, RouteNoteDraftSummary } from "./routenote-control.ts";
import {
  canPrepareSelectedRelease,
  createInitialRouteNoteControlState,
  reduceRouteNoteControlState
} from "./routenote-control-client.ts";

const snapshot: RouteNoteControlSnapshot = {
  status: "CONNECTED",
  hostAvailable: true,
  releases: [
    {
      id: "ready",
      title: "Ready Single",
      status: "PREPARED",
      readiness: {
        ready: true,
        groups: { audio: true, artwork: true, metadata: true, rights: true },
        missingRequirements: []
      }
    },
    {
      id: "blocked",
      title: "Blocked Single",
      status: "PREPARED",
      readiness: {
        ready: false,
        groups: { audio: true, artwork: false, metadata: true, rights: true },
        missingRequirements: ["ROUTENOTE_ARTWORK_DIMENSIONS"]
      }
    }
  ]
};

const draft: RouteNoteDraftSummary = {
  outcome: "DRAFT_READY",
  releaseId: "ready",
  payloadHash: "hash",
  routeNoteReleaseUrl: "https://www.routenote.com/releases/ready",
  completedSteps: ["SESSION_VERIFIED", "PROVIDER_VALIDATED"],
  tracks: [{ trackIndex: 1, title: "Ready Single", uploaded: true }],
  artworkUploaded: true,
  storesConfigured: true
};

test("initial state starts disconnected and empty", () => {
  const state = createInitialRouteNoteControlState();
  assert.equal(state.status, "NOT_CONNECTED");
  assert.deepEqual(state.releases, []);
  assert.equal(canPrepareSelectedRelease(state), false);
});

test("snapshot load selects the first release and reflects current connection", () => {
  const state = reduceRouteNoteControlState(createInitialRouteNoteControlState(), {
    type: "SNAPSHOT_LOADED",
    snapshot
  });

  assert.equal(state.status, "CONNECTED");
  assert.equal(state.selectedReleaseId, "ready");
  assert.equal(canPrepareSelectedRelease(state), true);
});

test("blocked readiness disables preparation even while connected", () => {
  let state = reduceRouteNoteControlState(createInitialRouteNoteControlState(), {
    type: "SNAPSHOT_LOADED",
    snapshot
  });
  state = reduceRouteNoteControlState(state, {
    type: "RELEASE_SELECTED",
    releaseId: "blocked"
  });

  assert.equal(canPrepareSelectedRelease(state), false);
});

test("login-required connection result exposes LOGIN_REQUIRED and disables preparation", () => {
  let state = reduceRouteNoteControlState(createInitialRouteNoteControlState(), {
    type: "SNAPSHOT_LOADED",
    snapshot
  });
  state = reduceRouteNoteControlState(state, {
    type: "CONNECTION_RESULT",
    status: "LOGIN_REQUIRED"
  });

  assert.equal(state.status, "LOGIN_REQUIRED");
  assert.equal(canPrepareSelectedRelease(state), false);
});

test("prepare start exposes PREPARING and draft success exposes DRAFT_READY", () => {
  let state = reduceRouteNoteControlState(createInitialRouteNoteControlState(), {
    type: "SNAPSHOT_LOADED",
    snapshot
  });
  state = reduceRouteNoteControlState(state, { type: "PREPARE_STARTED" });
  assert.equal(state.status, "PREPARING");
  assert.equal(canPrepareSelectedRelease(state), false);

  state = reduceRouteNoteControlState(state, { type: "DRAFT_READY", draft });
  assert.equal(state.status, "DRAFT_READY");
  assert.deepEqual(state.draft, draft);
});

test("failure is sanitized state and reconnect can recover", () => {
  let state = reduceRouteNoteControlState(createInitialRouteNoteControlState(), {
    type: "FAILED",
    error: { code: "ROUTENOTE_UI_CONTRACT_CHANGED", message: "RouteNote interface changed." }
  });
  assert.equal(state.status, "FAILED");
  assert.equal(state.error?.code, "ROUTENOTE_UI_CONTRACT_CHANGED");

  state = reduceRouteNoteControlState(state, {
    type: "CONNECTION_RESULT",
    status: "CONNECTED"
  });
  assert.equal(state.status, "CONNECTED");
  assert.equal(state.error, undefined);
});

test("AWAITING_AUTHORIZATION remains draft-preparation eligible when canonical readiness is complete", () => {
  const awaitingSnapshot: RouteNoteControlSnapshot = {
    ...snapshot,
    releases: [
      {
        ...snapshot.releases[0]!,
        status: "AWAITING_AUTHORIZATION"
      }
    ]
  };
  const state = reduceRouteNoteControlState(createInitialRouteNoteControlState(), {
    type: "SNAPSHOT_LOADED",
    snapshot: awaitingSnapshot
  });

  assert.equal(canPrepareSelectedRelease(state), true);
});
