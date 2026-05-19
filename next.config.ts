import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Abaikan amaran ESLint semasa proses Vercel build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Abaikan amaran TypeScript semasa proses Vercel build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;