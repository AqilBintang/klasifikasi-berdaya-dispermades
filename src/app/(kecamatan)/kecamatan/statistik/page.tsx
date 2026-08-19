import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import { getStatusAkhir, getKlasifikasiPerKategori } from '@/lib/scoring'
import { KecamatanStatistikClient, type PeriodeStat } from '@/components/kecamatan/KecamatanStatistikClient'

export default async function KecamatanStatistikPage() {
  const session = await auth()
  if (!session?.user) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')

  const userId = parseInt(session.user.id ?? '0', 10)

  const entries = await prisma.selfAssessment.findMany({
    where: { submittedById: userId, status: 'VALIDATED' },
    select: {
      periode: true,
      score: true,
      indicator: {
        select: {
          maxScore: true,
          versionId: true,
          version: { select: { versionNumber: true } },
          category: { select: { id: true, assessmentId: true, code: true, name: true, order: true } },
        },
      },
      validations: {
        select: { validatedScore: true },
        orderBy: { validatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { periode: 'asc' },
  })

  const indicatorCountsByVersion = new Map(
    (await prisma.assessmentVersion.findMany({
      where: { id: { in: [...new Set(entries.map((entry) => entry.indicator.versionId))] } },
      select: { id: true, indicators: { select: { id: true } } },
    })).map((version) => [version.id, version.indicators.length])
  )

  // ── Group by periode + version → kategori ────────────────────────────────

  const periodeMap: Record<string, {
    assessmentId: number; periode: string; versionId: number; versionNumber: number; indicatorCount: number; total: number; max: number
    cats: Record<number, { code: string; name: string; order: number; total: number; max: number }>
  }> = {}

  for (const e of entries) {
    const score = e.validations[0]?.validatedScore ?? e.score
    const cat   = e.indicator.category
    const p     = e.periode
    const key   = `${e.indicator.category.assessmentId}_${p}_${e.indicator.versionId}`

    if (!periodeMap[key]) periodeMap[key] = { assessmentId: e.indicator.category.assessmentId, periode: p, versionId: e.indicator.versionId, versionNumber: e.indicator.version.versionNumber, indicatorCount: 0, total: 0, max: 0, cats: {} }
    periodeMap[key].indicatorCount += 1
    periodeMap[key].total += score
    periodeMap[key].max   += e.indicator.maxScore

    if (!periodeMap[key].cats[cat.id]) {
      periodeMap[key].cats[cat.id] = { code: cat.code, name: cat.name, order: cat.order, total: 0, max: 0 }
    }
    periodeMap[key].cats[cat.id].total += score
    periodeMap[key].cats[cat.id].max   += e.indicator.maxScore
  }

  const latestValidatedBySubmission = new Map<string, (typeof periodeMap)[string]>()
  for (const group of Object.values(periodeMap).filter((item) => item.indicatorCount === indicatorCountsByVersion.get(item.versionId))) {
    const submissionKey = `${group.assessmentId}_${group.periode}`
    const current = latestValidatedBySubmission.get(submissionKey)
    if (!current || group.versionNumber > current.versionNumber) latestValidatedBySubmission.set(submissionKey, group)
  }

  const riwayat: PeriodeStat[] = Array.from(latestValidatedBySubmission.values())
    .sort((a, b) => a.periode.localeCompare(b.periode))
    .map(({ periode, total, max, cats }) => {
      const categories = Object.entries(cats)
        .map(([id, c]) => ({
          id: Number(id),
          code: c.code,
          name: c.name,
          order: c.order,
          totalScore: c.total,
          maxScore: c.max,
          klasifikasi: getKlasifikasiPerKategori(c.code, c.total),
        }))

      // Prepare category data for weighted scoring
      const categoryScores = categories.map(cat => ({
        code: cat.code,
        score: cat.totalScore,
        maxScore: cat.maxScore
      }))

      return {
        periode,
        totalScore: total,
        maxScore: max,
        statusAkhir: getStatusAkhir(total, max, categoryScores),
        categories: categories.sort((a, b) => a.order - b.order),
      }
    })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Statistik Klasifikasi</h2>
        <p className="mt-1 text-sm text-gray-500">Riwayat hasil klasifikasi kecamatan Anda per periode</p>
      </div>

      {riwayat.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faChartLine} className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium text-sm">Belum ada data statistik</p>
          <p className="text-xs text-gray-400 mt-1">Data muncul setelah assessment Anda divalidasi oleh admin</p>
        </div>
      ) : (
        <KecamatanStatistikClient riwayat={riwayat} />
      )}
    </div>
  )
}
