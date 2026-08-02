import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'
import { KlasifikasiBerdayaChart } from '@/components/admin/KlasifikasiBerdayaChart'
import { YearFilter } from '@/components/shared/ui/YearFilter'
import type { KlasifikasiBerdayaChartRow } from '@/components/admin/KlasifikasiBerdayaChart'

const STATUS_ORDER: KlasifikasiLevel[] = ['Belum Berdaya', 'Rintisan', 'Berkembang', 'Maju']

// Warna untuk progress bar (tetap berwarna karena semantik klasifikasi)
const STATUS_BAR_COLOR: Record<KlasifikasiLevel, string> = {
  'Belum Berdaya': 'bg-red-400',
  Rintisan:        'bg-amber-400',
  Berkembang:      'bg-blue-400',
  Maju:            'bg-green-500',
}

async function getStats(yearFilter?: string) {
  const users = await prisma.user.findMany({
    where: { role: 'USER', isActive: true, kecamatanId: { not: null } },
    select: {
      id: true,
      kabupaten: { select: { id: true, nama: true } },
      kecamatan: { select: { nama: true } },
    },
  })

  if (users.length === 0) return null

  const userIds = users.map((u) => u.id)

  const entries = await prisma.selfAssessment.findMany({
    where: { status: 'VALIDATED', submittedById: { in: userIds } },
    select: {
      submittedById: true, periode: true, score: true,
      indicator: { select: { maxScore: true, category: { select: { assessmentId: true } } } },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
  })

  // Group by user + assessment + periode
  const groupMap: Record<string, { userId: number; periode: string; totalScore: number; maxPossible: number }> = {}
  for (const e of entries) {
    const key = `${e.submittedById}_${e.indicator.category.assessmentId}_${e.periode}`
    const eff = e.validations[0]?.validatedScore ?? e.score
    if (!groupMap[key]) groupMap[key] = { userId: e.submittedById, periode: e.periode, totalScore: 0, maxPossible: 0 }
    groupMap[key].totalScore  += eff
    groupMap[key].maxPossible += e.indicator.maxScore
  }

  const userMap = new Map(users.map((u) => [u.id, u]))

  type StatusEntry = {
    userId: number; year: string; status: KlasifikasiLevel | null
    kabupatenId: number | null; kabupatenNama: string | null; kecamatanNama: string | null
  }
  const latestByUserYear = new Map<string, StatusEntry>()

  for (const g of Object.values(groupMap)) {
    const year = g.periode.match(/\d{4}/)?.[0]
    if (!year) continue
    const mapKey = `${g.userId}_${year}`
    const existing = latestByUserYear.get(mapKey)
    if (!existing || g.periode > existing.year) {
      const u = userMap.get(g.userId)
      latestByUserYear.set(mapKey, {
        userId: g.userId, year,
        status: getStatusAkhir(g.totalScore, g.maxPossible),
        kabupatenId: u?.kabupaten?.id ?? null,
        kabupatenNama: u?.kabupaten?.nama ?? null,
        kecamatanNama: u?.kecamatan?.nama ?? null,
      })
    }
  }

  const allEntries = Array.from(latestByUserYear.values())
  const years = [...new Set(allEntries.map((e) => e.year))].sort()

  // Tahun aktif: dari filter atau terbaru
  const activeYear = yearFilter && years.includes(yearFilter) ? yearFilter : (years[years.length - 1] ?? null)

  // Chart data — selalu semua tahun agar tren terlihat
  const chartData: KlasifikasiBerdayaChartRow[] = years.map((year) => {
    const counts = { belumBerdaya: 0, rintisan: 0, berkembang: 0, maju: 0 }
    for (const u of users) {
      const s = latestByUserYear.get(`${u.id}_${year}`)?.status ?? 'Belum Berdaya'
      if (s === 'Belum Berdaya') counts.belumBerdaya++
      else if (s === 'Rintisan')   counts.rintisan++
      else if (s === 'Berkembang') counts.berkembang++
      else                          counts.maju++
    }
    return { year, ...counts }
  })

  // Summary untuk tahun aktif
  const summary = { 'Belum Berdaya': 0, Rintisan: 0, Berkembang: 0, Maju: 0, belumAda: 0 }
  const validatedUserIds = new Set<number>()
  if (activeYear) {
    for (const u of users) {
      const s = latestByUserYear.get(`${u.id}_${activeYear}`)?.status
      if (!s) summary.belumAda++
      else { summary[s]++; validatedUserIds.add(u.id) }
    }
  }

  // Distribusi per kabupaten untuk tahun aktif
  type KabRow = { id: number | null; nama: string; counts: Record<KlasifikasiLevel, number>; total: number }
  const kabMap: Record<string, KabRow> = {}
  for (const u of users) {
    const kabKey = u.kabupaten?.id?.toString() ?? 'unknown'
    if (!kabMap[kabKey]) kabMap[kabKey] = {
      id: u.kabupaten?.id ?? null, nama: u.kabupaten?.nama ?? 'Tidak Diketahui',
      counts: { 'Belum Berdaya': 0, Rintisan: 0, Berkembang: 0, Maju: 0 }, total: 0,
    }
    const s = activeYear ? (latestByUserYear.get(`${u.id}_${activeYear}`)?.status ?? null) : null
    if (s) kabMap[kabKey].counts[s]++
    kabMap[kabKey].total++
  }
  const kabDistribusi = Object.values(kabMap).sort((a, b) => a.nama.localeCompare(b.nama, 'id'))

  return {
    totalRegistered: users.length,
    totalValidated: validatedUserIds.size,
    activeYear, years, chartData, kabDistribusi, summary,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KlasifikasiBerdayaPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>
}) {
  const { tahun } = await searchParams
  const stats = await getStats(tahun)

  if (!stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Klasifikasi Berdaya</h2>
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
          Belum ada kecamatan terdaftar di sistem.
        </div>
      </div>
    )
  }

  const { totalRegistered, totalValidated, activeYear, years, chartData, kabDistribusi, summary } = stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klasifikasi Berdaya</h2>
          <p className="mt-1 text-sm text-gray-500">
            Statistik klasifikasi kecamatan berdasarkan hasil assessment yang telah divalidasi.
          </p>
        </div>
        {years.length > 0 && (
          <Suspense>
            <YearFilter years={years} selected={tahun ?? null} />
          </Suspense>
        )}
      </div>

      {/* Summary cards — warna netral, angka besar, label kecil */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Kecamatan', value: totalRegistered, sub: 'Terdaftar' },
          { label: 'Divalidasi',      value: totalValidated,  sub: activeYear ?? '—' },
          { label: 'Maju',            value: summary['Maju'],           sub: 'Skor > 63' },
          { label: 'Berkembang',      value: summary['Berkembang'],     sub: 'Skor 43–63' },
          { label: 'Rintisan',        value: summary['Rintisan'],       sub: 'Skor 22–42' },
          { label: 'Belum Berdaya',   value: summary['Belum Berdaya'],  sub: 'Skor ≤ 21' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1 leading-tight">{label}</p>
            <p className="text-2xl font-black text-gray-900">{value.toLocaleString('id-ID')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + proporsi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm p-5">
          <p className="font-semibold text-gray-900 mb-0.5">Tren Klasifikasi per Tahun</p>
          <p className="text-xs text-gray-400 mb-4">Jumlah kecamatan per status di setiap tahun</p>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Belum ada data assessment yang divalidasi.
            </div>
          ) : (
            <KlasifikasiBerdayaChart data={chartData} />
          )}
        </div>

        <div className="rounded-xl border bg-white shadow-sm p-5">
          <p className="font-semibold text-gray-900 mb-0.5">Proporsi {activeYear ?? '—'}</p>
          <p className="text-xs text-gray-400 mb-4">% dari total kecamatan terdaftar</p>
          <div className="space-y-3">
            {STATUS_ORDER.map((level) => {
              const count = summary[level]
              const pct = totalRegistered > 0 ? Math.round((count / totalRegistered) * 100) : 0
              const cfg = KLASIFIKASI_CONFIG[level]
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{cfg.emoji} {level}</span>
                    <span className="text-gray-500">{count} <span className="text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${STATUS_BAR_COLOR[level]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {summary.belumAda > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Belum ada data</span>
                  <span className="text-gray-400">{summary.belumAda}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gray-300" style={{ width: `${Math.round((summary.belumAda / totalRegistered) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel per kabupaten */}
      {activeYear && kabDistribusi.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Distribusi per Kabupaten/Kota</p>
              <p className="text-xs text-gray-400 mt-0.5">Tahun {activeYear}</p>
            </div>
            <div className="flex gap-3">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-1 text-xs text-gray-500">
                  <div className={`w-2.5 h-2.5 rounded-sm ${STATUS_BAR_COLOR[s]}`} />
                  {KLASIFIKASI_CONFIG[s].emoji}
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kabupaten/Kota</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  {STATUS_ORDER.map((s) => (
                    <th key={s} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{KLASIFIKASI_CONFIG[s].emoji}</th>
                  ))}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Sebaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kabDistribusi.map((kab) => {
                  const validated = STATUS_ORDER.reduce((s, l) => s + kab.counts[l], 0)
                  return (
                    <tr key={kab.id ?? kab.nama} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{kab.nama}</td>
                      <td className="px-3 py-3 text-center text-gray-600 font-semibold">{kab.total}</td>
                      {STATUS_ORDER.map((s) => (
                        <td key={s} className="px-3 py-3 text-center text-gray-700">
                          {kab.counts[s] > 0 ? kab.counts[s] : <span className="text-gray-200">—</span>}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        {validated > 0 ? (
                          <div className="flex h-2.5 rounded-full overflow-hidden gap-px w-full min-w-[80px]">
                            {STATUS_ORDER.map((s) => {
                              const pct = kab.total > 0 ? Math.round((kab.counts[s] / kab.total) * 100) : 0
                              return pct > 0 ? (
                                <div key={s} className={STATUS_BAR_COLOR[s]} style={{ width: `${pct}%` }} />
                              ) : null
                            })}
                          </div>
                        ) : (
                          <div className="h-2.5 rounded-full bg-gray-100 w-full" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {chartData.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500 font-medium">Belum ada data yang divalidasi</p>
          <p className="mt-1 text-sm text-gray-400">Hasil klasifikasi muncul setelah admin memvalidasi assessment kecamatan.</p>
        </div>
      )}
    </div>
  )
}
