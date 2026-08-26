import {
  ROUTENOTE_HOME_URL,
  ROUTENOTE_SELECTORS,
  executeRouteNoteWorkflow,
  type RouteNoteBrowserPort,
  type RouteNoteExecutionReceipt
} from "@songforge/integrations";
import {
  PrismaReleaseRepository,
  ReleaseCommandService,
  type ReleaseRepository
} from "@songforge/release";

import {
  launchRouteNoteBrowser,
  waitForRouteNoteAuthentication,
  type LaunchRouteNoteBrowserInput,
  type RouteNoteBrowserSession
} from "../../routenote-runner/src/browser.ts";
import { acquireRouteNoteProfileLease } from "../../routenote-runner/src/profile-lock.ts";
import {
  prepareRouteNoteJob,
  type RouteNoteReleaseServiceLike
} from "../../routenote-runner/src/job.ts";
import {
  loadDraftReadyReceipt,
  persistDraftReadyReceipt
} from "../../routenote-runner/src/receipt.ts";
import {
  routeNoteCacheDir,
  routeNoteProfileDir
} from "../../routenote-runner/src/state.ts";
import {
  mapRouteNoteControlError,
  projectRouteNoteReadiness,
  type RouteNoteControlSnapshot,
  type RouteNoteDraftSummary,
  type RouteNoteReadiness,
  type RouteNoteReleaseOption
} from "./routenote-control.ts";

export interface RouteNoteConnectionResult {
  status: "CONNECTED" | "LOGIN_REQUIRED";
}

export interface RouteNoteControlDependencies {
  workspaceRoot: string;
  env: NodeJS.ProcessEnv;
  repository: ReleaseRepository;
  releaseService: RouteNoteReleaseServiceLike;
  launchBrowser(input: LaunchRouteNoteBrowserInput): Promise<RouteNoteBrowserSession>;
  waitForAuthentication: typeof waitForRouteNoteAuthentication;
  checkAuthenticated(port: RouteNoteBrowserPort): Promise<boolean>;
  prepareJob: typeof prepareRouteNoteJob;
  executeWorkflow: typeof executeRouteNoteWorkflow;
  persistReceipt: typeof persistDraftReadyReceipt;
  loadReceipt?: typeof loadDraftReadyReceipt;
  acquireProfileLease?: () => Promise<{ release(): Promise<void> }>;
}

class RouteNoteControlServerError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteControlServerError";
    this.code = code;
  }
}

function envFlag(env: NodeJS.ProcessEnv, key: string): boolean {
  return env[key]?.trim() === "1";
}

function loginTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.ROUTENOTE_LOGIN_TIMEOUT_MS?.trim();
  if (!raw) return 15 * 60 * 1000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60 * 1000;
}

function authenticationRuntime(env: NodeJS.ProcessEnv) {
  return {
    timeoutMs: loginTimeoutMs(env),
    now: () => Date.now(),
    sleep: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
  };
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

function browserEnvironment(
  dependencies: RouteNoteControlDependencies
): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {
    NODE_ENV: dependencies.env.NODE_ENV
  };
  for (const key of BROWSER_ENV_KEYS) {
    const value = dependencies.env[key];
    if (value) sanitized[key] = value;
  }
  sanitized.ROUTENOTE_PROFILE_DIR = routeNoteProfileDir(
    dependencies.workspaceRoot,
    dependencies.env
  );
  const executable = dependencies.env.ROUTENOTE_BROWSER_EXECUTABLE_PATH?.trim();
  if (executable) sanitized.ROUTENOTE_BROWSER_EXECUTABLE_PATH = executable;
  return sanitized;
}

function launchInput(
  dependencies: RouteNoteControlDependencies,
  headless: boolean
): LaunchRouteNoteBrowserInput {
  return {
    workspaceRoot: dependencies.workspaceRoot,
    headless,
    initialUrl: ROUTENOTE_HOME_URL,
    profileDir: routeNoteProfileDir(dependencies.workspaceRoot, dependencies.env),
    env: browserEnvironment(dependencies)
  };
}

async function closeQuietly(session: RouteNoteBrowserSession): Promise<void> {
  try {
    await session.close();
  } catch {
    // Preserve the original provider/control failure. Browser close itself performs
    // TERM/KILL escalation so normal close returns only once the process is gone.
  }
}

