import { NextResponse } from "next/server";

import { toRouteNoteApiError } from "../../../../../lib/routenote-api.ts";
import { requireRouteNoteControlAuthority } from "../../../../../lib/routenote-authority.server.ts";
import {
  RouteNoteMediaImportError,
  importRouteNoteMedia,
  type RouteNoteMediaKind
} from "../../../../../lib/routenote-media-import.server.ts";
import { requireSameOriginMutation } from "../../../../../lib/routenote-request.server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseInput(request: Request): { releaseId: string; kind: RouteNoteMediaKind } {
  const url = new URL(request.url);
  const releaseId = url.searchParams.get("releaseId")?.trim() ?? "";
  const rawKind = url.searchParams.get("kind")?.trim() ?? "";
  if (!releaseId || (rawKind !== "MASTER" && rawKind !== "COVER_ART")) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_INPUT_INVALID");
  }
  return { releaseId, kind: rawKind };
}

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireRouteNoteControlAuthority(request);
    const { releaseId, kind } = parseInput(request);
    const media = await importRouteNoteMedia(request, releaseId, kind);
    return NextResponse.json({ ok: true, media });
  } catch (error) {
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
