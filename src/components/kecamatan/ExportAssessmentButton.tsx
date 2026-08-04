'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

interface Props {
  assessmentId: number
  periode: string
}

export function ExportAssessmentButton({ assessmentId, periode }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const url = `/api/export/self-assessment?assessmentId=${assessmentId}&periode=${encodeURIComponent(periode)}`
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        alert(json.error ?? 'Gagal mengunduh file')
        return
      }

      // Trigger download
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `self-assessment-${periode}.xlsx`

      const anchor = document.createElement('a')
      anchor.href = URL.createObjectURL(blob)
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(anchor.href)
    } catch {
      alert('Gagal mengunduh file. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      {loading ? 'Mengunduh…' : 'Export Excel'}
    </button>
  )
}
