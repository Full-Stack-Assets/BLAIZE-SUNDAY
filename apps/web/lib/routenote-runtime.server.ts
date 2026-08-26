import { resolve } from "node:path";

import { requireRouteNoteControlAuthority } from "./routenote-authority.server.ts";
import { createProductionRouteNoteControlDependencies } from "./routenote-control.server.ts";

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
