import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      project: {
        include: {
          metadata: true,
          rights: true,
          audioAssets: { orderBy: { createdAt: "desc" } },
          visualAssets: { orderBy: { createdAt: "desc" } }
        }
      },
      approvals: { orderBy: { requestedAt: "desc" } },
      actionPackages: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "asc" } },
      receipts: { orderBy: { createdAt: "asc" } },
      revisions: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!release) {
    return NextResponse.json({ ok: false, error: "RELEASE_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, release });
}
