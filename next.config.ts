import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string) => ({
  /* config options here */
  // Keep next dev's incremental output separate from production builds. Next 16
  // otherwise shares .next between both processes, so a build can stale a live dev server.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
});

export default nextConfig;
