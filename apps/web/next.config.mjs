/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Silence monorepo package noise during standalone build
  transpilePackages: [],
};

export default nextConfig;
