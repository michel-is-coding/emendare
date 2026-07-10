import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome pour l'image Docker (apps/web/Dockerfile)
  output: "standalone",
  // Racine du monorepo pnpm, pour que le tracing embarque les deps hoistées
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
