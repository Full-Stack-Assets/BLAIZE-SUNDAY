import { NextResponse } from "next/server";

import { loginRouteNote } from "../../../../../lib/routenote-control.server.ts";
import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import { createWebRouteNoteControlDependencies } from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const connection = await loginRouteNote(createWebRouteNoteControlDependencies());
    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
