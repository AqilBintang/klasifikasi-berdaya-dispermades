import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { auditLog } from '@/lib/audit'

const itemSchema = z.object({
  indicatorId:   z.number().int().positive(),
  submittedById: z.number().int().positive(),
  periode:       z.string().min(4).max(20).regex(/^[\w-]+$/),
  description:   z.string().min(1).max(5000).trim(),
  score:         z.number().int().min(1).max(4),
  supportingDoc: z.string().url().max(500).optional().nullable(),
})

const bulkSchema = z.object({
  items:  z.array(itemSchema).min(1).max(100),
  // status: DRAFT = simpan draft, SUBMITTED = simpan + ubah status ke SUBMITTED
  status: z.enum(['DRAFT', 'SUBMITTED']).default('DRAFT'),
})

// POST /api/assessment/self-assessment/bulk
// Upsert banyak indikator sekaligus dalam 1 transaksi — menggantikan 61 fetch paralel
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const body = await req.json()
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { items, status } = parsed.data
    const sessionUserId = parseInt(session.user.id, 10)
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'

    // Non-admin hanya boleh submit atas nama dirinya sendiri
    if (!isAdmin) {
      const foreignItem = items.find((e) => e.submittedById !== sessionUserId)
      if (foreignItem) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
      }
    }

    // Ambil semua indikator yang dibutuhkan dalam 1 query
    const indicatorIds = [...new Set(items.map((e) => e.indicatorId))]
    const indicators = await prisma.assessmentIndicator.findMany({
      where: { id: { in: indicatorIds } },
      select: { id: true, maxScore: true },
    })
    const indicatorMap = new Map(indicators.map((i) => [i.id, i]))

    // Validasi semua indikator ada dan skor tidak melebihi maxScore
    for (const item of items) {
      const ind = indicatorMap.get(item.indicatorId)
      if (!ind) {
        return NextResponse.json(
          { error: `Indikator ${item.indicatorId} tidak ditemukan.` },
          { status: 404 }
        )
      }
      if (item.score > ind.maxScore) {
        return NextResponse.json(
          { error: `Skor melebihi batas untuk indikator ${item.indicatorId} (maks: ${ind.maxScore}).` },
          { status: 400 }
        )
      }
    }

    // Cek apakah ada jawaban yang sudah VALIDATED — jangan timpa
    const existingValidated = await prisma.selfAssessment.findMany({
      where: {
        indicatorId:   { in: indicatorIds },
        submittedById: items[0].submittedById,
        periode:       items[0].periode,
        status:        'VALIDATED',
      },
      select: { indicatorId: true },
    })
    if (existingValidated.length > 0) {
      const validatedIds = existingValidated.map((e) => e.indicatorId)
      // Filter out validated items — jangan error, skip saja
      const safeItems = items.filter((e) => !validatedIds.includes(e.indicatorId))
      if (safeItems.length === 0) {
        return NextResponse.json({ error: 'Semua jawaban sudah divalidasi, tidak ada yang bisa diubah.' }, { status: 403 })
      }
      // Lanjut hanya dengan item yang aman
      items.splice(0, items.length, ...safeItems)
    }

    const now = new Date()

    // 1 transaksi = 1 koneksi untuk semua upsert
    await prisma.$transaction(
      items.map((e) =>
        prisma.selfAssessment.upsert({
          where: {
            indicatorId_submittedById_periode: {
              indicatorId:   e.indicatorId,
              submittedById: e.submittedById,
              periode:       e.periode,
            },
          },
          update: {
            description:   e.description,
            score:         e.score,
            supportingDoc: e.supportingDoc ?? null,
            status,
            ...(status === 'SUBMITTED' && { submittedAt: now }),
          },
          create: {
            indicatorId:   e.indicatorId,
            submittedById: e.submittedById,
            periode:       e.periode,
            description:   e.description,
            score:         e.score,
            supportingDoc: e.supportingDoc ?? null,
            status,
            ...(status === 'SUBMITTED' && { submittedAt: now }),
          },
        })
      )
    )

    // Audit log sekali untuk keseluruhan submit (bukan per indikator)
    if (status === 'SUBMITTED') {
      try {
        await auditLog.assessmentSubmitted(sessionUserId, items[0].indicatorId, req)
      } catch (err) {
        console.error('Failed to log bulk assessment submission:', err)
      }
    }

    return NextResponse.json({ ok: true, count: items.length }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Gagal menyimpan assessment.' },
      { status: 500 }
    )
  }
}
