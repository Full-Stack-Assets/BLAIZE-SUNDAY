import { NextResponse } from "next/server";

/** Lab mode: DB-backed release detail is not available yet. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      ok: false,
      error: "LAB_RELEASE_SERVICE_UNAVAILABLE",
      releaseId: id,
      message:
        "Server release store is not connected. Use the Lab Releases page (local state).",
    },
    { status: 503 }
  );
}
