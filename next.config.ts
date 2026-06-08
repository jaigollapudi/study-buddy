import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / heavy packages that must run in the Node runtime, not be bundled.
  serverExternalPackages: ["@lancedb/lancedb", "mammoth", "unpdf"],
  // Pin the workspace root (a stray lockfile in $HOME confuses auto-detection).
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
