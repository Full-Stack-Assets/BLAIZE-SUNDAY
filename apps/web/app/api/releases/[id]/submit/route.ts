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
      releaseId: id,
      message: "Server release store is offline in Lab mode.",
    },
    { status: 503 }
  );
}
