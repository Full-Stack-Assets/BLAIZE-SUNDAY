import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const workflow = await prisma.workflowRun.findUnique({
      where: { id },
      include: { steps: { orderBy: { startedAt: "asc" } }, project: true }
    });
    if (!workflow) {
      return NextResponse.json({ ok: false, error: "WORKFLOW_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    return apiError(error);
  }
}
