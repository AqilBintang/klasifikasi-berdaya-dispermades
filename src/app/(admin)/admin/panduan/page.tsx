import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { PanduanListClient } from '@/components/admin/PanduanListClient'

export default async function PanduanListPage() {
  const rubrics = await prisma.assessmentRubric.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assessment: { select: { id: true, title: true, periode: true } },
      _count: { select: { items: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panduan Rubrik Penilaian</h2>
          <p className="mt-1 text-sm text-gray-500">
            Buat panduan rubrik yang akan ditampilkan kepada kecamatan saat mengisi assessment
          </p>
        </div>
        <Link
          href="/admin/panduan/new"
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Buat Rubrik
        </Link>
      </div>

      <PanduanListClient rubrics={rubrics} />
    </div>
  )
}
