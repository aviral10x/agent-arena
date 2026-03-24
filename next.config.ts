import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      // Leaderboard: fresh every 30s, stale-while-revalidate 60s
      {
        source: "/api/leaderboard",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=30, stale-while-revalidate=60" },
        ],
      },
      // OG images: cache for 1 hour (they change rarely)
      {
        source: "/api/og/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      // Live odds: very short cache, revalidate quickly
      {
        source: "/api/competitions/:id/odds",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=5, stale-while-revalidate=10" },
        ],
      },
      // Competition list: moderate cache
      {
        source: "/api/competitions",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=15, stale-while-revalidate=30" },
        ],
      },
      // Agent list: cache 60s
      {
        source: "/api/agents",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
      // Security headers for all routes
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
