import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'
import { KlasifikasiBerdayaChart } from '@/components/admin/KlasifikasiBerdayaChart'
import { YearFilter } from '@/components/shared/ui/YearFilter'
import type { KlasifikasiBerdayaChartRow } from '@/components/admin/KlasifikasiBerdayaChart'

const STATUS_ORDER: KlasifikasiLevel[] = ['Rintisan', 'Berkembang', 'Maju', 'Berdaya']

// Warna untuk progress bar (tetap berwarna karena semantik klasifikasi)
const STATUS_BAR_COLOR: Record<KlasifikasiLevel, string> = {
  'Rintisan':    'bg-red-400',
  'Berkembang':  'bg-amber-400',
  'Maju':        'bg-blue-400',
  'Berdaya':     'bg-green-500',
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
      indicator: { select: { maxScore: true, versionId: true, version: { select: { versionNumber: true } }, category: { select: { assessmentId: true, code: true } } } },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
  })

  const indicatorCountsByVersion = new Map(
    (await prisma.assessmentVersion.findMany({
      where: { id: { in: [...new Set(entries.map((entry) => entry.indicator.versionId))] } },
      select: { id: true, indicators: { select: { id: true } } },
    })).map((version) => [version.id, version.indicators.length])
  )

  // Group by user + assessment + periode + version snapshot
  const groupMap: Record<string, { 
    userId: number; assessmentId: number; periode: string; versionId: number; versionNumber: number; indicatorCount: number; totalScore: number; maxPossible: number;
    catMap: Record<string, { code: string; score: number; maxScore: number }> 
  }> = {}
  for (const e of entries) {
    const key = `${e.submittedById}_${e.indicator.category.assessmentId}_${e.periode}_${e.indicator.versionId}`
    const eff = e.validations[0]?.validatedScore ?? e.score
    if (!groupMap[key]) {
      groupMap[key] = { 
        userId: e.submittedById, assessmentId: e.indicator.category.assessmentId, periode: e.periode, versionId: e.indicator.versionId, versionNumber: e.indicator.version.versionNumber, indicatorCount: 0, totalScore: 0, maxPossible: 0, catMap: {} 
      }
    }
    
    groupMap[key].indicatorCount += 1
    groupMap[key].totalScore  += eff
    groupMap[key].maxPossible += e.indicator.maxScore
    
    // Track category scores for weighted calculation
    const catCode = e.indicator.category.code
    if (!groupMap[key].catMap[catCode]) {
      groupMap[key].catMap[catCode] = { code: catCode, score: 0, maxScore: 0 }
    }
    groupMap[key].catMap[catCode].score += eff
    groupMap[key].catMap[catCode].maxScore += e.indicator.maxScore
  }

  const userMap = new Map(users.map((u) => [u.id, u]))

  type StatusEntry = {
    userId: number; year: string; periode: string; versionNumber: number; status: KlasifikasiLevel | null
    kabupatenId: number | null; kabupatenNama: string | null; kecamatanNama: string | null
  }
  const latestByUserYear = new Map<string, StatusEntry>()

  const latestValidatedBySubmission = new Map<string, (typeof groupMap)[string]>()
  for (const g of Object.values(groupMap).filter((group) => group.indicatorCount === indicatorCountsByVersion.get(group.versionId))) {
    const submissionKey = `${g.userId}_${g.assessmentId}_${g.periode}`
    const current = latestValidatedBySubmission.get(submissionKey)
    if (!current || g.versionNumber > current.versionNumber) latestValidatedBySubmission.set(submissionKey, g)
  }

  for (const g of latestValidatedBySubmission.values()) {
    const year = g.periode.match(/\d{4}/)?.[0]
    if (!year) continue
    const mapKey = `${g.userId}_${year}`
    const existing = latestByUserYear.get(mapKey)
    if (!existing || g.periode > existing.periode || (g.periode === existing.periode && g.versionNumber > existing.versionNumber)) {
      const u = userMap.get(g.userId)
      latestByUserYear.set(mapKey, {
        userId: g.userId, year, periode: g.periode, versionNumber: g.versionNumber,
        status: getStatusAkhir(g.totalScore, g.maxPossible, Object.values(g.catMap)),
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
    const counts = { rintisan: 0, berkembang: 0, maju: 0, berdaya: 0 }
    for (const u of users) {
      const entry = latestByUserYear.get(`${u.id}_${year}`)
      // Hanya hitung user yang punya data di tahun ini (konsisten dengan landing page)
      if (!entry) continue
      const s = entry.status
      if (s === 'Rintisan') counts.rintisan++
      else if (s === 'Berkembang') counts.berkembang++
      else if (s === 'Maju') counts.maju++
      else if (s === 'Berdaya') counts.berdaya++
    }
    return { year, ...counts }
  })

  // Summary untuk tahun aktif
  const summary = { 'Rintisan': 0, 'Berkembang': 0, 'Maju': 0, 'Berdaya': 0, belumAda: 0 }
  const validatedUserIds = new Set<number>()
  if (activeYear) {
    for (const u of users) {
      const s = latestByUserYear.get(`${u.id}_${activeYear}`)?.status
      if (!s) summary.belumAda++
      else { (summary as Record<string, number>)[s]++; validatedUserIds.add(u.id) }
    }
  }

  // Distribusi per kabupaten untuk tahun aktif
  type KabRow = { id: number | null; nama: string; counts: Record<KlasifikasiLevel, number>; total: number }
  const kabMap: Record<string, KabRow> = {}
  for (const u of users) {
    const kabKey = u.kabupaten?.id?.toString() ?? 'unknown'
    if (!kabMap[kabKey]) kabMap[kabKey] = {
      id: u.kabupaten?.id ?? null, nama: u.kabupaten?.nama ?? 'Tidak Diketahui',
      counts: { 'Rintisan': 0, 'Berkembang': 0, 'Maju': 0, 'Berdaya': 0 }, total: 0,
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
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/admin')
  }

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
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klasifikasi Berdaya</h2>
          <p className="mt-1 text-sm text-gray-500">
            Statistik klasifikasi kecamatan berdasarkan hasil assessment yang telah divalidasi
          </p>
        </div>
        {years.length > 0 && (
          <Suspense>
            <YearFilter years={years} selected={tahun ?? null} />
          </Suspense>
        )}
      </div>

      {/* ── OVERVIEW METRICS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Kecamatan</p>
              <p className="text-2xl font-bold text-gray-900">{totalRegistered}</p>
              <p className="text-xs text-gray-400">Terdaftar di sistem</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Tervalidasi</p>
              <p className="text-2xl font-bold text-gray-900">{totalValidated}</p>
              <p className="text-xs text-gray-400">Tahun {activeYear ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Coverage</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRegistered > 0 ? Math.round((totalValidated / totalRegistered) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-400">Data coverage</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Periode Data</p>
              <p className="text-2xl font-bold text-gray-900">{years.length}</p>
              <p className="text-xs text-gray-400">
                {years.length > 0 ? `${years[0]} - ${years[years.length - 1]}` : 'Belum ada'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KLASIFIKASI BREAKDOWN ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Distribusi Klasifikasi</h3>
          <p className="text-sm text-gray-500 mt-1">
            Breakdown klasifikasi kecamatan untuk tahun {activeYear ?? '—'} (dari {totalValidated} kecamatan yang tervalidasi)
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {STATUS_ORDER.map((level) => {
              const count = (summary as Record<string, number>)[level] ?? 0
              const pct = totalValidated > 0 ? Math.round((count / totalValidated) * 100) : 0
              const cfg = KLASIFIKASI_CONFIG[level]
              return (
                <div key={level} className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full ${cfg.bg} ${cfg.color} flex items-center justify-center text-lg font-bold mb-2`}>
                    {cfg.emoji}
                  </div>
                  <p className="font-bold text-lg text-gray-900">{count}</p>
                  <p className="text-sm font-medium text-gray-700">{level}</p>
                  <p className="text-xs text-gray-500">{pct}% dari tervalidasi</p>
                </div>
              )
            })}
          </div>
          
          {/* Progress bar overview */}
          <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-full flex">
              {STATUS_ORDER.map((level) => {
                const count = (summary as Record<string, number>)[level] ?? 0
                const pct = totalValidated > 0 ? (count / totalValidated) * 100 : 0
                return pct > 0 ? (
                  <div 
                    key={level}
                    className={STATUS_BAR_COLOR[level]}
                    style={{ width: `${pct}%` }}
                    title={`${level}: ${count} (${Math.round(pct)}%)`}
                  />
                ) : null
              })}
            </div>
          </div>
          
          {summary.belumAda > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{summary.belumAda} kecamatan</span> belum memiliki data assessment untuk tahun {activeYear}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CHART ANALYSIS ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Tren Historis</h3>
          <p className="text-sm text-gray-500 mt-1">Perkembangan klasifikasi kecamatan dari waktu ke waktu</p>
        </div>
        <div className="p-6">
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Belum ada data assessment yang divalidasi</p>
              <p className="text-sm text-gray-400">Hasil klasifikasi muncul setelah admin memvalidasi assessment kecamatan</p>
            </div>
          ) : (
            <KlasifikasiBerdayaChart data={chartData} />
          )}
        </div>
      </div>

      {/* ── REGIONAL BREAKDOWN ──────────────────────────────────────────────── */}
      {activeYear && kabDistribusi.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-900">Distribusi Regional</h3>
            <p className="text-sm text-gray-500 mt-1">
              Breakdown klasifikasi per kabupaten/kota untuk tahun {activeYear}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Kabupaten/Kota
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                  {STATUS_ORDER.map((s) => (
                    <th key={s} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <div className="flex flex-col items-center gap-1">
                        <span>{KLASIFIKASI_CONFIG[s].emoji}</span>
                        <span className="text-[10px] font-normal">{s}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Distribusi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kabDistribusi.map((kab) => {
                  const validated = STATUS_ORDER.reduce((s, l) => s + kab.counts[l], 0)
                  const hasData = validated > 0
                  return (
                    <tr key={kab.id ?? kab.nama} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{kab.nama}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-gray-900 font-semibold">{kab.total}</span>
                        {hasData && (
                          <span className="block text-xs text-gray-500">{validated} tervalidasi</span>
                        )}
                      </td>
                      {STATUS_ORDER.map((s) => (
                        <td key={s} className="px-4 py-4 text-center">
                          {kab.counts[s] > 0 ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${STATUS_BAR_COLOR[s]}`}>
                              {kab.counts[s]}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4">
                        {hasData ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden min-w-[100px]">
                              <div className="h-full flex">
                                {STATUS_ORDER.map((s) => {
                                  const count = kab.counts[s]
                                  const pct = validated > 0 ? (count / validated) * 100 : 0
                                  return pct > 0 ? (
                                    <div 
                                      key={s}
                                      className={STATUS_BAR_COLOR[s]}
                                      style={{ width: `${pct}%` }}
                                      title={`${s}: ${count}`}
                                    />
                                  ) : null
                                })}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {Math.round((validated / kab.total) * 100)}% coverage
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Belum ada data</span>
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
    </div>
  )
}
