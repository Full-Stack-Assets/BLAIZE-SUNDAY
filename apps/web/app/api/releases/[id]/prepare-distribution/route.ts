import { NextResponse } from "next/server";

import { apiError, readJsonObject, requireApprovalActor, requiredString } from "../../../../../lib/api";
import { createReleaseCommandService } from "../../../../../lib/release-service.server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const actor = requireApprovalActor(request, body);
    const result = await createReleaseCommandService().prepareDistribution({
      releaseId: id,
      provider: requiredString(body, "provider"),
      actor
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
