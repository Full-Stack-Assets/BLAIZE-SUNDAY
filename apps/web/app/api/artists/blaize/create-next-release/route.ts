import { NextResponse } from "next/server";

import { apiError, readJsonObject, requireApprovalActor } from "@/lib/api";
import { executeCreateNextRelease } from "@/lib/create-next-release.server";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const actor = requireApprovalActor(request, body);
    const result = await executeCreateNextRelease({
      actor,
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined
    });
    return NextResponse.json(
      {
        ok: true,
        created: result.created,
        workflowId: result.workflow.id,
        projectId: result.workflow.projectId,
        queue: "queue" in result.workflow ? result.workflow.queue : "INLINE_UNCONFIGURED"
      },
      { status: 202 }
    );
  } catch (error) {
    return apiError(error);
  }
}
