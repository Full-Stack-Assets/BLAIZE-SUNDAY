import { NextResponse } from "next/server";

import { apiError, readJsonObject, requiredString } from "../../../../../lib/api";
import { createReleaseCommandService } from "../../../../../lib/release-service.server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const result = await createReleaseCommandService().prepareDistribution({
      releaseId: id,
      provider: requiredString(body, "provider"),
      actor:
        typeof body.actor === "string" && body.actor.trim()
          ? body.actor.trim()
          : "distribution_agent"
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
