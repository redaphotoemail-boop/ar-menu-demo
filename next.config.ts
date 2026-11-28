import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the zero-setup demo database) ships WASM + data files that must
  // travel with the serverless functions.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@electric-sql/pglite/dist/**", "./drizzle/**"],
  },
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async headers() {
    return [
      {
        // The menu engine is embedded in iframes on our own pages and, later, on restaurants' sites.
        source: "/engine/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
      {
        source: "/models/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
