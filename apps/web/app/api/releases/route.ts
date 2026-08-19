import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const releases = await prisma.release.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { title: true, workingTitle: true } },
        approvals: { where: { status: "PENDING" }, select: { id: true } },
        events: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    return NextResponse.json({ ok: true, releases });
  } catch (error) {
    return apiError(error);
  }
}
