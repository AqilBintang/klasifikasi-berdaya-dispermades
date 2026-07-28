import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faBook, faPencil } from '@fortawesome/free-solid-svg-icons'

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

      {rubrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faBook} className="w-14 h-14 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada panduan rubrik</p>
          <p className="mt-1 text-sm text-gray-400 max-w-xs">
            Buat panduan rubrik untuk membantu kecamatan memahami kriteria penilaian
          </p>
          <Link
            href="/admin/panduan/new"
            className="mt-5 flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            Buat Rubrik Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rubrics.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                  <FontAwesomeIcon icon={faBook} className="w-3 h-3" />
                  Rubrik
                </span>
                <span className="text-xs text-gray-400">{r.assessment.periode}</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">{r.title}</h3>
              <p className="mt-1 text-xs text-gray-500 line-clamp-1">{r.assessment.title}</p>
              <p className="mt-2 text-xs text-gray-400">{r._count.items} indikator</p>
              <div className="mt-4">
                <Link
                  href={`/admin/panduan/${r.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 w-full"
                >
                  <FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
                  Lihat / Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
