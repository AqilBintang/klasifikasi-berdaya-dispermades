import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkSchema = z.object({
  selfAssessmentIds: z.array(z.number().int().positive()).min(1),
  validatorId:       z.number().int().positive(),
  status:            z.enum(['APPROVED', 'REJECTED', 'REVISION_NEEDED']),
  notes:             z.string().max(2000).trim().optional().nullable(),
})

// POST /api/assessment/validation/bulk
// Validasi banyak self assessment sekaligus dengan keputusan yang sama
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = bulkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { selfAssessmentIds, validatorId, status, notes } = parsed.data

    // Hanya proses yang berstatus SUBMITTED
    const submissions = await prisma.selfAssessment.findMany({
      where: { id: { in: selfAssessmentIds }, status: 'SUBMITTED' },
    })

    if (submissions.length === 0) {
      return NextResponse.json({ error: 'Tidak ada submission yang bisa divalidasi.' }, { status: 400 })
    }

    const newStatus =
      status === 'APPROVED'       ? 'VALIDATED' :
      status === 'REJECTED'       ? 'REJECTED'  : 'SUBMITTED'

    await prisma.$transaction(async (tx) => {
      // Buat validation record untuk setiap submission
      await tx.assessmentValidation.createMany({
        data: submissions.map((sa) => ({
          selfAssessmentId: sa.id,
          validatorId,
          status,
          notes: notes ?? null,
        })),
      })

      // Update status self assessment
      await tx.selfAssessment.updateMany({
        where: { id: { in: submissions.map((s) => s.id) } },
        data:  { status: newStatus },
      })
    })

    return NextResponse.json({
      message: `${submissions.length} submission berhasil divalidasi.`,
      count:   submissions.length,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/assessment/validation/bulk]', err)
    return NextResponse.json({ error: 'Gagal melakukan bulk validasi.' }, { status: 500 })
  }
}
