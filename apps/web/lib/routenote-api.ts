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
      body: {
        ok: false,
        error: {
          code,
          message: "A non-empty SongForge release ID is required."
        }
      }
    };
  }

  if (code === "ROUTENOTE_CONTROL_LOCKED") {
    return {
      status: 401,
      body: {
        ok: false,
        error: {
          code,
          message: "Unlock RouteNote controls to continue."
        }
      }
    };
  }

  if (code === "ROUTENOTE_CONTROL_AUTH_INVALID") {
    return {
      status: 401,
      body: {
        ok: false,
        error: {
          code,
          message: "The RouteNote control passphrase is not valid."
        }
      }
    };
  }

  if (code === "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED") {
    return {
      status: 503,
      body: {
        ok: false,
        error: {
          code,
          message: "Owner authorization is not configured for RouteNote web controls."
        }
      }
    };
  }

  if (code === "ROUTENOTE_RELEASE_NOT_FOUND") {
    return {
      status: 404,
      body: {
        ok: false,
        error: {
          code,
          message: "The selected SongForge release was not found."
        }
      }
    };
  }

  if (code === "ROUTENOTE_RELEASE_NOT_READY" || code === "ROUTENOTE_CONTEXT_NOT_FOUND") {
    return {
      status: 409,
      body: {
        ok: false,
        error: {
          code,
          message:
            code === "ROUTENOTE_RELEASE_NOT_READY"
              ? "The selected release is not ready for RouteNote draft preparation."
              : "The selected release is missing required preparation evidence."
        }
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
    body: {
      ok: false,
      error: {
        code: mapped.code,
        message: mapped.message
      }
    }
  };
}
