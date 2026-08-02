import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import { getStatusAkhir, getKlasifikasi } from '@/lib/scoring'
import { KecamatanStatistikClient, type PeriodeStat } from '@/components/kecamatan/KecamatanStatistikClient'

export default async function KecamatanStatistikPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
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
          category: { select: { id: true, code: true, name: true, order: true } },
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

  // ── Group by periode → kategori ──────────────────────────────────────────

  const periodeMap: Record<string, {
    total: number; max: number
    cats: Record<number, { code: string; name: string; order: number; total: number; max: number }>
  }> = {}

  for (const e of entries) {
    const score = e.validations[0]?.validatedScore ?? e.score
    const cat   = e.indicator.category
    const p     = e.periode

    if (!periodeMap[p]) periodeMap[p] = { total: 0, max: 0, cats: {} }
    periodeMap[p].total += score
    periodeMap[p].max   += e.indicator.maxScore

    if (!periodeMap[p].cats[cat.id]) {
      periodeMap[p].cats[cat.id] = { code: cat.code, name: cat.name, order: cat.order, total: 0, max: 0 }
    }
    periodeMap[p].cats[cat.id].total += score
    periodeMap[p].cats[cat.id].max   += e.indicator.maxScore
  }

  const riwayat: PeriodeStat[] = Object.entries(periodeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periode, { total, max, cats }]) => ({
      periode,
      totalScore: total,
      maxScore: max,
      statusAkhir: getStatusAkhir(total, max),
      categories: Object.entries(cats)
        .map(([id, c]) => ({
          id: Number(id),
          code: c.code,
          name: c.name,
          order: c.order,
          totalScore: c.total,
          maxScore: c.max,
          klasifikasi: getKlasifikasi(c.total, c.max),
        }))
        .sort((a, b) => a.order - b.order),
    }))

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
