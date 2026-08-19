import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      ok: false,
      error: "LAB_RELEASE_SERVICE_UNAVAILABLE",
      approvalId: id,
      message: "Server approval gate is offline in Lab mode. Use /approvals (local).",
    },
    { status: 503 }
  );
}
