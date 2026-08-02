import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { EditAssessmentForm } from '@/components/admin/EditAssessmentForm'
import { prisma } from '@/lib/prisma'

async function getAssessment(id: number) {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: { indicators: { orderBy: { number: 'asc' } } },
      },
    },
  })
  if (!assessment) return null
  const answerCount = await prisma.selfAssessment.count({
    where: { indicator: { category: { assessmentId: id } } },
  })
  return { ...assessment, isLocked: answerCount > 0, answerCount }
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const assessment = await getAssessment(numId)
  if (!assessment) notFound()

  return (
    <div className="space-y-6">
      {/* Back + heading */}
      <div>
        <Link
          href="/admin/assessment/create"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali ke Daftar Assessment
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Periode: {assessment.periode} · Status: {assessment.status}
              {assessment.isLocked && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  🔒 Terkunci · {assessment.answerCount} jawaban masuk
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <EditAssessmentForm assessment={assessment} isLocked={assessment.isLocked} />
    </div>
  )
}
