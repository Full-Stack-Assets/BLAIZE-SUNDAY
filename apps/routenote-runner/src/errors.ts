export type RouteNoteRunnerErrorCode =
  | "ROUTENOTE_CLI_USAGE"
  | "ROUTENOTE_RELEASE_NOT_FOUND"
  | "ROUTENOTE_CONTEXT_NOT_FOUND"
  | "ROUTENOTE_ACTION_PACKAGE_NOT_FOUND"
  | "ROUTENOTE_ACTION_PACKAGE_STALE"
  | "ROUTENOTE_ASSET_UNRESOLVABLE"
  | "ROUTENOTE_ASSET_HASH_MISMATCH"
  | "ROUTENOTE_BROWSER_NOT_FOUND"
  | "ROUTENOTE_BROWSER_LAUNCH_FAILED"
  | "ROUTENOTE_BROWSER_TERMINATION_UNCONFIRMED"
  | "ROUTENOTE_CDP_CONNECTION_FAILED"
  | "ROUTENOTE_LOGIN_TIMEOUT"
  | "ROUTENOTE_PROFILE_BUSY"
  | "ROUTENOTE_STATE_POLICY_VIOLATION";

export class RouteNoteRunnerError extends Error {
  readonly code: RouteNoteRunnerErrorCode;

  constructor(code: RouteNoteRunnerErrorCode, message: string = code) {
    super(message);
    this.name = "RouteNoteRunnerError";
    this.code = code;
  }
}
