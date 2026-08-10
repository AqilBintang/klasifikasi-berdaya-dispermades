import { prisma } from '@/lib/prisma'
import { ValidationTableClient } from '@/components/admin/ValidationTableClient'

async function getSubmissions() {
  const rows = await prisma.selfAssessment.findMany({
    where: { status: 'SUBMITTED' },
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
        include: { validator: { select: { id: true, name: true } } },
      },
    },
    orderBy: [
      { submittedBy: { kecamatan: { nama: 'asc' } } },
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  // Kumpulkan userAssessmentStatus per (userId, assessmentId) dalam satu query
  const pairs = [...new Map(rows.map((r) => {
    const key = `${r.submittedById}:${r.indicator.category.assessment.id}`
    return [key, { userId: r.submittedById, assessmentId: r.indicator.category.assessment.id }]
  })).values()]

  const statuses = pairs.length > 0
    ? await prisma.userAssessmentStatus.findMany({
        where: {
          OR: pairs.map((p) => ({ userId: p.userId, assessmentId: p.assessmentId })),
        },
        select: { userId: true, assessmentId: true, status: true },
      })
    : []

  const statusMap = new Map(statuses.map((s) => [`${s.userId}:${s.assessmentId}`, s.status]))

  return rows.map((r) => {
    const key = `${r.submittedById}:${r.indicator.category.assessment.id}`
    return {
      ...r,
      submittedBy: {
        ...r.submittedBy,
        kabupaten: r.submittedBy.kabupaten?.nama ?? null,
        kecamatan: r.submittedBy.kecamatan?.nama ?? null,
      },
      // null jika belum ada record status (belum pernah mulai)
      submitterAssessmentStatus: statusMap.get(key) ?? null,
    }
  })
}

export default async function ValidatorValidasiPage() {
  const submissions = await getSubmissions()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Validasi Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review dan validasi self assessment yang disubmit oleh kecamatan
        </p>
      </div>
      <ValidationTableClient initialSubmissions={submissions} />
    </div>
  )
}
