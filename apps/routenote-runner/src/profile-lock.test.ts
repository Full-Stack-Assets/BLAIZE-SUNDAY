import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { RouteNoteRunnerError } from "./errors.ts";
import { acquireRouteNoteProfileLease } from "./profile-lock.ts";

test("profile lease excludes concurrent RouteNote browser operations", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "routenote-lock-"));
  const env = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
  try {
    const first = await acquireRouteNoteProfileLease(workspaceRoot, env);
    await assert.rejects(
      acquireRouteNoteProfileLease(workspaceRoot, env),
      (error: unknown) => {
        assert.ok(error instanceof RouteNoteRunnerError);
        assert.equal(error.code, "ROUTENOTE_PROFILE_BUSY");
        return true;
      }
    );
    await first.release();
    const second = await acquireRouteNoteProfileLease(workspaceRoot, env);
    await second.release();
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
