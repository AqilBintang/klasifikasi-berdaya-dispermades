import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faChartBar } from '@fortawesome/free-solid-svg-icons'
import { getKlasifikasiPerKategori, getStatusAkhir } from '@/lib/scoring'
import { YearFilter } from '@/components/shared/ui/YearFilter'
import { RekapitulasiClient } from '@/components/admin/RekapitulasiClient'

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
    
    // Prepare category data for weighted scoring
    const categoryScores = Object.values(g.catScores).map(c => ({
      code: c.code,
      score: c.totalScore,
      maxScore: c.maxScore
    }))
    
    return {
      ...g, key,
      userId:       parseInt(userId, 10),
      assessmentId: parseInt(assessmentId, 10),
      statusAkhir:  getStatusAkhir(g.totalScore, g.maxPossibleTotal, categoryScores),
      categories:   Object.values(g.catScores).map((c) => ({
        ...c, klasifikasi: getKlasifikasiPerKategori(c.code, c.totalScore),
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
        <RekapitulasiClient data={data} />
      )}
    </div>
  )
}
