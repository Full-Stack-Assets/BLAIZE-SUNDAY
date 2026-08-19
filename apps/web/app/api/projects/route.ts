import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const projects = await prisma.songProject.findMany({
      where: { artist: { slug: "blaize-sunday" } },
      orderBy: { createdAt: "desc" },
      include: {
        release: { select: { id: true, status: true } },
        workflowRuns: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return apiError(error);
  }
}
