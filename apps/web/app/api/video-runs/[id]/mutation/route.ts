import { NextResponse } from "next/server";
import type { VideoMutation } from "@songforge/video";
import { apiError, readJsonObject, requiredString } from "@/lib/api";
import {
  executionPayloadFromRun,
  videoRunService
} from "@/lib/video-service.server";

const MUTATIONS = [
  "REGENERATE",
  "MORE_CINEMATIC",
  "MORE_EXPLANATORY",
  "SHORTER",
  "LONGER"
] as const satisfies readonly VideoMutation[];

type AllowedMutation = (typeof MUTATIONS)[number];

function parseMutation(value: string): AllowedMutation {
  if ((MUTATIONS as readonly string[]).includes(value)) {
    return value as AllowedMutation;
  }
  throw new Error("INVALID_VIDEO_MUTATION");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const mutation = parseMutation(requiredString(body, "mutation"));
    const run = await videoRunService.createMutation(id, mutation);
    return NextResponse.json(
      { ok: true, run, execution: executionPayloadFromRun(run) },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
