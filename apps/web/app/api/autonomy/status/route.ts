import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    autonomy: "running",
    note: "Internal generation may run within budget. External actions stay I4."
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    autonomy: process.env.SONGFORGE_MODE === "test" ? "test" : "live"
  });
}
