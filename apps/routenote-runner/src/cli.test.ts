import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRouteNoteCli,
  RouteNoteRunnerError,
  runRouteNoteCli,
  type RouteNoteCliDependencies
} from "./cli.ts";

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

function fakeDependencies() {
  const calls: string[] = [];
  const output: string[] = [];
  const dependencies: RouteNoteCliDependencies = {
    async login() {
      calls.push("login");
      return { profileDir: "/private/profile" };
    },
    async upload(releaseId) {
      calls.push(`upload:${releaseId}`);
      return {
        outcome: "DRAFT_READY" as const,
        releaseId,
        receiptPath: `/private/receipts/${releaseId}.json`,
        routeNoteReleaseUrl: "https://www.routenote.com/releases/route-123",
        approvalId: "approval-123"
      };
    },
    write(line) {
      output.push(line);
    }
  };
  return { dependencies, calls, output };
}

test("login command delegates to the browser-session bootstrap", async () => {
  const { dependencies, calls, output } = fakeDependencies();

  await runRouteNoteCli(["login"], dependencies);

  assert.deepEqual(calls, ["login"]);
  assert.equal(output.some(line => line.includes("/private/profile")), true);
});

test("upload command delegates the release id and reports DRAFT_READY evidence", async () => {
  const { dependencies, calls, output } = fakeDependencies();

  await runRouteNoteCli(["upload", "release-123"], dependencies);

  assert.deepEqual(calls, ["upload:release-123"]);
  assert.equal(output.some(line => line.includes("DRAFT_READY")), true);
  assert.equal(output.some(line => line.includes("approval-123")), true);
  assert.equal(
    output.some(line => line.includes("https://www.routenote.com/releases/route-123")),
    true
  );
});
