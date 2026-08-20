import { NextResponse } from "next/server";
import type { CaptionSource } from "@songforge/video";
import { apiError, readJsonObject, requiredString } from "@/lib/api";
import {
  videoRunRepository,
  videoRunService
} from "@/lib/video-service.server";

const SOURCES = [
  "PROVIDER_SIDECAR",
  "LOCAL_ALIGNMENT",
  "MANUAL_IMPORT"
] as const satisfies readonly CaptionSource[];
const FORMATS = ["srt", "vtt", "json"] as const;

function parseSource(value: string): CaptionSource {
  if ((SOURCES as readonly string[]).includes(value)) return value as CaptionSource;
  throw new Error("INVALID_CAPTION_SOURCE");
}

function parseFormat(value: string): "srt" | "vtt" | "json" {
  if ((FORMATS as readonly string[]).includes(value)) {
    return value as "srt" | "vtt" | "json";
  }
  throw new Error("INVALID_CAPTION_FORMAT");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const run = await videoRunRepository.get(id);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");
    const captions = await videoRunRepository.listCaptions(id);
    return NextResponse.json({ ok: true, captions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const result = await videoRunService.attachCaptions(id, {
      source: parseSource(requiredString(body, "source")),
      locale: requiredString(body, "locale"),
      format: parseFormat(requiredString(body, "format")),
      content: requiredString(body, "content"),
      sourceMediaHash:
        typeof body.sourceMediaHash === "string" && body.sourceMediaHash.trim()
          ? body.sourceMediaHash.trim()
          : null
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
