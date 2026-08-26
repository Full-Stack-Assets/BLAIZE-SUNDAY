import { NextResponse } from "next/server";

import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import { requireWebRouteNoteControlAuthority } from "../../../../../lib/routenote-runtime.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireWebRouteNoteControlAuthority(request);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
