import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role

  // Untuk USER: cari kecamatanId dari session user itu sendiri
  let userKecamatanId: number | null = null
  let userKecamatanNama: string | null = null
  if (role === 'USER') {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { kecamatanId: true, kecamatan: { select: { nama: true } } },
    })
    userKecamatanId = me?.kecamatanId ?? null
    userKecamatanNama = me?.kecamatan?.nama ?? null
  }

  const [periodesRaw, kecamatansRaw] = await Promise.all([
    prisma.assessmentBackup.findMany({
      where: role === 'USER' && userKecamatanNama
        ? { kecamatan: userKecamatanNama }
        : {},
      distinct: ['periode'],
      select: { periode: true },
      orderBy: { periode: 'asc' },
    }),
    // Ambil kecamatanId distinct dari user aktif, lalu resolve nama via wilayah
    prisma.user.findMany({
      where: role === 'USER' && userKecamatanId
        ? { kecamatanId: userKecamatanId }
        : { role: 'USER', isActive: true, kecamatanId: { not: null } },
      distinct: ['kecamatanId'],
      select: { kecamatan: { select: { nama: true } } },
      orderBy: { kecamatan: { nama: 'asc' } },
    }),
  ])

  const periodes = periodesRaw.map((p) => p.periode).filter(Boolean)
  const kecamatans = kecamatansRaw.map((k) => k.kecamatan?.nama).filter((n): n is string => !!n)

  return NextResponse.json({
    data: {
      periodes,
      kecamatans,
      default: {
        periode: periodes[periodes.length - 1] ?? null,
        kecamatan: role === 'USER' ? userKecamatanNama : null,
      },
    },
  })
}
