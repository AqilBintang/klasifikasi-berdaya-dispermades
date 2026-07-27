import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { KecamatanAssessmentForm } from '@/components/kecamatan/KecamatanAssessmentForm'

export default async function KecamatanAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const userId = parseInt(session.user.id ?? '0', 10)

  const assessment = await prisma.assessment.findUnique({
    where: { id: parseInt(id, 10), status: 'PUBLISHED' },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: {
          indicators: {
            orderBy: { number: 'asc' },
          },
        },
      },
    },
  })

  if (!assessment) notFound()

  // Ambil self assessment yang sudah diisi user ini
  const existingEntries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      periode: assessment.periode,
      indicator: {
        category: { assessmentId: assessment.id },
      },
    },
  })

  const periode = assessment.periode

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kecamatan/assessment"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
        <p className="mt-1 text-sm text-gray-500">Periode: {periode}</p>
      </div>

      <KecamatanAssessmentForm
        assessment={assessment}
        existingEntries={existingEntries}
        submittedById={userId}
        periode={periode}
      />
    </div>
  )
}
