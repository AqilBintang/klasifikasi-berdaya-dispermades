import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { prisma } from '@/lib/prisma'
import { CreateRubricForm } from '@/components/admin/CreateRubricForm'

export default async function NewPanduanPage() {
  const assessments = await prisma.assessment.findMany({
    where: { status: { in: ['PUBLISHED', 'DRAFT'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: { indicators: { orderBy: { number: 'asc' } } },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/panduan"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali ke Daftar Panduan
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Buat Rubrik Penilaian</h2>
        <p className="mt-1 text-sm text-gray-500">
          Definisikan kriteria penilaian per skor (1–4) untuk setiap indikator
        </p>
      </div>
      <CreateRubricForm assessments={assessments} />
    </div>
  )
}
