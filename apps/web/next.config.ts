import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for the Docker / Fly production image
  output: "standalone",
};

export default nextConfig;
