import { NextResponse } from "next/server";

import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import {
  clearRouteNoteDesktopCookie,
  createRouteNoteDesktopCookie,
  type RouteNoteDesktopMode
} from "../../../../../lib/routenote-desktop-authority.server.ts";
import { requireSameOriginMutation } from "../../../../../lib/routenote-request.server.ts";
import { requireWebRouteNoteControlAuthority } from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class DesktopSessionInputError extends Error {
  readonly code = "ROUTENOTE_DESKTOP_SESSION_INPUT_INVALID";
}

function parseMode(value: unknown): RouteNoteDesktopMode {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DesktopSessionInputError();
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1) throw new DesktopSessionInputError();
  if (record.mode === "INTERACTIVE" || record.mode === "VIEW_ONLY") return record.mode;
  throw new DesktopSessionInputError();
}

function desktopUrl(mode: RouteNoteDesktopMode): string {
  const prefix = mode === "INTERACTIVE" ? "routenote-desktop" : "routenote-draft-view";
  return `/${prefix}/vnc.html?autoconnect=1&resize=scale&path=${prefix}/websockify`;
}

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireWebRouteNoteControlAuthority(request);
    const mode = parseMode(await request.json().catch(() => null));
    const response = NextResponse.json({
      ok: true,
      desktop: { mode, url: desktopUrl(mode) }
    });
    response.headers.set("Set-Cookie", createRouteNoteDesktopCookie(mode, process.env));
    return response;
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireWebRouteNoteControlAuthority(request);
    const response = NextResponse.json({ ok: true, cleared: true });
    response.headers.set("Set-Cookie", clearRouteNoteDesktopCookie(process.env));
    return response;
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
