import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { RouteNoteRunnerError } from "./errors.ts";
import {
  ensurePrivateDirectory,
  routeNoteProfileDir
} from "./state.ts";

test("private state directories are mode 0700", async () => {
  const root = await mkdtemp(join(tmpdir(), "routenote-state-"));
  const target = join(root, "private");
  try {
    await ensurePrivateDirectory(target);
    const info = await lstat(target);
    assert.equal(info.mode & 0o077, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("private state rejects symbolic-link directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "routenote-state-"));
  const real = join(root, "real");
  const linked = join(root, "linked");
  try {
    await mkdir(real);
    await symlink(real, linked, "dir");
    await assert.rejects(ensurePrivateDirectory(linked), (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_STATE_POLICY_VIOLATION");
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production profile cannot escape the configured state root", () => {
  assert.throws(
    () =>
      routeNoteProfileDir("/workspace", {
        NODE_ENV: "production",
        ROUTENOTE_STATE_ROOT: "/data/private-state",
        ROUTENOTE_PROFILE_DIR: "/tmp/not-private-state"
      }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_STATE_POLICY_VIOLATION");
      return true;
    }
  );
});
