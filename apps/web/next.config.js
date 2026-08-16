/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@songforge/agents",
    "@songforge/database",
    "@songforge/release",
    "@songforge/shared"
  ]
};

export default nextConfig;
