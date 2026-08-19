import { NextResponse } from "next/server";
import type { TechnicalMetadata } from "@songforge/video";
import { apiError, readJsonObject } from "@/lib/api";
import { videoRunService } from "@/lib/video-service.server";

function parseTechnicalMetadata(value: unknown): TechnicalMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_TECHNICAL_METADATA");
  }
  const record = value as Record<string, unknown>;
  const durationSeconds = record.durationSeconds;
  const width = record.width;
  const height = record.height;
  const fps = record.fps;
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    typeof width !== "number" ||
    !Number.isInteger(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isInteger(height) ||
    height <= 0 ||
    typeof fps !== "number" ||
    !Number.isFinite(fps) ||
    fps <= 0
  ) {
    throw new Error("INVALID_TECHNICAL_METADATA");
  }
  return { durationSeconds, width, height, fps };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const transcript =
      typeof body.transcript === "string" && body.transcript.trim()
        ? body.transcript.trim()
        : undefined;
    const result = await videoRunService.runQc(id, {
      transcript,
      technicalMetadata: parseTechnicalMetadata(body.technicalMetadata),
      staticEndingRisk:
        typeof body.staticEndingRisk === "boolean"
          ? body.staticEndingRisk
          : undefined
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
