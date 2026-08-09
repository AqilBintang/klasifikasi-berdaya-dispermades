import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { deleteBackupForGroup, upsertBackupIfComplete } from '@/lib/export/backup-snapshot'

const validateSchema = z.object({
  selfAssessmentId: z.number().int().positive(),
  // validatorId diambil dari session, bukan dari body — cegah audit trail palsu
  status:           z.enum(['APPROVED', 'REJECTED', 'REVISION_NEEDED']),
  validatedScore:   z.number().int().min(0).max(10).optional().nullable(),
  notes:            z.string().max(2000).trim().optional().nullable(),
})

// GET /api/assessment/validation?status=SUBMITTED&assessmentId=1&page=1&limit=50
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['ADMIN', 'VALIDATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status       = searchParams.get('status')
    const assessmentId = searchParams.get('assessmentId')
    const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    // Default limit=1000: UI (ValidationTable) mengambil semua data sekaligus lalu
    // melakukan client-side grouping + pagination per group. Limit 200 sebelumnya
    // berisiko memotong group kecamatan saat refresh(). Untuk true server pagination
    // perlu re-architect UI. Cap max=2000 untuk mencegah over-fetch.
    const limit        = Math.min(2000, Math.max(1, parseInt(searchParams.get('limit') ?? '1000', 10)))
    const skip         = (page - 1) * limit

    const where = {
      ...(status && { status: status as 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED' }),
      ...(assessmentId && {
        indicator: {
          category: {
            assessmentId: parseInt(assessmentId, 10),
          },
        },
      }),
    }

    const [total, submissions] = await Promise.all([
      prisma.selfAssessment.count({ where }),
      prisma.selfAssessment.findMany({
        where,
        skip,
        take: limit,
        include: {
          submittedBy: {
            select: {
              id: true, name: true, email: true,
              kabupaten: { select: { nama: true } },
              kecamatan: { select: { nama: true } },
            },
          },
          indicator: {
            include: {
              category: {
                include: { assessment: { select: { id: true, title: true, periode: true } } },
              },
            },
          },
          validations: {
            orderBy: { validatedAt: 'desc' },
            take: 1,
            include: {
              validator: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [
          { submittedBy: { kecamatan: { nama: 'asc' } } },
          { indicator: { category: { order: 'asc' } } },
          { indicator: { number: 'asc' } },
        ],
      }),
    ])

    return NextResponse.json({
      data: submissions.map((s) => ({
        ...s,
        submittedBy: {
          ...s.submittedBy,
          kabupaten: s.submittedBy.kabupaten?.nama ?? null,
          kecamatan: s.submittedBy.kecamatan?.nama ?? null,
        },
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[GET /api/assessment/validation]', err)
    return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 })
  }
}

// POST /api/assessment/validation — validasi satu self assessment
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['ADMIN', 'VALIDATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // validatorId selalu dari session — tidak pernah dari request body
    const validatorId = parseInt(session.user.id, 10)
    const { selfAssessmentId, status, validatedScore, notes } = parsed.data

    // Cek self assessment ada dan statusnya SUBMITTED
    const sa = await prisma.selfAssessment.findUnique({
      where: { id: selfAssessmentId },
      select: {
        id: true,
        status: true,
        submittedById: true,
        periode: true,
        indicator: { select: { category: { select: { assessmentId: true } } } },
      },
    })
    if (!sa) {
      return NextResponse.json({ error: 'Self assessment tidak ditemukan.' }, { status: 404 })
    }
    if (sa.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Hanya self assessment berstatus SUBMITTED yang dapat divalidasi.' },
        { status: 400 }
      )
    }

    // Simpan validasi + update status self assessment dalam satu transaksi
    const result = await prisma.$transaction(async (tx) => {
      const validation = await tx.assessmentValidation.create({
        data: {
          selfAssessmentId,
          validatorId,
          status,
          validatedScore: validatedScore ?? null,
          notes: notes ?? null,
        },
      })

      // Update status self assessment berdasarkan hasil validasi
      const newStatus =
        status === 'APPROVED' ? 'VALIDATED' :
        status === 'REJECTED' ? 'REJECTED'  : 'SUBMITTED' // REVISION_NEEDED tetap SUBMITTED

      await tx.selfAssessment.update({
        where: { id: selfAssessmentId },
        data: { status: newStatus },
      })

      return validation
    })

    const assessmentId = sa.indicator.category.assessmentId
    if (status === 'APPROVED') await upsertBackupIfComplete({ submittedById: sa.submittedById, periode: sa.periode, assessmentId })
    else await deleteBackupForGroup({ submittedById: sa.submittedById, periode: sa.periode, assessmentId })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/assessment/validation]', err)
    return NextResponse.json({ error: 'Gagal menyimpan validasi.' }, { status: 500 })
  }
}
