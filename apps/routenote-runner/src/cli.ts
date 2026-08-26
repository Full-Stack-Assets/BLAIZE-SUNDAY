import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { RouteNoteRunnerError } from "./errors.ts";

export { RouteNoteRunnerError } from "./errors.ts";

export type RouteNoteCliCommand =
  | { command: "login" }
  | { command: "upload"; releaseId: string };

export interface RouteNoteCliDependencies {
  login(): Promise<{ profileDir: string }>;
  upload(releaseId: string): Promise<{
    outcome: "DRAFT_READY";
    releaseId: string;
    receiptPath: string;
    routeNoteReleaseUrl?: string;
    approvalId?: string;
  }>;
  write(line: string): void;
}

const USAGE =
  "Usage: pnpm routenote:login | pnpm routenote:upload <songforge-release-id>";

export function parseRouteNoteCli(argv: string[]): RouteNoteCliCommand {
  if (argv.length === 1 && argv[0] === "login") {
    return { command: "login" };
  }

  if (
    argv.length === 2 &&
    argv[0] === "upload" &&
    typeof argv[1] === "string" &&
    argv[1].trim()
  ) {
    return { command: "upload", releaseId: argv[1].trim() };
  }

  throw new RouteNoteRunnerError("ROUTENOTE_CLI_USAGE", USAGE);
}

export async function runRouteNoteCli(
  argv: string[],
  dependencies: RouteNoteCliDependencies
): Promise<void> {
  const command = parseRouteNoteCli(argv);
  if (command.command === "login") {
    const result = await dependencies.login();
    dependencies.write(
      `RouteNote authenticated browser session is reusable from ${result.profileDir}`
    );
    return;
  }

  const result = await dependencies.upload(command.releaseId);
  dependencies.write(`RouteNote ${result.outcome}: ${result.releaseId}`);
  dependencies.write(`Receipt: ${result.receiptPath}`);
  if (result.approvalId) dependencies.write(`Approval request: ${result.approvalId}`);
  if (result.routeNoteReleaseUrl) {
    dependencies.write(`RouteNote draft: ${result.routeNoteReleaseUrl}`);
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(resolve(entry)).href === import.meta.url;
}

async function main() {
  const { createProductionRouteNoteCliDependencies } = await import(
    "./orchestrator.ts"
  );
  await runRouteNoteCli(
    process.argv.slice(2),
    createProductionRouteNoteCliDependencies(process.cwd(), process.env)
  );
}

if (isMainModule()) {
  main().catch(error => {
    if (error instanceof RouteNoteRunnerError) {
      process.stderr.write(`[${error.code}] ${error.message}\n`);
    } else if (error instanceof Error) {
      process.stderr.write(`${error.name}: ${error.message}\n`);
    } else {
      process.stderr.write(`${String(error)}\n`);
    }
    process.exitCode = 1;
  });
}
