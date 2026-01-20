import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'www.netflix.com',
      },
      {
        protocol: 'https',
        hostname: 'flixpatrol.com',
      },
    ],
  },
};

export default nextConfig;
