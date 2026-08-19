import { NextResponse } from "next/server";
import { apiError, readJsonObject, requiredString } from "@/lib/api";
import {
  videoRunRepository,
  videoRunService
} from "@/lib/video-service.server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await videoRunRepository.get(id);
    if (!existing) throw new Error("VIDEO_RUN_NOT_FOUND");
    if (!existing.externalTaskId) throw new Error("EXTERNAL_TASK_RECEIPT_REQUIRED");

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
