import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePrepareDraftBody,
  toRouteNoteApiError
} from "./routenote-api.ts";

test("prepare draft body accepts exactly one non-empty release id", () => {
  assert.deepEqual(parsePrepareDraftBody({ releaseId: " release-123 " }), {
    releaseId: "release-123"
  });
});

test("prepare draft body rejects missing, empty, non-string, or additional fields", () => {
  for (const value of [
    null,
    {},
    { releaseId: "" },
    { releaseId: 123 },
    { releaseId: "release-1", distribute: true }
  ]) {
    assert.throws(() => parsePrepareDraftBody(value), (error: unknown) => {
      assert.equal((error as { code?: string }).code, "ROUTENOTE_API_INVALID_REQUEST");
      return true;
    });
  }
});

test("owner authority failures map to sanitized actionable responses", () => {
  const locked = toRouteNoteApiError(
    Object.assign(new Error("private authority detail"), {
      code: "ROUTENOTE_CONTROL_LOCKED"
    })
  );
  assert.equal(locked.status, 401);
  assert.equal(locked.body.error.code, "ROUTENOTE_CONTROL_LOCKED");
  assert.equal(JSON.stringify(locked).includes("private authority detail"), false);

  const invalid = toRouteNoteApiError(
    Object.assign(new Error("candidate"), {
      code: "ROUTENOTE_CONTROL_AUTH_INVALID"
    })
  );
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error.code, "ROUTENOTE_CONTROL_AUTH_INVALID");

  const missing = toRouteNoteApiError(
    Object.assign(new Error("server secret missing"), {
      code: "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED"
    })
  );
  assert.equal(missing.status, 503);
  assert.equal(
    missing.body.error.code,
    "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED"
  );
  assert.equal(JSON.stringify(missing).includes("server secret missing"), false);
});

test("release-not-found maps to a sanitized 404", () => {
  const result = toRouteNoteApiError(
    Object.assign(new Error("private db detail"), { code: "ROUTENOTE_RELEASE_NOT_FOUND" })
  );

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    ok: false,
    error: {
      code: "ROUTENOTE_RELEASE_NOT_FOUND",
      message: "The selected SongForge release was not found."
    }
  });
  assert.equal(JSON.stringify(result).includes("private db detail"), false);
});

test("not-ready and missing-context failures map to a conflict without leaking evidence", () => {
  for (const code of ["ROUTENOTE_RELEASE_NOT_READY", "ROUTENOTE_CONTEXT_NOT_FOUND"]) {
    const result = toRouteNoteApiError(Object.assign(new Error("/private/master.flac"), { code }));
    assert.equal(result.status, 409);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.error.code, code);
    assert.equal(JSON.stringify(result).includes("/private/master.flac"), false);
  }
});

test("login-required and browser-host failures preserve actionable HTTP status", () => {
  assert.equal(
    toRouteNoteApiError(Object.assign(new Error(), { code: "ROUTENOTE_SESSION_REQUIRED" })).status,
    401
  );
  assert.equal(
    toRouteNoteApiError(Object.assign(new Error(), { code: "ROUTENOTE_LOGIN_TIMEOUT" })).status,
    401
  );
  assert.equal(
    toRouteNoteApiError(Object.assign(new Error(), { code: "ROUTENOTE_BROWSER_NOT_FOUND" })).status,
    503
  );
});

test("provider UI drift and unknown failures are sanitized", () => {
  const drift = toRouteNoteApiError(
    Object.assign(new Error("raw selector"), { code: "ROUTENOTE_UI_CONTRACT_CHANGED" })
  );
  assert.equal(drift.status, 502);
  assert.equal(drift.body.error.message.includes("raw selector"), false);

  const unknown = toRouteNoteApiError(new Error("password=secret"));
  assert.equal(unknown.status, 500);
  assert.deepEqual(unknown.body.error, {
    code: "ROUTENOTE_CONTROL_FAILED",
    message: "RouteNote control operation failed."
  });
});