async function withBrowserOperation<T>(
  dependencies: RouteNoteControlDependencies,
  operation: () => Promise<T>
): Promise<T> {
  if (!dependencies.acquireProfileLease) return operation();
  const lease = await dependencies.acquireProfileLease();
  try {
    return await operation();
  } finally {
    await lease.release();
  }
}

function unavailableReadiness(): RouteNoteReadiness {
  return {
    ready: false,
    groups: {
      audio: false,
      artwork: false,
      metadata: false,
      rights: false
    },
    missingRequirements: []
  };
}

async function releaseOptions(
  repository: ReleaseRepository
): Promise<RouteNoteReleaseOption[]> {
  const releases = await repository.listReleases();
  return Promise.all(
    releases.map(async release => {
      const context = await repository.findPreparationContext(release.id);
      return {
        id: release.id,
        title: release.title,
        status: release.status,
        readiness: context ? projectRouteNoteReadiness(context) : unavailableReadiness()
      };
    })
  );
}

function sanitizeReceipt(receipt: RouteNoteExecutionReceipt): RouteNoteDraftSummary {
  return {
    outcome: receipt.outcome,
    releaseId: receipt.releaseId,
    payloadHash: receipt.payloadHash,
    ...(receipt.routeNoteReleaseUrl
      ? { routeNoteReleaseUrl: receipt.routeNoteReleaseUrl }
      : {}),
    completedSteps: [...receipt.completedSteps],
    tracks: receipt.tracks.map(track => ({ ...track })),
    artworkUploaded: receipt.artworkUploaded,
    storesConfigured: receipt.storesConfigured
  };
}

function receiptFromEvent(
  event: { type: string; evidence: unknown },
  payloadHash: string
): RouteNoteExecutionReceipt | null {
  if (event.type !== "ROUTENOTE_DRAFT_READY") return null;
  if (typeof event.evidence !== "object" || event.evidence === null) return null;
  const evidence = event.evidence as {
    payloadHash?: unknown;
    receipt?: unknown;
  };
  if (
    typeof evidence.payloadHash !== "string" ||
    evidence.payloadHash.toLowerCase() !== payloadHash.toLowerCase() ||
    typeof evidence.receipt !== "object" ||
    evidence.receipt === null
  ) {
    return null;
  }
  const receipt = evidence.receipt as RouteNoteExecutionReceipt;
  return receipt.outcome === "DRAFT_READY" ? receipt : null;
}

export async function checkRouteNoteConnection(
  dependencies: RouteNoteControlDependencies
): Promise<RouteNoteConnectionResult> {
  return withBrowserOperation(dependencies, async () => {
    const session = await dependencies.launchBrowser(launchInput(dependencies, true));
    try {
      const authenticated = await dependencies.checkAuthenticated(session.port);
      return { status: authenticated ? "CONNECTED" : "LOGIN_REQUIRED" };
    } finally {
      await closeQuietly(session);
    }
  });
}

export async function loginRouteNote(
  dependencies: RouteNoteControlDependencies
): Promise<RouteNoteConnectionResult> {
  return withBrowserOperation(dependencies, async () => {
    const session = await dependencies.launchBrowser(launchInput(dependencies, false));
    try {
      await dependencies.waitForAuthentication(
        session.port,
        authenticationRuntime(dependencies.env)
      );
      return { status: "CONNECTED" };
    } finally {
      await closeQuietly(session);
    }
  });
}

export async function getRouteNoteControlSnapshot(
  dependencies: RouteNoteControlDependencies
): Promise<RouteNoteControlSnapshot> {
  const releases = await releaseOptions(dependencies.repository);
  try {
    const connection = await checkRouteNoteConnection(dependencies);
    return {
      status: connection.status,
      hostAvailable: true,
      releases
    };
  } catch (error) {
    const mapped = mapRouteNoteControlError(error);
    return {
      status:
        mapped.status === "PREPARING"
          ? "FAILED"
          : mapped.status === "DRAFT_READY"
            ? "FAILED"
            : mapped.status,
      hostAvailable: mapped.code !== "ROUTENOTE_BROWSER_NOT_FOUND",
      releases,
      error: { code: mapped.code, message: mapped.message }
    };
  }
}

