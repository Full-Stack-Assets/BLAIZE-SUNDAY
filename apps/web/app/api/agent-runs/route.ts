import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { project: { select: { title: true } } }
    });
    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    return apiError(error);
  }
}
