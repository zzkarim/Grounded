import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Demo scenarios, recordings and the manifest are read server-side with paths the bundler can't
  // trace statically (they're marked turbopackIgnore). Include exactly that folder, nothing else.
  outputFileTracingIncludes: {
    "/workspace/*": ["./data/demo/**/*"],
  },
  // Pages re-render server-side when their cache revalidates, so they ship the data they read:
  // demo scenarios/recordings, the TEST run files, the TEST benchmark and FROZEN.json. Nothing below
  // is read at runtime, so it isn't shipped (the files themselves are untouched).
  outputFileTracingExcludes: {
    "/*": [
      "./data/benchmark/dev/**",
      "./data/benchmark/examples/**",
      "./data/benchmark/*.md",
      "./data/runs/dev/**",
      "./data/runs/example/**",
      "./data/runs/test/*.md",
      "./data/analysis/**",
    ],
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
