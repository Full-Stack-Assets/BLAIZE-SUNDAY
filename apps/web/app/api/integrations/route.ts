import { inspectIntegrations } from "@songforge/integrations";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, integrations: inspectIntegrations() });
}
