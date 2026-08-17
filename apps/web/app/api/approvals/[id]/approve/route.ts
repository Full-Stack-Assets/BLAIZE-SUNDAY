import { NextResponse } from "next/server";

import { apiError, readJsonObject, requireApprovalActor } from "../../../../../lib/api";
import { createReleaseCommandService } from "../../../../../lib/release-service.server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const actor = requireApprovalActor(request, body);
    const result = await createReleaseCommandService().resolveApproval({
      approvalId: id,
      decision: "APPROVE",
      payload: body.payload,
      actor
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
