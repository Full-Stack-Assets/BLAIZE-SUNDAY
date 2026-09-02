import { NextResponse } from "next/server";

import { toRouteNoteApiError } from "../../../../../../lib/routenote-api.ts";
import {
  createWebRouteNoteRunStore,
  requireWebRouteNoteControlAuthority
} from "../../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    requireWebRouteNoteControlAuthority(request);
    const { runId } = await context.params;
    const normalized = runId?.trim();
    if (!normalized) {
      return NextResponse.json(
        { ok: false, error: { code: "ROUTENOTE_RUN_NOT_FOUND", message: "The RouteNote run was not found." } },
        { status: 404 }
      );
    }
    const run = await createWebRouteNoteRunStore().get(normalized);
    if (!run) {
      return NextResponse.json(
        { ok: false, error: { code: "ROUTENOTE_RUN_NOT_FOUND", message: "The RouteNote run was not found." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
