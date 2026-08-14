import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pastikan library Node.js ini tidak di-bundle ke Edge Runtime
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
