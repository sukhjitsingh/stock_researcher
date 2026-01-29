import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@stock-researcher/shared",
    "@stock-researcher/db",
  ],
};

export default nextConfig;
