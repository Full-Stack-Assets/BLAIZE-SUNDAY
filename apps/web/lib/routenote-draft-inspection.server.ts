import { randomUUID } from "node:crypto";

import {
  ROUTENOTE_SELECTORS,
  type RouteNoteExecutionReceipt
} from "@songforge/integrations";
import { PrismaReleaseRepository } from "@songforge/release";

import {
  launchRouteNoteBrowser,
  type RouteNoteBrowserSession
} from "../../routenote-runner/src/browser.ts";
import {
  acquireRouteNoteProfileLease,
  type RouteNoteProfileLease
} from "../../routenote-runner/src/profile-lock.ts";
import { loadDraftReadyReceipt } from "../../routenote-runner/src/receipt.ts";
import { routeNoteProfileDir } from "../../routenote-runner/src/state.ts";
import { routeNoteWorkspaceRoot } from "./routenote-runtime.server.ts";

interface ActiveInspection {
  id: string;
  releaseId: string;
  expiresAt: number;
  session: RouteNoteBrowserSession;
  lease: RouteNoteProfileLease;
  timer: ReturnType<typeof setTimeout>;
  closing: Promise<void> | null;
}

interface InspectionState {
  active: ActiveInspection | null;
}

const inspectionGlobal = globalThis as typeof globalThis & {
  __songforgeRouteNoteInspectionState?: InspectionState;
};

const state: InspectionState =
  inspectionGlobal.__songforgeRouteNoteInspectionState ?? { active: null };
inspectionGlobal.__songforgeRouteNoteInspectionState = state;

class RouteNoteInspectionError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteInspectionError";
    this.code = code;
  }
}

const BROWSER_ENV_KEYS = [
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "TZ",
  "DISPLAY",
  "XDG_RUNTIME_DIR",
  "DBUS_SESSION_BUS_ADDRESS",
  "CHROME_DEVEL_SANDBOX"
] as const;

function inspectionBrowserEnvironment(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = { NODE_ENV: env.NODE_ENV };
  for (const key of BROWSER_ENV_KEYS) {
    const value = env[key];
    if (value) sanitized[key] = value;
  }
  sanitized.ROUTENOTE_PROFILE_DIR = routeNoteProfileDir(workspaceRoot, env);
  const executable = env.ROUTENOTE_BROWSER_EXECUTABLE_PATH?.trim();
  if (executable) sanitized.ROUTENOTE_BROWSER_EXECUTABLE_PATH = executable;
  return sanitized;
}

function inspectionTimeoutMs(env: NodeJS.ProcessEnv): number {
  const configured = Number(env.ROUTENOTE_INSPECTION_TIMEOUT_MS?.trim() ?? Number.NaN);
  const requested = Number.isSafeInteger(configured) && configured > 0
    ? configured
    : 10 * 60 * 1000;
  return Math.min(requested, 10 * 60 * 1000);
}

function eventPayloadHash(evidence: unknown): string | null {
  if (typeof evidence !== "object" || evidence === null) return null;
  const payloadHash = (evidence as { payloadHash?: unknown }).payloadHash;
  if (typeof payloadHash !== "string" || !/^[a-f0-9]{64}$/i.test(payloadHash)) return null;
  return payloadHash.toLowerCase();
}

async function latestDurableDraftReceipt(
  releaseId: string,
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): Promise<RouteNoteExecutionReceipt> {
  const repository = new PrismaReleaseRepository();
  const release = await repository.findRelease(releaseId);
  if (!release) throw new RouteNoteInspectionError("ROUTENOTE_RELEASE_NOT_FOUND");

  const events = await repository.listReleaseEvents(releaseId);
  let payloadHash: string | null = null;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type !== "ROUTENOTE_DRAFT_READY") continue;
    payloadHash = eventPayloadHash(event.evidence);
    if (payloadHash) break;
  }
  if (!payloadHash) {
    throw new RouteNoteInspectionError("ROUTENOTE_DRAFT_RECEIPT_NOT_FOUND");
  }

  const receipt = await loadDraftReadyReceipt(
    releaseId,
    payloadHash,
    workspaceRoot,
    env
  );
  if (!receipt || !receipt.routeNoteReleaseUrl) {
    throw new RouteNoteInspectionError("ROUTENOTE_STATE_POLICY_VIOLATION");
  }
  return receipt;
}

async function finalizeInspection(id: string, closeBrowser: boolean): Promise<void> {
  const active = state.active;
  if (!active || active.id !== id) return;
  if (active.closing) return active.closing;

  active.closing = (async () => {
    if (closeBrowser) {
      await active.session.close();
    } else {
      await active.session.waitForClose();
    }
    await active.lease.release();
    clearTimeout(active.timer);
    if (state.active?.id === active.id) state.active = null;
  })();

  try {
    await active.closing;
  } catch (error) {
    active.closing = null;
    throw error;
  }
}

export async function startRouteNoteDraftInspection(
  releaseId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ releaseId: string; expiresAt: string }> {
  const normalizedReleaseId = releaseId.trim();
  if (!normalizedReleaseId) {
    throw new RouteNoteInspectionError("ROUTENOTE_RELEASE_NOT_FOUND");
  }
  if (state.active) {
    throw new RouteNoteInspectionError("ROUTENOTE_PROFILE_BUSY");
  }

  const workspaceRoot = routeNoteWorkspaceRoot(process.cwd(), env);
  const receipt = await latestDurableDraftReceipt(normalizedReleaseId, workspaceRoot, env);
  const lease = await acquireRouteNoteProfileLease(workspaceRoot, env);
  let session: RouteNoteBrowserSession | null = null;

  try {
    session = await launchRouteNoteBrowser({
      workspaceRoot,
      headless: false,
      initialUrl: receipt.routeNoteReleaseUrl,
      profileDir: routeNoteProfileDir(workspaceRoot, env),
      env: inspectionBrowserEnvironment(workspaceRoot, env)
    });
    await session.port.goto(receipt.routeNoteReleaseUrl);
    if (await session.port.isVisible(ROUTENOTE_SELECTORS.loginSurface)) {
      throw new RouteNoteInspectionError("ROUTENOTE_INSPECTION_LOGIN_REQUIRED");
    }
  } catch (error) {
    if (session) {
      try {
        await session.close();
      } catch (closeError) {
        throw closeError;
      }
    }
    await lease.release();
    throw error;
  }

  const id = randomUUID();
  const timeoutMs = inspectionTimeoutMs(env);
  const expiresAt = Date.now() + timeoutMs;
  const timer = setTimeout(() => {
    void finalizeInspection(id, true).catch(() => undefined);
  }, timeoutMs);
  timer.unref?.();

  state.active = {
    id,
    releaseId: normalizedReleaseId,
    expiresAt,
    session,
    lease,
    timer,
    closing: null
  };

  void session.waitForClose().then(
    () => finalizeInspection(id, false),
    () => undefined
  ).catch(() => undefined);

  return {
    releaseId: normalizedReleaseId,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

export async function stopRouteNoteDraftInspection(): Promise<void> {
  const active = state.active;
  if (!active) return;
  await finalizeInspection(active.id, true);
}

export function routeNoteDraftInspectionStatus(): {
  active: boolean;
  releaseId?: string;
  expiresAt?: string;
} {
  const active = state.active;
  return active
    ? {
        active: true,
        releaseId: active.releaseId,
        expiresAt: new Date(active.expiresAt).toISOString()
      }
    : { active: false };
}
