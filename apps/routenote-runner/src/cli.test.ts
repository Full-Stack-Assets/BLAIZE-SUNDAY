import assert from "node:assert/strict";
import test from "node:test";

import { parseRouteNoteCli, RouteNoteRunnerError } from "./cli.ts";

test("RouteNote runner parses login without release arguments", () => {
  assert.deepEqual(parseRouteNoteCli(["login"]), { command: "login" });
});

test("RouteNote runner parses upload with exactly one release id", () => {
  assert.deepEqual(parseRouteNoteCli(["upload", "release-123"]), {
    command: "upload",
    releaseId: "release-123"
  });
});

test("RouteNote runner rejects upload without a release id", () => {
  assert.throws(() => parseRouteNoteCli(["upload"]), (error: unknown) => {
    assert.ok(error instanceof RouteNoteRunnerError);
    assert.equal(error.code, "ROUTENOTE_CLI_USAGE");
    return true;
  });
});

test("RouteNote runner rejects unexpected arguments", () => {
  assert.throws(
    () => parseRouteNoteCli(["login", "extra"]),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_CLI_USAGE");
      return true;
    }
  );
});
