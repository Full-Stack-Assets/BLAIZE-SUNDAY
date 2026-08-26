import {
  executeRouteNoteWorkflow,
  ROUTENOTE_HOME_URL,
  type RouteNoteExecutionReceipt
} from "../../../packages/integrations/src/index.ts";
import {
  PrismaReleaseRepository,
  ReleaseCommandService,
  type ReleaseRepository
} from "../../../packages/release/src/index.ts";
import {
  launchRouteNoteBrowser,
  waitForRouteNoteAuthentication,
  type LaunchRouteNoteBrowserInput,
  type RouteNoteBrowserSession
} from "./browser.ts";
import { prepareRouteNoteJob, type RouteNoteReleaseServiceLike } from "./job.ts";
import { persistDraftReadyReceipt } from "./receipt.ts";
import type { RouteNoteCliDependencies } from "./cli.ts";

export interface RouteNoteOrchestratorDependencies {
  workspaceRoot: string;
  env: NodeJS.ProcessEnv;
  repository: ReleaseRepository;
  releaseService: RouteNoteReleaseServiceLike;
  prepareJob: typeof prepareRouteNoteJob;
  launchBrowser(input: LaunchRouteNoteBrowserInput): Promise<RouteNoteBrowserSession>;
  waitForAuthentication: typeof waitForRouteNoteAuthentication;
  executeWorkflow: typeof executeRouteNoteWorkflow;
  persistReceipt: typeof persistDraftReadyReceipt;
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
  dependencies: RouteNoteOrchestratorDependencies,
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
    // Preserve the original provider or persistence failure.
  }
}

export function createRouteNoteCliDependencies(
  dependencies: RouteNoteOrchestratorDependencies
): RouteNoteCliDependencies {
  return {
    async login() {
      const session = await dependencies.launchBrowser(
        launchInput(dependencies, false)
      );
      try {
        await dependencies.waitForAuthentication(
          session.port,
          authenticationRuntime(dependencies.env)
        );
        return { profileDir: session.profileDir };
      } finally {
        await session.close();
      }
    },

    async upload(releaseId) {
      const prepared = await dependencies.prepareJob(releaseId, {
        repository: dependencies.repository,
        releaseService: dependencies.releaseService,
        workspaceRoot: dependencies.workspaceRoot
      });
      const session = await dependencies.launchBrowser(
        launchInput(dependencies, envFlag(dependencies.env, "ROUTENOTE_HEADLESS"))
      );

      let browserReceipt: RouteNoteExecutionReceipt;
      try {
        browserReceipt = await dependencies.executeWorkflow(
          prepared.job,
          session.port
        );
        const persisted = await dependencies.persistReceipt(
          dependencies.repository,
          browserReceipt,
          dependencies.workspaceRoot
        );

        if (envFlag(dependencies.env, "ROUTENOTE_CLOSE_BROWSER")) {
          await session.close();
        }

        return {
          outcome: browserReceipt.outcome,
          releaseId: browserReceipt.releaseId,
          receiptPath: persisted.receiptPath,
          routeNoteReleaseUrl: browserReceipt.routeNoteReleaseUrl,
          approvalId: prepared.approvalId
        };
      } catch (error) {
        await closeQuietly(session);
        throw error;
      }
    },

    write(line) {
      process.stdout.write(`${line}\n`);
    }
  };
}

export function createProductionRouteNoteCliDependencies(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): RouteNoteCliDependencies {
  const repository = new PrismaReleaseRepository();
  const releaseService = new ReleaseCommandService(repository);

  return createRouteNoteCliDependencies({
    workspaceRoot,
    env,
    repository,
    releaseService,
    prepareJob: prepareRouteNoteJob,
    launchBrowser: launchRouteNoteBrowser,
    waitForAuthentication: waitForRouteNoteAuthentication,
    executeWorkflow: executeRouteNoteWorkflow,
    persistReceipt: persistDraftReadyReceipt
  });
}
