import { NextResponse } from "next/server";

import {
  createProductionRouteNoteControlDependencies,
  getRouteNoteControlSnapshot
} from "../../../../lib/routenote-control.server.ts";
import { toRouteNoteApiError } from "../../../../lib/routenote-api.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function workspaceRoot(): string {
  const explicit = process.env.ROUTENOTE_WORKSPACE_ROOT?.trim();
  if (explicit) return explicit;
  const cwd = process.cwd();
  return cwd.endsWith("/apps/web") || cwd.endsWith("\\apps\\web")
    ? new URL("../../", `file://${cwd.replaceAll("\\", "/")}/`).pathname
    : cwd;
}

export async function GET() {
  try {
    const snapshot = await getRouteNoteControlSnapshot(
      createProductionRouteNoteControlDependencies(workspaceRoot(), process.env)
    );
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
