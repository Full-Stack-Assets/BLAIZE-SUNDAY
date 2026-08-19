import { NextResponse } from "next/server";
import { apiError, readJsonObject, requiredString } from "@/lib/api";
import { videoRunService } from "@/lib/video-service.server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const run = await videoRunService.recordExternalResult(id, {
      status: requiredString(body, "externalStatus"),
      videoUrl:
        typeof body.videoUrl === "string" ? body.videoUrl.trim() || null : null,
      metrics: body.metrics ?? null,
      error: body.error ?? null
    });
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return apiError(error);
  }
}
