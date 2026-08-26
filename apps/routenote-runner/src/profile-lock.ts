import { randomUUID } from "node:crypto";
import { open, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import { RouteNoteRunnerError } from "./errors.ts";
import { ensurePrivateDirectory, routeNoteStateRoot } from "./state.ts";

interface ProfileLockRecord {
  ownerId: string;
  pid: number;
  machineId: string | null;
  createdAt: string;
}

export interface RouteNoteProfileLease {
  release(): Promise<void>;
}

function busy(): RouteNoteRunnerError {
  return new RouteNoteRunnerError(
    "ROUTENOTE_PROFILE_BUSY",
    "The RouteNote browser profile is already in use."
  );
}

function invalidState(): RouteNoteRunnerError {
  return new RouteNoteRunnerError(
    "ROUTENOTE_STATE_POLICY_VIOLATION",
    "RouteNote profile lock state is invalid."
  );
}

function parseLockRecord(value: string): ProfileLockRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw invalidState();
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as ProfileLockRecord).ownerId !== "string" ||
    !Number.isInteger((parsed as ProfileLockRecord).pid) ||
    (parsed as ProfileLockRecord).pid <= 0 ||
    !(
      (parsed as ProfileLockRecord).machineId === null ||
      typeof (parsed as ProfileLockRecord).machineId === "string"
    ) ||
    typeof (parsed as ProfileLockRecord).createdAt !== "string"
  ) {
    throw invalidState();
  }
  return parsed as ProfileLockRecord;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ESRCH"
    ) {
      return false;
    }
    return true;
  }
}

function lockIsStale(record: ProfileLockRecord, env: NodeJS.ProcessEnv): boolean {
  const machineId = env.FLY_MACHINE_ID?.trim() || null;
  if (record.machineId && machineId && record.machineId !== machineId) return true;
  return !processAlive(record.pid);
}

export async function acquireRouteNoteProfileLease(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<RouteNoteProfileLease> {
  const stateRoot = routeNoteStateRoot(workspaceRoot, env);
  await ensurePrivateDirectory(stateRoot);
  const lockPath = join(stateRoot, "profile.lock");
  const ownerId = randomUUID();
  const record: ProfileLockRecord = {
    ownerId,
    pid: process.pid,
    machineId: env.FLY_MACHINE_ID?.trim() || null,
    createdAt: new Date().toISOString()
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }

      let released = false;
      return {
        async release() {
          if (released) return;
          released = true;
          let current: ProfileLockRecord;
          try {
            current = parseLockRecord(await readFile(lockPath, "utf8"));
          } catch (error) {
            if (
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as { code?: string }).code === "ENOENT"
            ) {
              return;
            }
            throw error;
          }
          if (current.ownerId !== ownerId) throw invalidState();
          await rm(lockPath, { force: true });
        }
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "EEXIST"
      ) {
        const existing = parseLockRecord(await readFile(lockPath, "utf8"));
        if (!lockIsStale(existing, env)) throw busy();
        await rm(lockPath, { force: true });
        continue;
      }
      if (error instanceof RouteNoteRunnerError) throw error;
      throw invalidState();
    }
  }

  throw busy();
}

export async function withRouteNoteProfileLease<T>(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv,
  operation: () => Promise<T>
): Promise<T> {
  const lease = await acquireRouteNoteProfileLease(workspaceRoot, env);
  try {
    return await operation();
  } finally {
    await lease.release();
  }
}
