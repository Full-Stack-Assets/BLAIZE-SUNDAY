import { NextResponse } from "next/server";

import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import {
  createWebRouteNoteRunStore,
  requireWebRouteNoteControlAuthority
} from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireWebRouteNoteControlAuthority(request);
    const releaseId = new URL(request.url).searchParams.get("releaseId")?.trim() ?? "";
    if (!releaseId) {
      return NextResponse.json(
        { ok: false, error: { code: "ROUTENOTE_API_INVALID_REQUEST", message: "A non-empty SongForge release ID is required." } },
        { status: 400 }
      );
    }
    const run = await createWebRouteNoteRunStore().latestForRelease(releaseId);
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
