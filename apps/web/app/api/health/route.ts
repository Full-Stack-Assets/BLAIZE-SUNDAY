import { NextResponse } from "next/server";

import { buildHealthReport } from "@/lib/health-report";

export async function GET() {
  return NextResponse.json(await buildHealthReport());
}
