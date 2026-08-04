import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { prisma } from '@/lib/prisma'
import { AssessmentListClient } from '@/components/admin/AssessmentListClient'

async function getAssessments() {
  return prisma.assessment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      categories: {
        select: {
          id: true,
          name: true,
          _count: { select: { indicators: true } },
        },
      },
    },
  })
}

export default async function AssessmentListPage() {
  const assessments = await getAssessments()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daftar Assessment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Kelola template assessment yang tersedia
          </p>
        </div>
        <Link
          href="/admin/assessment/create"
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Buat Assessment
        </Link>
      </div>

      <AssessmentListClient assessments={assessments} />
    </div>
  )
}
