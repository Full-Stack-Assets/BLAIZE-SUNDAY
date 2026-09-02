import { mapRouteNoteControlError } from "./routenote-control.ts";

export interface RouteNoteApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export interface RouteNoteApiErrorResult {
  status: number;
  body: RouteNoteApiErrorBody;
}

class RouteNoteApiInputError extends Error {
  readonly code = "ROUTENOTE_API_INVALID_REQUEST";

  constructor() {
    super("ROUTENOTE_API_INVALID_REQUEST");
    this.name = "RouteNoteApiInputError";
  }
}

function codeOf(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

export function parsePrepareDraftBody(value: unknown): { releaseId: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RouteNoteApiInputError();
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.releaseId !== "string") {
    throw new RouteNoteApiInputError();
  }

  const releaseId = record.releaseId.trim();
  if (!releaseId) throw new RouteNoteApiInputError();
  return { releaseId };
}

export function toRouteNoteApiError(error: unknown): RouteNoteApiErrorResult {
  const code = codeOf(error);

  if (code === "ROUTENOTE_API_INVALID_REQUEST") {
    return {
      status: 400,
      body: { ok: false, error: { code, message: "A non-empty SongForge release ID is required." } }
    };
  }

  if (code === "ROUTENOTE_DESKTOP_SESSION_INPUT_INVALID") {
    return {
      status: 400,
      body: { ok: false, error: { code, message: "A valid RouteNote desktop mode is required." } }
    };
  }

  if (code === "ROUTENOTE_CONTROL_ORIGIN_REJECTED") {
    return {
      status: 403,
      body: { ok: false, error: { code, message: "RouteNote control request origin was rejected." } }
    };
  }

  if (code === "ROUTENOTE_CONTROL_LOCKED") {
    return {
      status: 401,
      body: { ok: false, error: { code, message: "Unlock RouteNote controls to continue." } }
    };
  }

  if (code === "ROUTENOTE_DESKTOP_SESSION_INVALID") {
    return {
      status: 401,
      body: { ok: false, error: { code, message: "Open a fresh authorized RouteNote desktop session." } }
    };
  }

  if (code === "ROUTENOTE_CONTROL_AUTH_INVALID") {
    return {
      status: 401,
      body: { ok: false, error: { code, message: "The RouteNote control passphrase is not valid." } }
    };
  }

  if (code === "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED") {
    return {
      status: 503,
      body: { ok: false, error: { code, message: "Owner authorization is not configured for RouteNote web controls." } }
    };
  }

  if (code === "ROUTENOTE_RELEASE_NOT_FOUND" || code === "ROUTENOTE_RUN_NOT_FOUND") {
    return {
      status: 404,
      body: {
        ok: false,
        error: {
          code,
          message:
            code === "ROUTENOTE_RUN_NOT_FOUND"
              ? "The RouteNote automation run was not found."
              : "The selected SongForge release was not found."
        }
      }
    };
  }

  if (code === "ROUTENOTE_PROFILE_BUSY") {
    return {
      status: 409,
      body: { ok: false, error: { code, message: "Another RouteNote browser operation is still active." } }
    };
  }

  if (code === "ROUTENOTE_DRAFT_RECEIPT_NOT_FOUND") {
    return {
      status: 409,
      body: { ok: false, error: { code, message: "No durable DRAFT_READY receipt is available for inspection." } }
    };
  }

  if (code === "ROUTENOTE_INSPECTION_LOGIN_REQUIRED") {
    return {
      status: 409,
      body: { ok: false, error: { code, message: "Reconnect RouteNote before opening the retained draft." } }
    };
  }

  if (code === "ROUTENOTE_STATE_POLICY_VIOLATION") {
    return {
      status: 503,
      body: { ok: false, error: { code, message: "RouteNote private state failed its production safety check." } }
    };
  }

  if (
    code === "ROUTENOTE_RELEASE_NOT_READY" ||
    code === "ROUTENOTE_CONTEXT_NOT_FOUND" ||
    code === "ROUTENOTE_APPROVAL_NOT_FOUND" ||
    code === "ROUTENOTE_APPROVAL_PAYLOAD_MISMATCH" ||
    code === "ROUTENOTE_ACTION_PACKAGE_STALE" ||
    code === "ROUTENOTE_PACKAGE_NOT_AUTHORIZABLE" ||
    code === "ROUTENOTE_PACKAGE_NOT_AUTHORIZED" ||
    code === "APPROVAL_EXPIRED"
  ) {
    const messages: Record<string, string> = {
      ROUTENOTE_RELEASE_NOT_READY: "The selected release is not ready for RouteNote draft preparation.",
      ROUTENOTE_CONTEXT_NOT_FOUND: "The selected release is missing required preparation evidence.",
      ROUTENOTE_APPROVAL_NOT_FOUND: "The current RouteNote package has no valid approval request.",
      ROUTENOTE_APPROVAL_PAYLOAD_MISMATCH: "The RouteNote approval no longer matches the current package.",
      ROUTENOTE_ACTION_PACKAGE_STALE: "The RouteNote package changed and must be preflighted again.",
      ROUTENOTE_PACKAGE_NOT_AUTHORIZABLE: "The current RouteNote package cannot be authorized in its present state.",
      ROUTENOTE_PACKAGE_NOT_AUTHORIZED: "Authorize the exact current RouteNote package before starting automation.",
      APPROVAL_EXPIRED: "The RouteNote package authorization expired. Preflight and authorize the current package again."
    };
    return {
      status: 409,
      body: { ok: false, error: { code: code as string, message: messages[code as string]! } }
    };
  }

  if (code === "ROUTENOTE_DRAFT_RECEIPT_MISMATCH") {
    return {
      status: 502,
      body: {
        ok: false,
        error: { code, message: "The RouteNote worker receipt did not match the authorized package. Operator review is required." }
      }
    };
  }

  const mapped = mapRouteNoteControlError(error);
  let status = 500;
  if (mapped.status === "LOGIN_REQUIRED") status = 401;
  else if (mapped.code === "ROUTENOTE_BROWSER_NOT_FOUND") status = 503;
  else if (mapped.code === "ROUTENOTE_UI_CONTRACT_CHANGED") status = 502;
  else if (mapped.code.startsWith("ROUTENOTE_") && mapped.code !== "ROUTENOTE_CONTROL_FAILED") {
    status = 422;
  }

  return {
    status,
    body: { ok: false, error: { code: mapped.code, message: mapped.message } }
  };
}
