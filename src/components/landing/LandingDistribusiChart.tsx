'use client'

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export type DistribusiChartRow = {
  year: string
  rintisan: number
  berkembang: number
  maju: number
  berdaya: number
}

export type SkorPerTahunRow = {
  year: string
  weightedScore: number
  maxWeightedScore: number
  statusAkhir: string | null
}

// Warna muted — tidak terlalu terang, harmonis
const LEVELS = [
  { key: 'rintisan',   label: 'Rintisan',   color: '#f87171', muted: '#fca5a5' },
  { key: 'berkembang', label: 'Berkembang', color: '#fbbf24', muted: '#fde68a' },
  { key: 'maju',       label: 'Maju',       color: '#60a5fa', muted: '#93c5fd' },
  { key: 'berdaya',    label: 'Berdaya',    color: '#4ade80', muted: '#86efac' },
] as const

const STATUS_COLOR: Record<string, string> = {
  'Rintisan':   '#f87171',
  'Berkembang': '#fbbf24',
  'Maju':       '#60a5fa',
  'Berdaya':    '#4ade80',
}

// ─── Distribusi ───────────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
          <span className="text-gray-500">{item.name}:</span>
          <span className="font-medium text-gray-700">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function LandingDistribusiChart({ data }: { data: DistribusiChartRow[] }) {
  if (data.length === 0) return null

  const totalKecamatan = LEVELS.reduce((s, l) => s + (data[data.length - 1]![l.key] as number), 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{totalKecamatan} kecamatan · {data.length} tahun data</p>

      {/* ── Grouped bar per tahun ── */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="20%" barGap={2} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgb(0 0 0 / 0.04)' }} />
          {LEVELS.map((l) => (
            <Bar key={l.key} dataKey={l.key} name={l.label} fill={l.color} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {LEVELS.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Satu kecamatan ───────────────────────────────────────────────────────────

function KecamatanBarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { statusAkhir: string | null; color: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const item = payload[0]!
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm text-xs space-y-0.5">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-500">
        Status:{' '}
        <span className="font-medium" style={{ color: item.payload.color }}>
          {item.payload.statusAkhir ?? 'Belum terklasifikasi'}
        </span>
      </p>
      <p className="text-gray-500">Skor: <span className="font-medium text-gray-700">{item.value.toFixed(1)}%</span></p>
    </div>
  )
}

export function LandingKecamatanChart({
  data,
  kecamatan,
  kabupaten,
}: {
  data: SkorPerTahunRow[]
  kecamatan: string
  kabupaten: string
}) {
  if (data.length === 0) return null

  const latest = data[data.length - 1]!
  const latestColor = STATUS_COLOR[latest.statusAkhir ?? ''] ?? '#94a3b8'

  // Siapkan data bar: persentase skor per tahun, warna per status
  const barData = data.map((row) => ({
    year: row.year,
    pct: row.maxWeightedScore > 0 ? Math.round((row.weightedScore / row.maxWeightedScore) * 100) : 0,
    statusAkhir: row.statusAkhir,
    color: STATUS_COLOR[row.statusAkhir ?? ''] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-3">
      {/* Info kecamatan terpilih */}
      <div className="flex items-center gap-3">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: latestColor }}
        >
          {latest.statusAkhir ?? 'Belum terklasifikasi'}
        </span>
        <span className="text-xs text-gray-400 truncate">{kabupaten} · {kecamatan} · {latest.year}</span>
      </div>

      {/* Bar chart riwayat per tahun */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={barData} barCategoryGap="30%" margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={70}
          />
          <Tooltip content={<KecamatanBarTooltip />} cursor={{ fill: 'rgb(0 0 0 / 0.04)' }} />
          <Bar dataKey="pct" name="Skor" radius={[3, 3, 0, 0]}>
            {barData.map((entry) => (
              <Cell key={entry.year} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend status */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {Object.entries(STATUS_COLOR).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
