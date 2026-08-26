import { NextResponse } from "next/server";

import { prepareRouteNoteDraft } from "../../../../../lib/routenote-control.server.ts";
import {
  parsePrepareDraftBody,
  toRouteNoteApiError
} from "../../../../../lib/routenote-api.ts";
import { requireSameOriginMutation } from "../../../../../lib/routenote-request.server.ts";
import {
  createWebRouteNoteControlDependencies,
  requireWebRouteNoteControlAuthority
} from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireWebRouteNoteControlAuthority(request);
    const rawBody = await request.json().catch(() => null);
    const { releaseId } = parsePrepareDraftBody(rawBody);
    const draft = await prepareRouteNoteDraft(
      releaseId,
      createWebRouteNoteControlDependencies()
    );
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
