import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
