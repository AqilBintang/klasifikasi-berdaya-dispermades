import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBook } from '@fortawesome/free-solid-svg-icons'

export default async function KecamatanPanduanPage() {
  const rubrics = await prisma.assessmentRubric.findMany({
    where: {
      assessment: { status: 'PUBLISHED' },
    },
    include: {
      assessment: { select: { id: true, title: true, periode: true } },
      items: {
        include: {
          indicator: {
            include: { category: { select: { id: true, code: true, name: true, order: true } } },
          },
        },
        orderBy: [
          { indicator: { category: { order: 'asc' } } },
          { indicator: { number: 'asc' } },
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group items per kategori per rubrik
  function groupByCategory(items: typeof rubrics[0]['items']) {
    const map: Record<string, { code: string; name: string; order: number; items: typeof items }> = {}
    for (const item of items) {
      const key = item.indicator.category.id.toString()
      if (!map[key]) map[key] = { code: item.indicator.category.code, name: item.indicator.category.name, order: item.indicator.category.order, items: [] }
      map[key].items.push(item)
    }
    return Object.values(map).sort((a, b) => a.order - b.order)
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Panduan Penilaian</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rubrik penilaian sebagai panduan pengisian self assessment
        </p>
      </div>

      {rubrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faBook} className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada panduan yang tersedia</p>
          <p className="text-sm text-gray-400 mt-1">Hubungi administrator untuk informasi lebih lanjut</p>
        </div>
      ) : (
        rubrics.map((rubric) => {
          const categories = groupByCategory(rubric.items)
          return (
            <div key={rubric.id} className="space-y-6">
              {/* Header rubrik */}
              <div className="rounded-xl bg-sky-700 px-6 py-5 text-white">
                <p className="text-sky-200 text-xs font-medium uppercase tracking-wider mb-1">
                  {rubric.assessment.title} · Periode {rubric.assessment.periode}
                </p>
                <h3 className="text-xl font-bold">{rubric.title}</h3>
              </div>

              {/* Per kategori */}
              {categories.map((cat) => (
                <div key={cat.code} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Header kategori */}
                  <div className="bg-sky-50 border-b border-sky-200 px-5 py-3">
                    <h4 className="font-semibold text-sky-800 text-sm">
                      Kategori {cat.code}. {cat.name}
                    </h4>
                  </div>

                  {/* Tabel indikator */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs font-semibold text-gray-700">
                          <th className="w-10 px-3 py-3 text-center bg-gray-50">No</th>
                          <th className="px-4 py-3 text-left bg-gray-50 min-w-[200px]">Indikator</th>
                          <th className="px-4 py-3 text-left bg-sky-50 min-w-[160px]">Skor 1</th>
                          <th className="px-4 py-3 text-left bg-sky-100/70 min-w-[160px]">Skor 2</th>
                          <th className="px-4 py-3 text-left bg-sky-100 min-w-[160px]">Skor 3</th>
                          <th className="px-4 py-3 text-left bg-sky-200/60 min-w-[160px]">Skor 4</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cat.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 text-center text-gray-500 font-medium align-top">{item.indicator.number}</td>
                            <td className="px-4 py-4 text-gray-700 align-top leading-relaxed font-medium">{item.indicator.indicator}</td>
                            {[item.score1, item.score2, item.score3, item.score4].map((score, i) => (
                              <td key={i} className="px-4 py-4 text-gray-600 align-top leading-relaxed text-xs">{score}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
