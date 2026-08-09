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

  // Normalize relasi wilayah (objek) → string agar sesuai type ValidationTable
  return rows.map((r) => ({
    ...r,
    submittedBy: {
      ...r.submittedBy,
      kabupaten: r.submittedBy.kabupaten?.nama ?? null,
      kecamatan: r.submittedBy.kecamatan?.nama ?? null,
    },
  }))
}

export default async function ValidationAssessmentPage() {
  const submissions = await getSubmissions()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Validation Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review dan validasi self assessment yang disubmit oleh kecamatan
        </p>
      </div>
      <ValidationTableClient initialSubmissions={submissions} />
    </div>
  )
}
