import { NextResponse } from "next/server";

/** Lab mode: list endpoint without Prisma. */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "LAB_RELEASE_SERVICE_UNAVAILABLE",
      releases: [],
      message:
        "Server release store is not connected. Use the Lab Releases page (local state).",
    },
    { status: 503 }
  );
}
