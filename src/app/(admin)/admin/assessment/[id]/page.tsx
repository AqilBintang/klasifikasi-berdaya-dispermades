import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { EditAssessmentForm } from '@/components/admin/EditAssessmentForm'

interface AssessmentDetail {
  id: number
  title: string
  description: string | null
  periode: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isLocked: boolean
  answerCount: number
  categories: {
    id: number
    code: string
    name: string
    description: string | null
    order: number
    indicators: {
      id: number
      number: number
      indicator: string
      maxScore: number
    }[]
  }[]
}

async function getAssessment(id: string): Promise<AssessmentDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/assessment/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const assessment = await getAssessment(id)

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
