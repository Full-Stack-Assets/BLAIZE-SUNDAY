import { NextResponse } from "next/server";
import { apiError, readJsonObject } from "@/lib/api";
import { videoRunService } from "@/lib/video-service.server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const locale =
      typeof body.locale === "string" && body.locale.trim()
        ? body.locale.trim()
        : "en";
    const result = await videoRunService.alignCaptions(id, locale);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
