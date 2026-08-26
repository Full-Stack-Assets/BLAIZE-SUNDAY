import { NextResponse } from "next/server";

import { loginRouteNote } from "../../../../../lib/routenote-control.server.ts";
import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import {
  createWebRouteNoteControlDependencies,
  requireWebRouteNoteControlAuthority
} from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireWebRouteNoteControlAuthority(request);
    const connection = await loginRouteNote(createWebRouteNoteControlDependencies());
    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
