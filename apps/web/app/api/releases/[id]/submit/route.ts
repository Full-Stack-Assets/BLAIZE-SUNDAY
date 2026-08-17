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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const actor = requireApprovalActor(request, body);
    const result = await createReleaseCommandService().recordExternalSubmission({
      releaseId: id,
      actionPackageId: requiredString(body, "actionPackageId"),
      approvalId: requiredString(body, "approvalId"),
      provider: requiredString(body, "provider"),
      externalConfirmationId: requiredString(body, "externalConfirmationId"),
      rawReceipt: body.rawReceipt ?? {},
      actor
    });
    return NextResponse.json({
      ok: true,
      message: "Verified provider submission receipt recorded.",
      ...result
    });
  } catch (error) {
    return apiError(error);
  }
}
