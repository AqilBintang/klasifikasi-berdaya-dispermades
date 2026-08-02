import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  name:           z.string().min(1).max(100).trim(),
  email:          z.string().email().max(150).trim().toLowerCase(),
  password:       z.string().min(8).max(100),
  role:           z.enum(['ADMIN', 'VALIDATOR', 'USER']).default('USER'),
  kabupatenKode:  z.string().max(13).trim().optional(),
  kecamatanKode:  z.string().max(13).trim().optional(),
})

// GET /api/users
export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        kabupaten: { select: { nama: true } },
        kecamatan: { select: { nama: true } },
        _count: { select: { selfAssessments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const data = users.map((u) => ({
      ...u,
      kabupaten: u.kabupaten?.nama ?? null,
      kecamatan: u.kecamatan?.nama ?? null,
    }))
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ error: 'Gagal mengambil data user.' }, { status: 500 })
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, password, role, kabupatenKode, kecamatanKode } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email sudah digunakan.' }, { status: 409 })

    // Lookup wilayah FK dari kode
    let kabupatenId: number | null = null
    let kecamatanId: number | null = null
    let kabupatenName: string | null = null
    let kecamatanName: string | null = null

    if (kabupatenKode) {
      const kab = await prisma.wilayah.findUnique({ where: { kode: kabupatenKode }, select: { id: true, nama: true } })
      if (!kab) return NextResponse.json({ error: 'Kabupaten/kota tidak ditemukan.' }, { status: 400 })
      kabupatenId = kab.id
      kabupatenName = kab.nama
    }

    if (kecamatanKode) {
      const kec = await prisma.wilayah.findUnique({ where: { kode: kecamatanKode }, select: { id: true, nama: true } })
      if (!kec) return NextResponse.json({ error: 'Kecamatan tidak ditemukan.' }, { status: 400 })
      kecamatanId = kec.id
      kecamatanName = kec.nama
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name, email, passwordHash, role,
        kabupatenName,
        kecamatanName,
        kabupatenId,
        kecamatanId,
      },
      select: {
        id: true, name: true, email: true, role: true,
        kabupatenName: true, kecamatanName: true,
        isActive: true, createdAt: true,
      },
    })

    return NextResponse.json({
      data: { ...user, kabupaten: user.kabupatenName, kecamatan: user.kecamatanName },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Gagal membuat user.' }, { status: 500 })
  }
}
