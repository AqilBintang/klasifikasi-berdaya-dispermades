import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { prisma } from '@/lib/prisma'
import { EditRubricForm } from '@/components/admin/EditRubricForm'

async function getRubricWithAssessment(id: number) {
  const rubric = await prisma.assessmentRubric.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          indicator: {
            include: { category: true },
          },
        },
      },
      assessment: {
        include: {
          categories: {
            orderBy: { order: 'asc' },
            include: {
              indicators: { orderBy: { number: 'asc' } },
            },
          },
        },
      },
    },
  })
  return rubric
}

export default async function EditPanduanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const rubric = await getRubricWithAssessment(numId)
  if (!rubric) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/panduan"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali ke Daftar Panduan
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{rubric.title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {rubric.assessment.title} · Periode {rubric.assessment.periode}
        </p>
      </div>
      <EditRubricForm rubric={rubric} />
    </div>
  )
}
