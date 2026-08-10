'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'

interface YearFilterProps {
  years: string[]
  selected: string | null  // null = semua tahun
}

export function YearFilter({ years, selected }: YearFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete('tahun')
    } else {
      params.set('tahun', value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <select
        value={selected ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        aria-label="Filter tahun"
      >
        <option value="">Semua Tahun</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
