import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const project = await prisma.songProject.findUnique({
      where: { id },
      include: {
        lyrics: true,
        release: true,
        workflowRuns: { include: { steps: true } },
        agentRuns: true
      }
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "PROJECT_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return apiError(error);
  }
}
