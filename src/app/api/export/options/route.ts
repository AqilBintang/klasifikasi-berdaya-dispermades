import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const userKecamatan = session.user.kecamatan ?? null

  const [periodesRaw, kecamatansRaw] = await Promise.all([
    prisma.assessmentBackup.findMany({
      where:
        role === 'USER'
          ? { kecamatan: userKecamatan }
          : {},
      distinct: ['periode'],
      select: { periode: true },
      orderBy: { periode: 'asc' },
    }),
    prisma.user.findMany({
      where:
        role === 'USER'
          ? { kecamatan: userKecamatan }
          : { role: 'USER', isActive: true, kecamatan: { not: null } },
      distinct: ['kecamatan'],
      select: { kecamatan: true },
      orderBy: { kecamatan: 'asc' },
    }),
  ])

  const periodes = periodesRaw.map((p) => p.periode).filter(Boolean)
  const kecamatans = kecamatansRaw.map((k) => k.kecamatan).filter(Boolean) as string[]

  return NextResponse.json({
    data: {
      periodes,
      kecamatans,
      default: {
        periode: periodes[periodes.length - 1] ?? null,
        kecamatan: role === 'USER' ? userKecamatan : null,
      },
    },
  })
}
