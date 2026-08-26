import { NextResponse } from "next/server";

import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import {
  requireRouteNoteDesktopAuthority,
  type RouteNoteDesktopMode
} from "../../../../../lib/routenote-desktop-authority.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestedMode(request: Request): RouteNoteDesktopMode {
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "INTERACTIVE" || mode === "VIEW_ONLY") return mode;
  const error = new Error("ROUTENOTE_DESKTOP_SESSION_INVALID") as Error & { code: string };
  error.code = "ROUTENOTE_DESKTOP_SESSION_INVALID";
  throw error;
}

export async function GET(request: Request) {
  try {
    requireRouteNoteDesktopAuthority(request, requestedMode(request), process.env);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
