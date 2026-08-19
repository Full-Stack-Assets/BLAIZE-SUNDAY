import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["bullmq", "ioredis"],
  transpilePackages: [
    "@songforge/agents",
    "@songforge/canon",
    "@songforge/database",
    "@songforge/integrations",
    "@songforge/llm",
    "@songforge/policy",
    "@songforge/release",
    "@songforge/shared",
    "@songforge/storage",
    "@songforge/voice"
  ]
};

export default nextConfig;
