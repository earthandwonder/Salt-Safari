import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "inaturalist-open-data.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "static.inaturalist.org",
      },
      {
        protocol: "https",
        hostname: "pub-679ea585b55d48a78970795a14563299.r2.dev",
      },
    ],
  },
};

export default nextConfig;
