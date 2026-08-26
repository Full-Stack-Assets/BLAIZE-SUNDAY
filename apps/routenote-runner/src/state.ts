import { chmod, lstat, mkdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { RouteNoteRunnerError } from "./errors.ts";

function statePolicyError(): RouteNoteRunnerError {
  return new RouteNoteRunnerError(
    "ROUTENOTE_STATE_POLICY_VIOLATION",
    "RouteNote private state violates the configured storage policy."
  );
}

export function isPathWithin(path: string, root: string): boolean {
  const normalizedPath = resolve(path);
  const normalizedRoot = resolve(root);
  return (
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(`${normalizedRoot}${sep}`)
  );
}

export function routeNoteStateRoot(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const configured = env.ROUTENOTE_STATE_ROOT?.trim();
  return resolve(
    configured || join(workspaceRoot, ".songforge", "routenote")
  );
}

export function routeNoteProfileDir(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const stateRoot = routeNoteStateRoot(workspaceRoot, env);
  const configured = env.ROUTENOTE_PROFILE_DIR?.trim();
  const profileDir = resolve(configured || join(stateRoot, "browser-profile"));
  if (env.NODE_ENV === "production" && !isPathWithin(profileDir, stateRoot)) {
    throw statePolicyError();
  }
  return profileDir;
}

export function routeNoteCacheDir(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  return resolve(routeNoteStateRoot(workspaceRoot, env), "cache");
}

export function routeNoteReceiptRoot(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  return resolve(routeNoteStateRoot(workspaceRoot, env), "receipts");
}

export function routeNoteMediaRoot(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const configured = env.ROUTENOTE_MEDIA_ROOT?.trim();
  return resolve(
    configured || join(routeNoteStateRoot(workspaceRoot, env), "media")
  );
}

export async function ensurePrivateDirectory(path: string): Promise<void> {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isDirectory()) throw statePolicyError();
    await chmod(path, 0o700);
    return;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      await mkdir(path, { recursive: true, mode: 0o700 });
      const created = await lstat(path);
      if (created.isSymbolicLink() || !created.isDirectory()) throw statePolicyError();
      await chmod(path, 0o700);
      return;
    }
    if (error instanceof RouteNoteRunnerError) throw error;
    throw statePolicyError();
  }
}
