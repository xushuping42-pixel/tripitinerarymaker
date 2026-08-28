import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the local preview cache separate from production builds so a build
  // cannot replace files while the development server is serving them.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  trailingSlash: true,
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
