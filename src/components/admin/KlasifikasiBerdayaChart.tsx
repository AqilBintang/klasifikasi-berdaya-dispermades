'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type KlasifikasiBerdayaChartRow = {
  year: string
  rintisan: number
  berkembang: number
  maju: number
  berdaya: number
}

const SERIES = [
  { key: 'rintisan',   label: 'Rintisan',   color: '#ef4444' },
  { key: 'berkembang', label: 'Berkembang', color: '#f59e0b' },
  { key: 'maju',       label: 'Maju',       color: '#3b82f6' },
  { key: 'berdaya',    label: 'Berdaya',    color: '#22c55e' },
] as const

export function KlasifikasiBerdayaChart({ data }: { data: KlasifikasiBerdayaChartRow[] }) {
  return (
    <div className="w-full space-y-3">
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />

            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

