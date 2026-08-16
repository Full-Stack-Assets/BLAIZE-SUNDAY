import { NextResponse } from "next/server";

import {
  apiError,
  readJsonObject,
  requireApprovalActor,
  requiredString
} from "../../../../../lib/api";
import { createReleaseCommandService } from "../../../../../lib/release-service.server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await readJsonObject(request);
    const actor = requireApprovalActor(request, body);
    const result = await createReleaseCommandService().resolveApproval({
      approvalId: params.id,
      decision: "REQUEST_REVISION",
      payload: body.payload,
      actor,
      note: requiredString(body, "note")
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
