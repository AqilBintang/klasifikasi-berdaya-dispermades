'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import { KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'

// ── Types ──────────────────────────────────────────────────────────────────

export type CatStat = {
  id: number; code: string; name: string; order: number
  totalScore: number; maxScore: number
  klasifikasi: KlasifikasiLevel | null
}

export type PeriodeStat = {
  periode: string
  totalScore: number
  maxScore: number
  statusAkhir: KlasifikasiLevel | null
  categories: CatStat[]
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KlasifikasiBadge({ level }: { level: KlasifikasiLevel | null }) {
  if (!level) return <span className="text-xs text-gray-400">—</span>
  const cfg = KLASIFIKASI_CONFIG[level]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      cfg.bg, cfg.color, cfg.border,
    )}>
      {cfg.emoji} {level}
    </span>
  )
}

const PAGE_SIZE = 5

// ── Main component ─────────────────────────────────────────────────────────

export function KecamatanStatistikClient({ riwayat }: { riwayat: PeriodeStat[] }) {
  const [filterPeriode, setFilterPeriode] = useState<string>('semua')
  const [page, setPage] = useState(1)

  // Daftar semua periode (ascending)
  const allPeriodes = riwayat.map((r) => r.periode)

  // Data untuk chart — skor & maks semua periode
  const chartData = riwayat.map((r) => ({
    periode: r.periode,
    skor: r.totalScore,
    maks: r.maxScore,
    pct: r.maxScore > 0 ? Math.round((r.totalScore / r.maxScore) * 100) : 0,
  }))

  // Filter tabel berdasarkan periode yang dipilih
  const filtered = useMemo(
    () => filterPeriode === 'semua' ? riwayat : riwayat.filter((r) => r.periode === filterPeriode),
    [filterPeriode, riwayat],
  )

  // Reset page saat filter berubah — ditangani oleh useMemo dependency
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage   = Math.min(page, totalPages || 1)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleFilter(periode: string) {
    setFilterPeriode(periode)
    setPage(1)
  }

  return (
    <div className="space-y-6">

      {/* Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Skor Per Tahun</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="periode"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(value: number, name: string) =>
                  [value, name === 'skor' ? 'Total Skor' : 'Skor Maks']
                }
              />
              <Line
                dataKey="maks"
                name="maks"
                stroke="#e2e8f0"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
              <Line
                dataKey="skor"
                name="skor"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Legend sederhana */}
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-block w-5 h-0.5 bg-sky-400 rounded" />
            Total Skor
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-5 border-t border-dashed border-gray-300" />
            Skor Maks
          </span>
        </div>
      </div>

      {/* Filter periode */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleFilter('semua')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            filterPeriode === 'semua'
              ? 'bg-sky-600 border-sky-600 text-white'
              : 'border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600',
          )}
        >
          Semua
        </button>
        {allPeriodes.map((p) => (
          <button
            key={p}
            onClick={() => handleFilter(p)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filterPeriode === p
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Tabel detail per periode */}
      {paginated.map((r) => (
        <div key={r.periode} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Header periode */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div>
              <p className="text-xs text-gray-400">Periode</p>
              <p className="font-bold text-gray-900 mt-0.5">{r.periode}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Skor</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {r.totalScore}
                  <span className="text-sm font-normal text-gray-400 ml-1">/ {r.maxScore}</span>
                </p>
              </div>
              <KlasifikasiBadge level={r.statusAkhir} />
            </div>
          </div>

          {/* Detail per kategori */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
                <th className="px-5 py-2.5 text-left">Kategori</th>
                <th className="px-5 py-2.5 text-center">Skor</th>
                <th className="px-5 py-2.5 text-center">Maks</th>
                <th className="px-5 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-700">
                    <span className="font-medium">{cat.code}.</span> {cat.name}
                  </td>
                  <td className="px-5 py-3 text-center font-semibold text-gray-900">{cat.totalScore}</td>
                  <td className="px-5 py-3 text-center text-gray-400">{cat.maxScore}</td>
                  <td className="px-5 py-3 text-right">
                    <KlasifikasiBadge level={cat.klasifikasi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Halaman {safePage} dari {totalPages} · {filtered.length} periode
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:border-sky-300 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-medium transition-colors',
                  safePage === n
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600',
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:border-sky-300 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
