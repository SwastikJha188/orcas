import type { NextConfig } from "next";

/** The ULTRON backend (backend/), which serves every /api route. */
const API_URL = process.env.ULTRON_API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The browser keeps calling /api on this origin (same cookies); Next forwards it.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Dev only: compiled routes nobody has opened for a minute are dropped, so a
  // long-running dev server does not keep every page it ever built in memory.
  onDemandEntries: {
    maxInactiveAge: 60_000,
    pagesBufferLength: 3,
  },
  experimental: {
    // Turbopack keeps its whole build graph in memory and only evicts above this
    // ceiling; without one a dev server open for hours climbs past 6 GB.
    turbopackMemoryLimit: 1536 * 1024 * 1024,
    // drei is a barrel of ~200 modules; resolve only the three we import.
    optimizePackageImports: ["@react-three/drei"],
  },
};

export default nextConfig;
