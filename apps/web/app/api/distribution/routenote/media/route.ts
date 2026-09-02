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

function mediaError(error: RouteNoteMediaImportError) {
  const messages: Record<string, { status: number; message: string }> = {
    ROUTENOTE_MEDIA_INPUT_INVALID: {
      status: 400,
      message: "Select a SongForge release and a supported canonical media type."
    },
    ROUTENOTE_MEDIA_UPLOAD_TOO_LARGE: {
      status: 413,
      message: "The selected canonical media file exceeds the production upload limit."
    },
    ROUTENOTE_MEDIA_CONTENT_TYPE_UNSUPPORTED: {
      status: 415,
      message: "Upload a FLAC master or JPEG cover artwork."
    },
    ROUTENOTE_MEDIA_RELEASE_STATE_BLOCKED: {
      status: 409,
      message: "Canonical media can only be changed while the release is PREPARED."
    },
    ROUTENOTE_MEDIA_METADATA_REQUIRED: {
      status: 409,
      message: "Create the release metadata record before importing canonical media."
    },
    ROUTENOTE_MEDIA_TECHNICAL_INVALID: {
      status: 422,
      message: "The uploaded file does not meet the measured RouteNote technical requirements."
    },
    ROUTENOTE_MEDIA_TECHNICAL_INSPECTION_FAILED: {
      status: 422,
      message: "SongForge could not verify the uploaded media technical properties."
    },
    ROUTENOTE_MEDIA_STORAGE_INVALID: {
      status: 503,
      message: "SongForge canonical media storage failed its production safety check."
    },
    ROUTENOTE_RELEASE_NOT_FOUND: {
      status: 404,
      message: "The selected SongForge release was not found."
    },
    ROUTENOTE_MEDIA_IMPORT_FAILED: {
      status: 500,
      message: "SongForge could not persist the verified canonical media."
    }
  };
  const mapped = messages[error.code] ?? messages.ROUTENOTE_MEDIA_IMPORT_FAILED!;
  return NextResponse.json(
    { ok: false, error: { code: error.code, message: mapped.message } },
    { status: mapped.status }
  );
}

export async function POST(request: Request) {
  try {
    requireSameOriginMutation(request);
    requireRouteNoteControlAuthority(request);
    const { releaseId, kind } = parseInput(request);
    const media = await importRouteNoteMedia(request, releaseId, kind);
    return NextResponse.json({ ok: true, media });
  } catch (error) {
    if (error instanceof RouteNoteMediaImportError) return mediaError(error);
    const mapped = toRouteNoteApiError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
