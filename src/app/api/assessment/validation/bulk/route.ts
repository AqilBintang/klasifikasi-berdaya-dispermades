import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { deleteBackupsForSelfAssessmentIds, upsertBackupsForSelfAssessmentIds } from '@/lib/export/backup-snapshot'
import { revalidateTag } from 'next/cache'

const bulkSchema = z.object({
  selfAssessmentIds: z.array(z.number().int().positive()).min(1),
  // validatorId diambil dari session, bukan dari body — cegah audit trail palsu
  status:            z.enum(['APPROVED', 'REJECTED', 'REVISION_NEEDED']),
  notes:             z.string().max(2000).trim().optional().nullable(),
})

// POST /api/assessment/validation/bulk
// Validasi banyak self assessment sekaligus dengan keputusan yang sama
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['ADMIN', 'VALIDATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body   = await req.json()
    const parsed = bulkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { selfAssessmentIds, status, notes } = parsed.data
    // validatorId selalu dari session — tidak pernah dari request body
    const validatorId = parseInt(session.user.id, 10)

    // Hanya proses yang berstatus SUBMITTED
    const submissions = await prisma.selfAssessment.findMany({
      where: { id: { in: selfAssessmentIds }, status: 'SUBMITTED' },
      select: {
        id: true,
        submittedById: true,
        periode: true,
        indicator: { select: { category: { select: { assessmentId: true } } } },
      },
    })

    if (submissions.length === 0) {
      return NextResponse.json({ error: 'Tidak ada submission yang bisa divalidasi.' }, { status: 400 })
    }

    // Each row already carries its version through indicatorId.  A newer
    // template must not hide or invalidate submitted historical rows.
    const validSubmissions = submissions
    const skippedCount = 0

    const newStatus =
      status === 'APPROVED'       ? 'VALIDATED' :
      status === 'REJECTED'       ? 'REJECTED' : 'DRAFT'

    await prisma.$transaction(async (tx) => {
      // Buat validation record untuk setiap submission
      await tx.assessmentValidation.createMany({
        data: validSubmissions.map((sa) => ({
          selfAssessmentId: sa.id,
          validatorId,
          status,
          notes: notes ?? null,
        })),
      })

      // Update status self assessment
      await tx.selfAssessment.updateMany({
        where: { id: { in: validSubmissions.map((s) => s.id) } },
        data:  { status: newStatus },
      })
    })

    const ids = validSubmissions.map((s) => s.id)
    if (newStatus === 'VALIDATED') await upsertBackupsForSelfAssessmentIds(ids)
    else await deleteBackupsForSelfAssessmentIds(ids)
    revalidateTag('klasifikasi-agg', 'max')

    return NextResponse.json({
      message: `${validSubmissions.length} submission berhasil divalidasi.${skippedCount > 0 ? ` ${skippedCount} dilewati karena kecamatan sedang revisi.` : ''}`,
      count:   validSubmissions.length,
      skippedCount,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/assessment/validation/bulk]', err)
    return NextResponse.json({ error: 'Gagal melakukan bulk validasi.' }, { status: 500 })
  }
}
