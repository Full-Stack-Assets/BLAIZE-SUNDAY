import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for the Docker / Fly production image
  output: "standalone",
  // Critical for monorepo: preserves apps/web/ structure in standalone output
  // so that CMD ["node", "apps/web/server.js"] works correctly
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
