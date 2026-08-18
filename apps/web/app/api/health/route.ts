import { prisma } from "@songforge/database";
import { inspectIntegrations } from "@songforge/integrations";
import { getServerApiKey, operatingMode } from "@songforge/llm";
import { NextResponse } from "next/server";

export async function GET() {
  let database: "CONNECTED" | "FAILED" | "UNCONFIGURED" = process.env.DATABASE_URL
    ? "FAILED"
    : "UNCONFIGURED";
  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "CONNECTED";
    } catch {
      database = "FAILED";
    }
  }

  return NextResponse.json({
    ok: database !== "FAILED",
    product: "songforge-os",
    mode: operatingMode(),
    auth: {
      approvalTokenConfigured: Boolean(process.env.APPROVAL_API_TOKEN)
    },
    llm: {
      serverKeyConfigured: Boolean(getServerApiKey())
    },
    database,
    integrations: inspectIntegrations().map((item) => ({
      id: item.id,
      status: item.status
    }))
  });
}
