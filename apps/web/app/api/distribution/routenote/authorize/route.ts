import { NextResponse } from "next/server";

import {
  createRouteNoteAuthorityCookie,
  verifyRouteNotePassphrase
} from "../../../../../lib/routenote-authority.server.ts";
import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RouteNoteAuthorizeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteAuthorizeError";
    this.code = code;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const passphrase =
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body) &&
      Object.keys(body).length === 1 &&
      typeof (body as { passphrase?: unknown }).passphrase === "string"
        ? (body as { passphrase: string }).passphrase
        : "";

    if (!passphrase.trim()) {
      throw new RouteNoteAuthorizeError("ROUTENOTE_CONTROL_AUTH_INVALID");
    }
    if (!process.env.ROUTENOTE_CONTROL_PASSPHRASE?.trim()) {
      throw new RouteNoteAuthorizeError("ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED");
    }
    if (!verifyRouteNotePassphrase(passphrase, process.env)) {
      throw new RouteNoteAuthorizeError("ROUTENOTE_CONTROL_AUTH_INVALID");
    }

    const response = NextResponse.json({ ok: true, authorized: true });
    response.headers.set(
      "Set-Cookie",
      createRouteNoteAuthorityCookie(process.env)
    );
    return response;
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
