import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faChartBar, faArrowRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { getKlasifikasi, getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'
import { YearFilter } from '@/components/shared/ui/YearFilter'

function KlasifikasiBadge({ level }: { level: KlasifikasiLevel | null }) {
  if (!level) return <span className="text-xs text-gray-400 italic">—</span>
  const cfg = KLASIFIKASI_CONFIG[level]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.emoji} {level}
    </span>
  )
}

async function getRekapitulasi(periodeFilter?: string) {
  const entries = await prisma.selfAssessment.findMany({
    where: {
      status: 'VALIDATED',
      ...(periodeFilter && { periode: periodeFilter }),
    },
    include: {
      submittedBy: {
        select: {
          id: true, name: true,
          kabupaten: { select: { nama: true } },
          kecamatan: { select: { nama: true } },
        },
      },
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
      { submittedBy: { kecamatan: { nama: 'asc' } } },
      { indicator: { category: { assessmentId: 'asc' } } },
    ],
  })

  // Ambil semua tahun yang tersedia (untuk filter dropdown)
  const allPeriodes = await prisma.selfAssessment.findMany({
    where: { status: 'VALIDATED' },
    select: { periode: true },
    distinct: ['periode'],
  })
  const years = [...new Set(
    allPeriodes.map((p) => p.periode.match(/\d{4}/)?.[0]).filter(Boolean) as string[]
  )].sort()

  const map: Record<string, {
    user: { id: number; name: string; kecamatan: string | null; kabupaten: string | null }
    assessment: { id: number; title: string; periode: string }
    totalScore: number; maxScore: number; maxPossibleTotal: number
    catScores: Record<string, { code: string; name: string; totalScore: number; maxScore: number; maxPossible: number }>
  }> = {}

  for (const e of entries) {
    const key = `${e.submittedById}_${e.indicator.category.assessmentId}_${e.periode}`
    const effScore = e.validations[0]?.validatedScore ?? e.score

    if (!map[key]) {
      map[key] = {
        user: {
          id: e.submittedBy.id, name: e.submittedBy.name,
          kabupaten: e.submittedBy.kabupaten?.nama ?? null,
          kecamatan: e.submittedBy.kecamatan?.nama ?? null,
        },
        assessment: {
          id: e.indicator.category.assessmentId,
          title: e.indicator.category.assessment.title,
          periode: e.periode,
        },
        totalScore: 0, maxScore: 0, maxPossibleTotal: 0,
        catScores: {},
      }
    }

    map[key].totalScore       += effScore
    map[key].maxScore         += e.indicator.maxScore
    map[key].maxPossibleTotal += e.indicator.maxScore

    const catKey = e.indicator.categoryId.toString()
    if (!map[key].catScores[catKey]) {
      map[key].catScores[catKey] = {
        code: e.indicator.category.code, name: e.indicator.category.name,
        totalScore: 0, maxScore: 0,
        maxPossible: e.indicator.category._count.indicators * 4,
      }
    }
    map[key].catScores[catKey].totalScore += effScore
    map[key].catScores[catKey].maxScore   += e.indicator.maxScore
  }

  const data = Object.entries(map).map(([key, g]) => {
    const [userId, assessmentId] = key.split('_')
    return {
      ...g, key,
      userId:       parseInt(userId, 10),
      assessmentId: parseInt(assessmentId, 10),
      statusAkhir:  getStatusAkhir(g.totalScore, g.maxPossibleTotal),
      categories:   Object.values(g.catScores).map((c) => ({
        ...c, klasifikasi: getKlasifikasi(c.totalScore, c.maxPossible),
      })),
    }
  }).sort((a, b) => (a.user.kecamatan ?? a.user.name).localeCompare(b.user.kecamatan ?? b.user.name))

  return { data, years }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RekapitulasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>
}) {
  const { tahun } = await searchParams
  const { data, years } = await getRekapitulasi(tahun)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rekapitulasi Assessment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Data hasil assessment semua kecamatan. Klik kartu untuk melihat detail isian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <FontAwesomeIcon icon={faChartBar} className="w-3.5 h-3.5" />
            {data.length} kecamatan
          </span>
          {years.length > 0 && (
            <Suspense>
              <YearFilter years={years} selected={tahun ?? null} />
            </Suspense>
          )}
        </div>
      </div>

      {/* Empty */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <FontAwesomeIcon icon={faAward} className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">
            {tahun ? `Belum ada data untuk tahun ${tahun}` : 'Belum ada data rekapitulasi'}
          </p>
          <p className="mt-1 text-sm text-gray-400">Muncul setelah kecamatan submit dan admin memvalidasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((item) => {
            const pct = item.maxScore > 0 ? Math.round((item.totalScore / item.maxScore) * 100) : 0

            return (
              <Link
                key={item.key}
                href={`/admin/assessment/results/${item.userId}/${item.assessmentId}?periode=${item.assessment.periode}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-gray-300"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {item.user.kecamatan ?? item.user.name}
                    </p>
                    {item.user.kabupaten && (
                      <p className="text-xs text-gray-400">{item.user.kabupaten}</p>
                    )}
                  </div>
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5 shrink-0" />
                </div>

                {/* Assessment info */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                  {item.assessment.title} · Periode {item.assessment.periode}
                </div>

                {/* Score bar — warna dari status akhir, bukan pct */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Total Skor</span>
                    <span className="font-semibold text-gray-700">{item.totalScore}/{item.maxScore} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Per kategori */}
                <div className="space-y-1.5 mb-3 pt-2 border-t">
                  {item.categories.map((cat) => (
                    <div key={cat.code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 truncate max-w-[40%]">
                        <span className="font-medium text-gray-700">{cat.code}.</span> {cat.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500">{cat.totalScore}/{cat.maxScore}</span>
                        <KlasifikasiBadge level={cat.klasifikasi} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status akhir */}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs font-medium text-gray-500">Status Akhir</span>
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
