import { NextResponse } from "next/server";

/** Lab mode: server-side distribution preparation is intentionally unavailable. */
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
      message:
        "Server distribution preparation is offline in Lab mode. Use the Lab release workflow (local state).",
    },
    { status: 503 }
  );
}
