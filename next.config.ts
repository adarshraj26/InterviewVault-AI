import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // UploadThing CDN
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      // DiceBear avatar API
      { protocol: "https", hostname: "api.dicebear.com" },
      // Google profile pictures
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // GitHub avatars (future-proofing)
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