export async function prepareRouteNoteDraft(
  releaseId: string,
  dependencies: RouteNoteControlDependencies
): Promise<RouteNoteDraftSummary> {
  const normalizedReleaseId = releaseId.trim();
  if (!normalizedReleaseId) {
    throw new RouteNoteControlServerError("ROUTENOTE_RELEASE_NOT_FOUND");
  }

  const release = await dependencies.repository.findRelease(normalizedReleaseId);
  if (!release) {
    throw new RouteNoteControlServerError("ROUTENOTE_RELEASE_NOT_FOUND");
  }

  const context = await dependencies.repository.findPreparationContext(normalizedReleaseId);
  if (!context) {
    throw new RouteNoteControlServerError("ROUTENOTE_CONTEXT_NOT_FOUND");
  }

  const readiness = projectRouteNoteReadiness(context);
  if (
    !readiness.ready ||
    (release.status !== "PREPARED" && release.status !== "AWAITING_AUTHORIZATION")
  ) {
    throw new RouteNoteControlServerError("ROUTENOTE_RELEASE_NOT_READY");
  }

  return withBrowserOperation(dependencies, async () => {
    const prepared = await dependencies.prepareJob(normalizedReleaseId, {
      repository: dependencies.repository,
      releaseService: dependencies.releaseService,
      workspaceRoot: dependencies.workspaceRoot,
      cacheDir: routeNoteCacheDir(dependencies.workspaceRoot, dependencies.env)
    });

    if (dependencies.loadReceipt) {
      const diskReceipt = await dependencies.loadReceipt(
        normalizedReleaseId,
        prepared.job.payloadHash,
        dependencies.workspaceRoot,
        dependencies.env
      );
      const events = await dependencies.repository.listReleaseEvents(normalizedReleaseId);
      const eventReceipt = events
        .map(event => receiptFromEvent(event, prepared.job.payloadHash))
        .find((receipt): receipt is RouteNoteExecutionReceipt => receipt !== null);

      if (eventReceipt && !diskReceipt) {
        throw new RouteNoteControlServerError("ROUTENOTE_STATE_POLICY_VIOLATION");
      }
      if (diskReceipt) {
        await dependencies.persistReceipt(
          dependencies.repository,
          diskReceipt,
          dependencies.workspaceRoot
        );
        return sanitizeReceipt(diskReceipt);
      }
    }

    const session = await dependencies.launchBrowser(
      launchInput(dependencies, envFlag(dependencies.env, "ROUTENOTE_HEADLESS"))
    );

    try {
      const receipt = await dependencies.executeWorkflow(prepared.job, session.port);
      await dependencies.persistReceipt(
        dependencies.repository,
        receipt,
        dependencies.workspaceRoot
      );

      if (envFlag(dependencies.env, "ROUTENOTE_CLOSE_BROWSER")) {
        await closeQuietly(session);
      }

      return sanitizeReceipt(receipt);
    } catch (error) {
      await closeQuietly(session);
      throw error;
    }
  });
}

async function productionCheckAuthenticated(port: RouteNoteBrowserPort): Promise<boolean> {
  await port.goto(ROUTENOTE_HOME_URL);
  if (await port.isVisible(ROUTENOTE_SELECTORS.loginSurface)) return false;
  return port.isVisible(ROUTENOTE_SELECTORS.distributionNav);
}

export function createProductionRouteNoteControlDependencies(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): RouteNoteControlDependencies {
  const repository = new PrismaReleaseRepository();
  const releaseService = new ReleaseCommandService(repository);

  return {
    workspaceRoot,
    env,
    repository,
    releaseService,
    launchBrowser: launchRouteNoteBrowser,
    waitForAuthentication: waitForRouteNoteAuthentication,
    checkAuthenticated: productionCheckAuthenticated,
    prepareJob: prepareRouteNoteJob,
    executeWorkflow: executeRouteNoteWorkflow,
    persistReceipt: persistDraftReadyReceipt,
    loadReceipt: loadDraftReadyReceipt,
    acquireProfileLease: () => acquireRouteNoteProfileLease(workspaceRoot, env)
  };
}
