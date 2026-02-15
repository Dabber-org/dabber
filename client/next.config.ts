import type { NextConfig } from "next";

// Trigger env validation at build time
import "./src/env.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
