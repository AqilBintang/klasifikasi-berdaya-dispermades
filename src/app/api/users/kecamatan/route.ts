import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// GET /api/users/kecamatan
export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: {
        role: 'USER' // Kecamatan users have role USER
      },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        kabupaten: { select: { nama: true, kode: true } },
        kecamatan: { select: { nama: true, kode: true } },
        _count: { select: { selfAssessments: true } },
      },
      orderBy: [
        { kabupaten: { nama: 'asc' } },
        { kecamatan: { nama: 'asc' } },
        { createdAt: 'desc' }
      ],
    })
    
    const data = users.map((u) => ({
      ...u,
      kabupaten: u.kabupaten?.nama ?? null,
      kecamatan: u.kecamatan?.nama ?? null,
      kabupatenKode: u.kabupaten?.kode ?? null,
      kecamatanKode: u.kecamatan?.kode ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
    
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/users/kecamatan]', err)
    return NextResponse.json({ error: 'Gagal mengambil data user kecamatan.' }, { status: 500 })
  }
}