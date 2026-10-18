import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pastikan library Node.js ini tidak di-bundle ke Edge Runtime
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],

  // Sembunyikan header X-Powered-By: Next.js
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-Frame-Options',             value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection',            value: '1; mode=block' },
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',          value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy',  value: 'same-origin' },
        ],
      },
    ]
  },
};

export default nextConfig;
