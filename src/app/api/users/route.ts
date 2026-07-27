import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  name:      z.string().min(1).max(100).trim(),
  email:     z.string().email().max(150).trim().toLowerCase(),
  password:  z.string().min(8).max(100),
  role:      z.enum(['ADMIN', 'VALIDATOR', 'USER']).default('USER'),
  kabupaten: z.string().max(100).trim().optional(),
  kecamatan: z.string().max(100).trim().optional(),
})

// GET /api/users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, kabupaten: true, kecamatan: true, isActive: true,
        createdAt: true,
        _count: { select: { selfAssessments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: users })
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ error: 'Gagal mengambil data user.' }, { status: 500 })
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, role, kabupaten, kecamatan } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah digunakan.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name, email, passwordHash, role,
        kabupaten: kabupaten ?? null,
        kecamatan: kecamatan ?? null,
      },
      select: { id: true, name: true, email: true, role: true, kabupaten: true, kecamatan: true, isActive: true, createdAt: true },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Gagal membuat user.' }, { status: 500 })
  }
}
