import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

// ─── Input validation schema ───────────────────────────────────────────────
// Menggunakan Zod untuk validasi + sanitasi input sebelum masuk ke database
// Ini mencegah injection dan data tidak valid

const createSchema = z.object({
  indicatorId:  z.number().int().positive(),
  submittedById: z.number().int().positive(),
  periode:      z.string().min(4).max(20).regex(/^[\w-]+$/), // contoh: "2025" atau "2025-Q1"
  description:  z.string().min(1).max(5000).trim(),
  score:        z.number().int().min(1).max(4),
  supportingDoc: z.string().url().max(500).optional().nullable(),
})

// GET /api/assessment/self-assessment?indicatorId=1&submittedById=1&periode=2025
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { searchParams } = new URL(req.url)

    // Parse & validate query params — prevent injection via input coercion
    const indicatorId   = parseInt(searchParams.get('indicatorId') ?? '0', 10)
    const submittedById = parseInt(searchParams.get('submittedById') ?? '0', 10)
    const periode       = searchParams.get('periode') ?? ''

    // Non-admin hanya boleh lihat data miliknya sendiri
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'
    const effectiveSubmittedById = isAdmin
      ? (submittedById > 0 ? submittedById : undefined)
      : parseInt(session.user.id, 10)

    // Prisma menggunakan parameterized queries — aman dari SQL injection
    const results = await prisma.selfAssessment.findMany({
      where: {
        ...(indicatorId          > 0 && { indicatorId }),
        ...(effectiveSubmittedById && { submittedById: effectiveSubmittedById }),
        ...(periode               && { periode }),
      },
      include: {
        indicator: {
          include: { category: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true }, // jangan expose passwordHash
        },
        validations: {
          orderBy: { validatedAt: 'desc' },
          take: 1, // validasi terbaru
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: results })
  } catch {
    return NextResponse.json(
      { error: 'Gagal mengambil data self assessment.' },
      { status: 500 }
    )
  }
}

// POST /api/assessment/self-assessment
// Buat atau update self assessment (upsert per indikator+user+periode)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const body = await req.json()

    // Validasi input dengan Zod — reject data tidak valid sebelum menyentuh DB
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { indicatorId, submittedById, periode, description, score, supportingDoc } = parsed.data

    // Non-admin hanya boleh submit atas nama dirinya sendiri
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && submittedById !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    // Verifikasi indicator ada
    const indicator = await prisma.assessmentIndicator.findUnique({
      where: { id: indicatorId },
    })
    if (!indicator) {
      return NextResponse.json({ error: 'Indikator tidak ditemukan.' }, { status: 404 })
    }

    // Validasi skor tidak melebihi maxScore indikator
    if (score > indicator.maxScore) {
      return NextResponse.json(
        { error: `Skor maksimal untuk indikator ini adalah ${indicator.maxScore}.` },
        { status: 400 }
      )
    }

    // Upsert — update jika sudah ada, create jika belum
    const result = await prisma.selfAssessment.upsert({
      where: {
        indicatorId_submittedById_periode: {
          indicatorId,
          submittedById,
          periode,
        },
      },
      update: {
        description,
        score,
        supportingDoc: supportingDoc ?? null,
        status: 'DRAFT',
      },
      create: {
        indicatorId,
        submittedById,
        periode,
        description,
        score,
        supportingDoc: supportingDoc ?? null,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Gagal menyimpan self assessment.' },
      { status: 500 }
    )
  }
}
