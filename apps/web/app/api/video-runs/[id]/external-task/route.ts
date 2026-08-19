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
    const run = await videoRunService.attachExternalTask(
      id,
      requiredString(body, "externalTaskId")
    );
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return apiError(error);
  }
}
