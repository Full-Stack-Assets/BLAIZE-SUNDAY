import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "songforge-os",
    deploymentSha: process.env.SONGFORGE_BUILD_SHA?.trim() || "unknown"
  });
}
