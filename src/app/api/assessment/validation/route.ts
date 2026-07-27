import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const validateSchema = z.object({
  selfAssessmentId: z.number().int().positive(),
  validatorId:      z.number().int().positive(),
  status:           z.enum(['APPROVED', 'REJECTED', 'REVISION_NEEDED']),
  validatedScore:   z.number().int().min(0).max(10).optional().nullable(),
  notes:            z.string().max(2000).trim().optional().nullable(),
})

// GET /api/assessment/validation?status=SUBMITTED&assessmentId=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status      = searchParams.get('status')
    const assessmentId = searchParams.get('assessmentId')

    const submissions = await prisma.selfAssessment.findMany({
      where: {
        ...(status && { status: status as 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED' }),
        ...(assessmentId && {
          indicator: {
            category: {
              assessmentId: parseInt(assessmentId, 10),
            },
          },
        }),
      },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
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
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({ data: submissions })
  } catch (err) {
    console.error('[GET /api/assessment/validation]', err)
    return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 })
  }
}

// POST /api/assessment/validation — validasi satu self assessment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { selfAssessmentId, validatorId, status, validatedScore, notes } = parsed.data

    // Cek self assessment ada dan statusnya SUBMITTED
    const sa = await prisma.selfAssessment.findUnique({
      where: { id: selfAssessmentId },
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

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/assessment/validation]', err)
    return NextResponse.json({ error: 'Gagal menyimpan validasi.' }, { status: 500 })
  }
}
