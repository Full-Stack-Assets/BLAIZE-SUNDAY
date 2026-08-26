import { NextResponse } from "next/server";

import { getRouteNoteControlSnapshot } from "../../../../lib/routenote-control.server.ts";
import { toRouteNoteApiError } from "../../../../lib/routenote-api.ts";
import { createWebRouteNoteControlDependencies } from "../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getRouteNoteControlSnapshot(
      createWebRouteNoteControlDependencies()
    );
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
