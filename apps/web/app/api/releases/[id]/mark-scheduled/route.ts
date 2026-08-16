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
    const result = await createReleaseCommandService().recordScheduled({
      releaseId: params.id,
      provider: requiredString(body, "provider"),
      externalConfirmationId: requiredString(body, "externalConfirmationId"),
      scheduledReleaseDate: requiredString(body, "scheduledReleaseDate"),
      rawReceipt: body.rawReceipt ?? {},
      actor
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
