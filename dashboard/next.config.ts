import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/agents",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
