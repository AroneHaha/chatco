import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this `frontend/` directory. Otherwise Next
    // infers a higher root (the repo root, which also holds `backend/` and a
    // Composer `vendor/` tree). A too-high root (a) breaks module resolution —
    // e.g. `tailwindcss` gets looked up in the wrong `node_modules` — and
    // (b) makes the dev-server file-watcher scan thousands of unrelated files,
    // pinning CPU/memory. See node_modules/next/dist/docs/.../turbopack.md.
    root: __dirname,
  },
};

export default nextConfig;
