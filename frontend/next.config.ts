import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: "/graphql",
        destination: `${BACKEND_URL}/graphql`,
      },
      {
        source: "/graphql/ws",
        destination: `${BACKEND_URL}/graphql/ws`,
      },
    ];
  },
};

export default nextConfig;
