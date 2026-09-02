import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { resolveVerifiedAsset } from "./assets.ts";
import { RouteNoteRunnerError } from "./errors.ts";

function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

async function withWorkspace(run: (workspaceRoot: string, cacheDir: string) => Promise<void>) {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "routenote-assets-"));
  const cacheDir = join(workspaceRoot, ".songforge", "routenote", "cache");
  try {
    await run(workspaceRoot, cacheDir);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

test("asset resolver accepts an absolute local path after SHA-256 verification", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const file = join(workspaceRoot, "track.flac");
    await writeFile(file, "audio-bytes");
    const resolvedPath = await resolveVerifiedAsset({
      fileUrl: file,
      sha256: sha256("audio-bytes"),
      contentType: "audio/flac",
      workspaceRoot,
      cacheDir
    });
    assert.equal(resolvedPath, resolve(file));
  });
});

test("asset resolver resolves repository-relative paths", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    await mkdir(join(workspaceRoot, "album"), { recursive: true });
    const file = join(workspaceRoot, "album", "master.flac");
    await writeFile(file, "relative-audio");
    const resolvedPath = await resolveVerifiedAsset({
      fileUrl: "album/master.flac",
      sha256: sha256("relative-audio"),
      contentType: "audio/flac",
      workspaceRoot,
      cacheDir
    });
    assert.equal(resolvedPath, file);
  });
});

test("asset resolver supports file URLs", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const file = join(workspaceRoot, "cover.jpg");
    await writeFile(file, "cover-bytes");
    const resolvedPath = await resolveVerifiedAsset({
      fileUrl: pathToFileURL(file).href,
      sha256: sha256("cover-bytes"),
      contentType: "image/jpeg",
      workspaceRoot,
      cacheDir
    });
    assert.equal(resolvedPath, file);
  });
});

test("asset resolver downloads HTTPS assets atomically into the private cache", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const body = new TextEncoder().encode("remote-audio");
    let fetchedUrl: string | null = null;
    const resolvedPath = await resolveVerifiedAsset({
      fileUrl: "https://assets.example/master.flac",
      sha256: sha256(body),
      contentType: "audio/flac",
      workspaceRoot,
      cacheDir,
      fetchImpl: async input => {
        fetchedUrl = String(input);
        return new Response(body, { status: 200 });
      }
    });
    assert.equal(fetchedUrl, "https://assets.example/master.flac");
    assert.equal(resolve(resolvedPath).startsWith(resolve(cacheDir)), true);
    assert.equal(resolvedPath.endsWith(".flac"), true);
    assert.deepEqual(new Uint8Array(await readFile(resolvedPath)), body);
  });
});

test("asset resolver rejects unsupported URL schemes", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    await assert.rejects(
      resolveVerifiedAsset({
        fileUrl: "s3://private-bucket/master.flac",
        sha256: "a".repeat(64),
        contentType: "audio/flac",
        workspaceRoot,
        cacheDir
      }),
      (error: unknown) => {
        assert.ok(error instanceof RouteNoteRunnerError);
        assert.equal(error.code, "ROUTENOTE_ASSET_UNRESOLVABLE");
        return true;
      }
    );
  });
});

test("asset resolver fails closed when canonical SHA-256 does not match", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const file = join(workspaceRoot, "track.flac");
    await writeFile(file, "wrong-bytes");
    await assert.rejects(
      resolveVerifiedAsset({
        fileUrl: file,
        sha256: "f".repeat(64),
        contentType: "audio/flac",
        workspaceRoot,
        cacheDir
      }),
      (error: unknown) => {
        assert.ok(error instanceof RouteNoteRunnerError);
        assert.equal(error.code, "ROUTENOTE_ASSET_HASH_MISMATCH");
        return true;
      }
    );
  });
});

test("production local assets must resolve inside the canonical media root", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const mediaRoot = join(workspaceRoot, "media");
    await mkdir(mediaRoot, { recursive: true });
    const allowed = join(mediaRoot, "master.flac");
    const outside = join(workspaceRoot, "outside.flac");
    await writeFile(allowed, "allowed");
    await writeFile(outside, "outside");
    const env = {
      NODE_ENV: "production",
      ROUTENOTE_MEDIA_ROOT: mediaRoot
    } as NodeJS.ProcessEnv;

    assert.equal(
      await resolveVerifiedAsset({
        fileUrl: allowed,
        sha256: sha256("allowed"),
        contentType: "audio/flac",
        workspaceRoot,
        cacheDir,
        env
      }),
      resolve(allowed)
    );

    await assert.rejects(
      resolveVerifiedAsset({
        fileUrl: outside,
        sha256: sha256("outside"),
        contentType: "audio/flac",
        workspaceRoot,
        cacheDir,
        env
      }),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "ROUTENOTE_ASSET_UNRESOLVABLE");
        return true;
      }
    );
  });
});

test("production media symlinks cannot escape the canonical media root", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const mediaRoot = join(workspaceRoot, "media");
    await mkdir(mediaRoot, { recursive: true });
    const outside = join(workspaceRoot, "outside.flac");
    const linked = join(mediaRoot, "linked.flac");
    await writeFile(outside, "outside");
    await symlink(outside, linked);

    await assert.rejects(
      resolveVerifiedAsset({
        fileUrl: linked,
        sha256: sha256("outside"),
        contentType: "audio/flac",
        workspaceRoot,
        cacheDir,
        env: { NODE_ENV: "production", ROUTENOTE_MEDIA_ROOT: mediaRoot }
      }),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "ROUTENOTE_ASSET_UNRESOLVABLE");
        return true;
      }
    );
  });
});

test("production remote assets require an exact HTTPS host allowlist match", async () => {
  await withWorkspace(async (workspaceRoot, cacheDir) => {
    const body = new TextEncoder().encode("remote");
    let called = false;
    await assert.rejects(
      resolveVerifiedAsset({
        fileUrl: "https://untrusted.example/master.flac",
        sha256: sha256(body),
        contentType: "audio/flac",
        workspaceRoot,
        cacheDir,
        env: {
          NODE_ENV: "production",
          ROUTENOTE_ASSET_HOST_ALLOWLIST: "assets.example"
        },
        fetchImpl: async () => {
          called = true;
          return new Response(body);
        }
      }),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "ROUTENOTE_ASSET_UNRESOLVABLE");
        return true;
      }
    );
    assert.equal(called, false);
  });
});
