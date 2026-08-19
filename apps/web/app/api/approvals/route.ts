import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const approvals = await prisma.approval.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        project: { select: { title: true } },
        release: { select: { id: true, status: true } }
      }
    });
    return NextResponse.json({ ok: true, approvals });
  } catch (error) {
    return apiError(error);
  }
}
