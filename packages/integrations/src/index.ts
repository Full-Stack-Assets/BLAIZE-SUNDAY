import { storageHealth } from "@songforge/storage";

export type IntegrationStatus =
  | "CONNECTED"
  | "DEGRADED"
  | "UNCONFIGURED"
  | "UNAUTHORIZED"
  | "FAILED";

export interface IntegrationReport {
  id: string;
  provider: string;
  status: IntegrationStatus;
  capabilities: string[];
  detail: string;
}

function envStatus(key: string, capabilities: string[]): IntegrationReport["status"] {
  return process.env[key]?.trim() ? "UNAUTHORIZED" : "UNCONFIGURED";
}

export function inspectIntegrations(): IntegrationReport[] {
  const llmKey = Boolean(process.env.OPENAI_API_KEY || process.env.GROK_API_KEY);
  const routeNoteBrowserHostEnabled =
    process.env.ROUTENOTE_BROWSER_HOST_ENABLED?.trim() === "1";

  return [
    {
      id: "postgres",
      provider: "postgresql",
      status: process.env.DATABASE_URL ? "CONNECTED" : "UNCONFIGURED",
      capabilities: ["canonical_state"],
      detail: process.env.DATABASE_URL ? "DATABASE_URL present" : "DATABASE_URL missing"
    },
    {
      id: "redis",
      provider: "redis",
      status: process.env.REDIS_URL ? "CONNECTED" : "UNCONFIGURED",
      capabilities: ["queue"],
      detail: process.env.REDIS_URL ? "REDIS_URL present" : "inline execution"
    },
    {
      id: "s3",
      provider: "s3",
      status: storageHealth() === "CONNECTED" ? "CONNECTED" : "UNCONFIGURED",
      capabilities: ["immutable_binaries"],
      detail: storageHealth()
    },
    {
      id: "openai",
      provider: "openai",
      status: llmKey ? "CONNECTED" : "UNCONFIGURED",
      capabilities: ["structured_completion"],
      detail: llmKey ? "server key present" : "OPENAI_API_KEY missing"
    },
    {
      id: "elevenlabs",
      provider: "elevenlabs",
      status: envStatus("ELEVENLABS_API_KEY", ["tts", "music", "voice_design"]),
      capabilities: ["tts", "music", "voice_design"],
      detail: "Capability check only; no live claim without health ping"
    },
    {
      id: "airtable",
      provider: "airtable",
      status: process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID
        ? "UNAUTHORIZED"
        : "UNCONFIGURED",
      capabilities: ["projection"],
      detail: "Optional one-way projection"
    },
    {
      id: "drive",
      provider: "google_drive",
      status: envStatus("GOOGLE_DRIVE_FOLDER_ID", ["archive"]),
      capabilities: ["archive"],
      detail: "OAuth not verified"
    },
    {
      id: "youtube",
      provider: "youtube",
      status: process.env.YOUTUBE_CLIENT_ID ? "UNAUTHORIZED" : "UNCONFIGURED",
      capabilities: ["prepare_upload"],
      detail: "Submit remains I4"
    },
    {
      id: "routenote",
      provider: "routenote",
      status: routeNoteBrowserHostEnabled ? "UNAUTHORIZED" : "UNCONFIGURED",
      capabilities: [
        "prepare_release",
        "create_release",
        "upload_audio",
        "upload_artwork",
        "configure_metadata",
        "configure_stores",
        "prepare_draft"
      ],
      detail: routeNoteBrowserHostEnabled
        ? "Browser host configured; authenticated RouteNote session not live-verified by this health projection"
        : "Authenticated RouteNote browser page must be supplied by a host runtime"
    },
    {
      id: "dsp",
      provider: "distributor",
      status: process.env.DSP_API_TOKEN ? "UNAUTHORIZED" : "UNCONFIGURED",
      capabilities: ["prepare_package"],
      detail: "Submit remains I4"
    }
  ];
}

export function neverClaimConnected(report: IntegrationReport): boolean {
  return report.status === "CONNECTED" ? Boolean(report.detail) : true;
}

export * from "./routenote/index.ts";
