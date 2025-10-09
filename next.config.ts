import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com", // Clerk'in kullandığı domain
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
