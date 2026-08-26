import { RouteNoteRunnerError } from "./errors.ts";

export { RouteNoteRunnerError } from "./errors.ts";

export type RouteNoteCliCommand =
  | { command: "login" }
  | { command: "upload"; releaseId: string };

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
