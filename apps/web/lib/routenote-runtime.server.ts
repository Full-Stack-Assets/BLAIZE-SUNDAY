import { resolve } from "node:path";

import { routeNoteCacheDir } from "../../routenote-runner/src/state.ts";
import { requireRouteNoteControlAuthority } from "./routenote-authority.server.ts";
import {
  createProductionRouteNoteControlDependencies,
  prepareRouteNoteDraft
} from "./routenote-control.server.ts";
import type { RouteNoteRunControlDependencies } from "./routenote-run.server.ts";
import { PrismaRouteNoteRunStore } from "./routenote-run-store.server.ts";

export function routeNoteWorkspaceRoot(
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicit = env.ROUTENOTE_WORKSPACE_ROOT?.trim();
  if (explicit) return resolve(explicit);

  return /[\\/]apps[\\/]web$/.test(cwd) ? resolve(cwd, "../..") : resolve(cwd);
}

export function requireWebRouteNoteControlAuthority(request: Request) {
  requireRouteNoteControlAuthority(request, process.env);
}

export function createWebRouteNoteControlDependencies() {
  return createProductionRouteNoteControlDependencies(
    routeNoteWorkspaceRoot(),
    process.env
  );
}

export function createWebRouteNoteRunControlDependencies(): RouteNoteRunControlDependencies {
  const control = createWebRouteNoteControlDependencies();
  return {
    repository: control.repository,
    releaseService: control.releaseService,
    now: () => new Date(),
    prepareVerifiedJob: releaseId =>
      control.prepareJob(releaseId, {
        repository: control.repository,
        releaseService: control.releaseService,
        workspaceRoot: control.workspaceRoot,
        cacheDir: routeNoteCacheDir(control.workspaceRoot, control.env)
      }),
    executeDraft: (releaseId, onStep) =>
      prepareRouteNoteDraft(releaseId, control, { onStep })
  };
}

export function createWebRouteNoteRunStore() {
  return new PrismaRouteNoteRunStore();
}
