import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faChartBar, faArrowRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { getKlasifikasi, getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'

function KlasifikasiBadge({ level }: { level: KlasifikasiLevel | null }) {
  if (!level) return <span className="text-xs text-gray-400 italic">—</span>
  const cfg = KLASIFIKASI_CONFIG[level]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.emoji} {level}
    </span>
  )
}

async function getRekapitulasi() {
  const entries = await prisma.selfAssessment.findMany({
    where: { status: { in: ['VALIDATED', 'SUBMITTED'] } },
    include: {
      submittedBy: { select: { id: true, name: true, kecamatan: true, kabupaten: true } },
      indicator: {
        include: {
          category: {
            include: {
              assessment: { select: { id: true, title: true, periode: true } },
              _count: { select: { indicators: true } },
            },
          },
        },
      },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
    orderBy: [
      { submittedBy: { kecamatan: 'asc' } },
      { indicator: { category: { assessmentId: 'asc' } } },
    ],
  })

  // Group by user + assessment + periode
  const map: Record<string, {
    user: { id: number; name: string; kecamatan: string | null; kabupaten: string | null }
    assessment: { id: number; title: string; periode: string }
    totalScore: number; maxScore: number; maxPossibleTotal: number
    catScores: Record<string, { code: string; name: string; totalScore: number; maxScore: number; maxPossible: number }>
    lastUpdated: string
  }> = {}

  for (const e of entries) {
    const key = `${e.submittedById}_${e.indicator.category.assessmentId}_${e.periode}`
    const effScore = e.validations[0]?.validatedScore ?? e.score

    if (!map[key]) {
      map[key] = {
        user: e.submittedBy,
        assessment: {
          id: e.indicator.category.assessmentId,
          title: e.indicator.category.assessment.title,
          periode: e.periode,
        },
        totalScore: 0, maxScore: 0, maxPossibleTotal: 0,
        catScores: {},
        lastUpdated: '',
      }
    }

    map[key].totalScore      += effScore
    map[key].maxScore        += e.indicator.maxScore
    map[key].maxPossibleTotal += e.indicator.maxScore

    const catKey = e.indicator.categoryId.toString()
    if (!map[key].catScores[catKey]) {
      map[key].catScores[catKey] = {
        code: e.indicator.category.code,
        name: e.indicator.category.name,
        totalScore: 0, maxScore: 0,
        maxPossible: e.indicator.category._count.indicators * 4,
      }
    }
    map[key].catScores[catKey].totalScore += effScore
    map[key].catScores[catKey].maxScore   += e.indicator.maxScore
  }

  return Object.entries(map).map(([key, g]) => {
    const [userId, assessmentId] = key.split('_')
    return {
      ...g,
      key,
      userId:       parseInt(userId, 10),
      assessmentId: parseInt(assessmentId, 10),
      statusAkhir:  getStatusAkhir(g.totalScore, g.maxPossibleTotal),
      categories:   Object.values(g.catScores).map((c) => ({
        ...c,
        klasifikasi: getKlasifikasi(c.totalScore, c.maxPossible),
      })),
    }
  }).sort((a, b) => (a.user.kecamatan ?? a.user.name).localeCompare(b.user.kecamatan ?? b.user.name))
}

export default async function RekapitulasiPage() {
  const data = await getRekapitulasi()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rekapitulasi Assessment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Data hasil assessment semua kecamatan. Klik untuk melihat detail isian.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FontAwesomeIcon icon={faChartBar} className="w-4 h-4" />
          <span>{data.length} rekapitulasi</span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
          <FontAwesomeIcon icon={faAward} className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada data rekapitulasi</p>
          <p className="mt-1 text-sm text-gray-400">Muncul setelah kecamatan submit dan divalidasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((item) => {
            const pct = item.maxScore > 0 ? Math.round((item.totalScore / item.maxScore) * 100) : 0
            const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'

            return (
              <Link
                key={item.key}
                href={`/admin/assessment/results/${item.userId}/${item.assessmentId}?periode=${item.assessment.periode}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-sky-300"
              >
                {/* Header card */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-sky-700 transition-colors">
                      {item.user.kecamatan ?? item.user.name}
                    </p>
                    {item.user.kabupaten && (
                      <p className="text-xs text-gray-500">{item.user.kabupaten}</p>
                    )}
                  </div>
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-300 group-hover:text-sky-500 transition-colors mt-0.5" />
                </div>

                {/* Assessment info */}
                <p className="text-xs text-gray-500 line-clamp-1 mb-1">{item.assessment.title}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                  Periode {item.assessment.periode}
                </div>

                {/* Score bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Total Skor</span>
                    <span className="font-semibold text-gray-700">{item.totalScore}/{item.maxScore}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Per kategori mini */}
                <div className="space-y-1 mb-3">
                  {item.categories.map((cat) => (
                    <div key={cat.code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Kat. {cat.code}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{cat.totalScore}/{cat.maxScore}</span>
                        <KlasifikasiBadge level={cat.klasifikasi} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status akhir */}
                <div className="flex items-center justify-between border-t pt-3 mt-3">
                  <span className="text-xs font-semibold text-gray-600">Status Akhir</span>
                  <KlasifikasiBadge level={item.statusAkhir} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
