'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type KlasifikasiBerdayaChartRow = {
  year: string
  belumBerdaya: number
  rintisan: number
  berkembang: number
  maju: number
}

const SERIES = [
  { key: 'belumBerdaya', label: 'Belum Berdaya', color: '#ef4444' },
  { key: 'rintisan', label: 'Rintisan', color: '#f59e0b' },
  { key: 'berkembang', label: 'Berkembang', color: '#3b82f6' },
  { key: 'maju', label: 'Maju', color: '#22c55e' },
] as const

export function KlasifikasiBerdayaChart({ data }: { data: KlasifikasiBerdayaChartRow[] }) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />

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
  )
}

