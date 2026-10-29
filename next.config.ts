import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Admin uploads (CMS, products, avatars) are stored on Cloudinary.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", port: "", search: "" },
    ],
  },
};

export default nextConfig;
