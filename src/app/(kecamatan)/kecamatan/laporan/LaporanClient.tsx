'use client'

import { useState } from 'react'
import { FileDown, Loader2, FileSpreadsheet } from 'lucide-react'

interface Props {
  availableYears: number[]
}

export function LaporanClient({ availableYears }: Props) {
  const currentYear = new Date().getFullYear()
  const [tahun, setTahun] = useState<number>(availableYears[0] ?? currentYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/export/self-assessment/yearly?tahun=${tahun}`)
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setError(json.error ?? 'Gagal mengunduh laporan')
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `laporan-${tahun}.xlsx`

      const anchor = document.createElement('a')
      anchor.href = URL.createObjectURL(blob)
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(anchor.href)
    } catch {
      setError('Gagal mengunduh laporan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (availableYears.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
        <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium text-sm">Belum ada data assessment</p>
        <p className="text-xs text-slate-400 mt-1">Laporan akan tersedia setelah Anda mengisi assessment</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md space-y-5">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-8 h-8 text-sky-600 shrink-0" />
        <div>
          <p className="font-semibold text-gray-900">Rekap Assessment per Tahun</p>
          <p className="text-sm text-gray-500">
            Satu file Excel berisi semua periode dalam tahun yang dipilih
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Tahun</label>
        <select
          value={tahun}
          onChange={(e) => { setTahun(parseInt(e.target.value, 10)); setError('') }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          disabled={loading}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Mengunduh…</>
        ) : (
          <><FileDown className="w-4 h-4" /> Download Excel {tahun}</>
        )}
      </button>
    </div>
  )
}
