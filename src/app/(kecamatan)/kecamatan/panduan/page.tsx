import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBook } from '@fortawesome/free-solid-svg-icons'

export default async function KecamatanPanduanPage() {
  const rubrics = await prisma.assessmentRubric.findMany({
    where: { assessment: { status: 'PUBLISHED' } },
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

  function groupByCategory(items: typeof rubrics[0]['items']) {
    const map: Record<string, { code: string; name: string; order: number; items: typeof items }> = {}
    for (const item of items) {
      const key = item.indicator.category.id.toString()
      if (!map[key]) map[key] = {
        code: item.indicator.category.code,
        name: item.indicator.category.name,
        order: item.indicator.category.order,
        items: [],
      }
      map[key].items.push(item)
    }
    return Object.values(map).sort((a, b) => a.order - b.order)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Panduan Penilaian</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rubrik penilaian sebagai panduan pengisian self assessment
        </p>
      </div>

      {rubrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faBook} className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-sm">Belum ada panduan yang tersedia</p>
          <p className="text-xs text-slate-400 mt-1">Hubungi administrator untuk informasi lebih lanjut</p>
        </div>
      ) : (
        rubrics.map((rubric) => {
          const categories = groupByCategory(rubric.items)
          return (
            <div key={rubric.id} className="space-y-4">

              {/* Header rubrik */}
              <div className="rounded-xl bg-sky-600 px-5 py-4 text-white">
                <p className="text-sky-100 text-xs mb-0.5">
                  {rubric.assessment.title} · Periode {rubric.assessment.periode}
                </p>
                <h3 className="text-base font-bold">{rubric.title}</h3>
              </div>

              {/* Per kategori */}
              {categories.map((cat) => (
                <div key={cat.code} className="rounded-xl border border-slate-200 bg-white overflow-hidden">

                  {/* Header kategori */}
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <h4 className="font-semibold text-slate-700 text-sm">
                      {cat.code}. {cat.name}
                    </h4>
                  </div>

                  {/* Tabel */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="px-3 py-3 text-center w-10">No</th>
                          <th className="px-4 py-3 text-left min-w-[200px]">Indikator</th>
                          <th className="px-4 py-3 text-left min-w-[150px]">Skor 1</th>
                          <th className="px-4 py-3 text-left min-w-[150px]">Skor 2</th>
                          <th className="px-4 py-3 text-left min-w-[150px]">Skor 3</th>
                          <th className="px-4 py-3 text-left min-w-[150px]">Skor 4</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cat.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-4 text-center text-slate-500 text-xs font-medium align-top">
                              {item.indicator.number}
                            </td>
                            <td className="px-4 py-4 text-slate-800 text-sm font-medium align-top leading-relaxed">
                              {item.indicator.indicator}
                            </td>
                            {[item.score1, item.score2, item.score3, item.score4].map((score, i) => (
                              <td key={i} className="px-4 py-4 text-slate-600 text-xs align-top leading-relaxed">
                                {score}
                              </td>
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
