import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { videoRunRepository } from "@/lib/video-service.server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const run = await videoRunRepository.get(id);
    if (!run) throw new Error("VIDEO_RUN_NOT_FOUND");
    const [captions, lineage] = await Promise.all([
      videoRunRepository.listCaptions(id),
      videoRunRepository.listLineage(run.lineageKey)
    ]);
    return NextResponse.json({ ok: true, run, captions, lineage });
  } catch (error) {
    return apiError(error);
  }
}
