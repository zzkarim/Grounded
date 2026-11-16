import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Demo scenarios, recordings and the manifest are read server-side with paths the bundler can't
  // trace statically (they're marked turbopackIgnore). Include exactly that folder, nothing else.
  outputFileTracingIncludes: {
    "/workspace/*": ["./data/demo/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
