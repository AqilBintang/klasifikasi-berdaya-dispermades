import { PrismaClient } from '@prisma/client'

// Singleton pattern — mencegah multiple instances di dev hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL ?? ''
  // Paksa connection_limit=2 untuk serverless (Vercel).
  // Setiap function instance hanya boleh buka 2 koneksi ke MySQL.
  // ponytail: naikkan ke 5 jika ada query paralel yang sering timeout.
  const url = new URL(baseUrl)
  url.searchParams.set('connection_limit', '10')
  url.searchParams.set('pool_timeout', '10')

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: { db: { url: url.toString() } },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
