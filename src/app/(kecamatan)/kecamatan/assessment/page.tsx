import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faCalendarDays, faArrowRight } from '@fortawesome/free-solid-svg-icons'

export default async function KecamatanAssessmentPage() {
  const assessments = await prisma.assessment.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      categories: {
        include: { indicators: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Isi Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pilih assessment yang ingin Anda isi
        </p>
      </div>

      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faClipboardList} className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada assessment yang tersedia</p>
          <p className="text-sm text-gray-400 mt-1">Hubungi administrator untuk informasi lebih lanjut</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((a) => {
            const totalInd = a.categories.reduce((s, c) => s + c.indicators.length, 0)
            return (
              <Link
                key={a.id}
                href={`/kecamatan/assessment/${a.id}`}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Tersedia
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                    {a.periode}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-sky-600 transition-colors">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{a.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {a.categories.length} kategori · {totalInd} indikator
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-sky-600">
                    Isi Sekarang <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
