import { NextResponse } from "next/server";
import { apiError, readJsonObject, requiredString } from "@/lib/api";
import {
  executionPayloadFromRun,
  videoRunRepository,
  videoRunService
} from "@/lib/video-service.server";

function stringArray(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];
  if (!Array.isArray(value)) throw new Error(`${key.toUpperCase()}_REQUIRED`);
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean);
  if (!items.length) throw new Error(`${key.toUpperCase()}_REQUIRED`);
  return items;
}

function boundedNumber(
  body: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = body[key];
  if (raw === undefined) return fallback;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < min || raw > max) {
    throw new Error(`INVALID_${key.toUpperCase()}`);
  }
  return raw;
}

export async function GET() {
  try {
    const runs = await videoRunRepository.list(100);
    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const run = await videoRunService.createRoot({
      title: requiredString(body, "title"),
      topic: requiredString(body, "topic"),
      audience: requiredString(body, "audience"),
      tone: requiredString(body, "tone"),
      targetDurationSeconds: boundedNumber(
        body,
        "targetDurationSeconds",
        60,
        30,
        120
      ),
      durationTolerancePercent: boundedNumber(
        body,
        "durationTolerancePercent",
        15,
        1,
        50
      ),
      requiredCoverage: stringArray(body, "requiredCoverage"),
      visualRequirements: stringArray(body, "visualRequirements"),
      locale:
        typeof body.locale === "string" && body.locale.trim()
          ? body.locale.trim()
          : "en"
    });

    return NextResponse.json(
      {
        ok: true,
        run,
        execution: executionPayloadFromRun(run)
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
