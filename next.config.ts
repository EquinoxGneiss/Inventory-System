import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async redirects() {
    // The inventory overview is the landing page until more ERP apps exist.
    return [
      { source: "/", destination: "/inventory/overview", permanent: false },
      { source: "/inventory", destination: "/inventory/overview", permanent: false },
    ];
  },
};

export default nextConfig;
