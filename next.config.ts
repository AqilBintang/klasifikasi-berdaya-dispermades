import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose DATABASE_URL ke server-side runtime
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? '',
  },
  // Prisma client perlu ini agar tidak di-bundle dengan error
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
