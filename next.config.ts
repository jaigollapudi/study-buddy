import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that must run in the Node runtime, not be bundled.
  serverExternalPackages: ["postgres", "mammoth", "unpdf"],
  // Pin the workspace root (a stray lockfile in $HOME confuses auto-detection).
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
