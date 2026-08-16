import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

export async function GET() {
  const releases = await prisma.release.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true, workingTitle: true } },
      approvals: { where: { status: "PENDING" }, select: { id: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  return NextResponse.json({ ok: true, releases });
}
