import type { NextConfig } from "next";

const staticDemo = process.env.THREE_BODY_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  basePath: staticDemo ? "/three-body/demo" : undefined,
  output: staticDemo ? "export" : undefined,
  trailingSlash: staticDemo,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
