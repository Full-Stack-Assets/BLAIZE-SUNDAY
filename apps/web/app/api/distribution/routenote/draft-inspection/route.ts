import { NextResponse } from "next/server";

import {
  parsePrepareDraftBody,
  toRouteNoteApiError
} from "../../../../../lib/routenote-api.ts";
import {
  routeNoteDraftInspectionStatus,
  startRouteNoteDraftInspection,
  stopRouteNoteDraftInspection
} from "../../../../../lib/routenote-draft-inspection.server.ts";
import { requireSameOriginMutation } from "../../../../../lib/routenote-request.server.ts";
import { requireWebRouteNoteControlAuthority } from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireWebRouteNoteControlAuthority(request);
    return NextResponse.json({
      ok: true,
      inspection: routeNoteDraftInspectionStatus()
    });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireWebRouteNoteControlAuthority(request);
    const { releaseId } = parsePrepareDraftBody(await request.json().catch(() => null));
    const inspection = await startRouteNoteDraftInspection(releaseId, process.env);
    return NextResponse.json({ ok: true, inspection });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireWebRouteNoteControlAuthority(request);
    await stopRouteNoteDraftInspection();
    return NextResponse.json({ ok: true, stopped: true });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
