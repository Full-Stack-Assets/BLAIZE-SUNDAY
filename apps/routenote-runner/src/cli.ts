export type RouteNoteCliCommand =
  | { command: "login" }
  | { command: "upload"; releaseId: string };

export class RouteNoteRunnerError extends Error {
  readonly code: string;

  constructor(code: string, message: string = code) {
    super(message);
    this.name = "RouteNoteRunnerError";
    this.code = code;
  }
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
