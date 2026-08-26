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
import {
  prepareRouteNoteJob,
  type RouteNoteReleaseServiceLike
} from "../../routenote-runner/src/job.ts";
import { persistDraftReadyReceipt } from "../../routenote-runner/src/receipt.ts";
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

function launchInput(
  dependencies: RouteNoteControlDependencies,
  headless: boolean
): LaunchRouteNoteBrowserInput {
  return {
    workspaceRoot: dependencies.workspaceRoot,
    headless,
    initialUrl: ROUTENOTE_HOME_URL,
    env: dependencies.env
  };
}

async function closeQuietly(session: RouteNoteBrowserSession): Promise<void> {
  try {
    await session.close();
  } catch {
    // Preserve the original provider/control failure.
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

export async function checkRouteNoteConnection(
  dependencies: RouteNoteControlDependencies
): Promise<RouteNoteConnectionResult> {
  const session = await dependencies.launchBrowser(launchInput(dependencies, true));
  try {
    const authenticated = await dependencies.checkAuthenticated(session.port);
    return { status: authenticated ? "CONNECTED" : "LOGIN_REQUIRED" };
  } finally {
    await closeQuietly(session);
  }
}

export async function loginRouteNote(
  dependencies: RouteNoteControlDependencies
): Promise<RouteNoteConnectionResult> {
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

  const prepared = await dependencies.prepareJob(normalizedReleaseId, {
    repository: dependencies.repository,
    releaseService: dependencies.releaseService,
    workspaceRoot: dependencies.workspaceRoot
  });
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
    persistReceipt: persistDraftReadyReceipt
  };
}
