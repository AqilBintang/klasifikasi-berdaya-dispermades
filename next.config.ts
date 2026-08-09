import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma client perlu ini agar tidak di-bundle dengan error
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
