import { NextResponse } from "next/server";

import { parsePrepareDraftBody, toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import { requireSameOriginMutation } from "../../../../../lib/routenote-request.server.ts";
import { preflightRouteNoteRelease } from "../../../../../lib/routenote-run.server.ts";
import {
  createWebRouteNoteRunControlDependencies,
  requireWebRouteNoteControlAuthority
} from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireWebRouteNoteControlAuthority(request);
    const { releaseId } = parsePrepareDraftBody(await request.json().catch(() => null));
    const preflight = await preflightRouteNoteRelease(
      releaseId,
      createWebRouteNoteRunControlDependencies()
    );
    return NextResponse.json({ ok: true, preflight });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
