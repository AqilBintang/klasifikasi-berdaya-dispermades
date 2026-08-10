'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { KlasifikasiLevel } from '@/lib/scoring'

export type SkorPerTahunRow = {
  year: string
  totalScore: number
  maxPossibleTotal: number
  statusAkhir: KlasifikasiLevel | null
}

const STATUS_COLOR: Record<string, string> = {
  'Rintisan': '#ef4444',
  'Berkembang': '#f59e0b',
  'Maju': '#3b82f6',
  'Berdaya': '#22c55e',
}

type TooltipProps = {
  active?: boolean
  payload?: { value: number; payload: SkorPerTahunRow }[]
  label?: string
  kabupaten: string
  kecamatan: string
}

function CustomTooltip({ active, payload, label, kabupaten, kecamatan }: TooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg text-sm min-w-[200px]">
      <p className="text-xs text-gray-400 mb-1">{kabupaten}</p>
      <p className="font-semibold text-gray-800 mb-2">{kecamatan}</p>
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-gray-500">Tahun</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-gray-500">Skor</span>
        <span className="font-medium">{row.totalScore} / {row.maxPossibleTotal}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-500">Klasifikasi</span>
        <span
          className="font-semibold"
          style={{ color: STATUS_COLOR[row.statusAkhir ?? ''] ?? '#6b7280' }}
        >
          {row.statusAkhir ?? '-'}
        </span>
      </div>
    </div>
  )
}

type Props = {
  data: SkorPerTahunRow[]
  kabupaten: string
  kecamatan: string
}

export function KecamatanSkorChart({ data, kabupaten, kecamatan }: Props) {
  return (
    <div className="w-full space-y-3">
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip kabupaten={kabupaten} kecamatan={kecamatan} />} />
            <Bar dataKey="totalScore" name="Skor" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {data.map((row) => (
                <Cell
                  key={row.year}
                  fill={STATUS_COLOR[row.statusAkhir ?? ''] ?? '#94a3b8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
        {[
          { label: 'Rintisan',      color: '#ef4444' },
          { label: 'Berkembang',    color: '#f59e0b' },
          { label: 'Maju',          color: '#3b82f6' },
          { label: 'Berdaya',       color: '#22c55e' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
