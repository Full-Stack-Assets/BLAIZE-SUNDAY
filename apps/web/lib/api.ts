import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiRequestError("JSON_BODY_REQUIRED", 415);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiRequestError("VALID_JSON_OBJECT_REQUIRED", 400);
  }
  return body as Record<string, unknown>;
}

export function requireApprovalActor(
  request: Request,
  body: Record<string, unknown>
): string {
  const expected = process.env.APPROVAL_API_TOKEN;
  if (!expected) {
    throw new ApiRequestError("APPROVAL_AUTHORIZATION_NOT_CONFIGURED", 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  const valid =
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes);

  if (!valid) throw new ApiRequestError("UNAUTHORIZED", 401);

  const actor = typeof body.actor === "string" ? body.actor.trim() : "";
  if (!actor) throw new ApiRequestError("ACTOR_REQUIRED", 400);
  return actor;
}

export function requiredString(
  body: Record<string, unknown>,
  key: string
): string {
  const value = typeof body[key] === "string" ? body[key].trim() : "";
  if (!value) throw new ApiRequestError(`${key.toUpperCase()}_REQUIRED`, 400);
  return value;
}

export function apiError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && "status" in error) {
    const e = error as { code: string; status: number; message?: string };
    return NextResponse.json(
      { ok: false, error: e.code || e.message || "UNKNOWN_ERROR" },
      { status: typeof e.status === "number" ? e.status : 500 }
    );
  }

  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const status = error instanceof ApiRequestError
    ? error.status
    : ["RELEASE_NOT_FOUND", "APPROVAL_NOT_FOUND", "ACTION_PACKAGE_NOT_FOUND"].includes(code)
      ? 404
      : [
          "APPROVAL_ALREADY_RESOLVED",
          "APPROVAL_EXPIRED",
          "PAYLOAD_MISMATCH",
          "INVALID_RELEASE_TRANSITION",
          "SUBMISSION_NOT_AUTHORIZED",
          "REVISION_EVIDENCE_REQUIRED"
        ].includes(code)
        ? 409
        : [
            "EXTERNAL_CONFIRMATION_REQUIRED",
            "VERIFIED_PLATFORM_URL_REQUIRED",
            "VALID_SCHEDULE_DATE_REQUIRED",
            "PROVIDER_MISMATCH",
            "RELEASE_PACKAGE_INCOMPLETE",
            "RELEASE_NOT_PREPARED",
            "LAB_RELEASE_SERVICE_UNAVAILABLE"
          ].includes(code)
          ? code === "LAB_RELEASE_SERVICE_UNAVAILABLE" ? 503 : 400
          : 500;

  return NextResponse.json(
    {
      ok: false,
      error: code
    },
    { status }
  );
}
