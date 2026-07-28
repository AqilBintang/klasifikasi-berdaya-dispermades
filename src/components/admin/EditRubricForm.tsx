'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk, faSpinner, faCheckCircle, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface Indicator { id: number; number: number; indicator: string }
interface Category   { id: number; code: string; name: string; order: number; indicators: Indicator[] }

interface ExistingItem {
  indicatorId: number
  score1: string; score2: string; score3: string; score4: string
}

interface RubricData {
  id: number
  title: string
  items: ExistingItem[]
  assessment: {
    id: number; title: string; periode: string
    categories: Category[]
  }
}

type ScoreRow = { score1: string; score2: string; score3: string; score4: string }

export function EditRubricForm({ rubric }: { rubric: RubricData }) {
  const router = useRouter()
  const [title, setTitle] = useState(rubric.title)

  // Init rows dari existing items — indikator yang belum diisi = kosong
  const initRows: Record<number, ScoreRow> = {}
  for (const cat of rubric.assessment.categories) {
    for (const ind of cat.indicators) {
      const existing = rubric.items.find((item) => item.indicatorId === ind.id)
      initRows[ind.id] = {
        score1: existing?.score1 ?? '',
        score2: existing?.score2 ?? '',
        score3: existing?.score3 ?? '',
        score4: existing?.score4 ?? '',
      }
    }
  }

  const [rows, setRows] = useState<Record<number, ScoreRow>>(initRows)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const updateRow = (indId: number, field: keyof ScoreRow, val: string) =>
    setRows((p) => ({ ...p, [indId]: { ...p[indId], [field]: val } }))

  const handleSave = async () => {
    setSaving(true); setResult(null)
    try {
      // Kirim semua indikator (yang diisi maupun kosong) agar bisa hapus/update
      const items = Object.entries(rows).map(([indId, r]) => ({
        indicatorId: parseInt(indId, 10),
        score1: r.score1.trim() || '-',
        score2: r.score2.trim() || '-',
        score3: r.score3.trim() || '-',
        score4: r.score4.trim() || '-',
      }))

      const res = await fetch(`/api/rubric/${rubric.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), items }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult({ type: 'success', message: 'Rubrik berhasil disimpan.' })
        setTimeout(() => router.push('/admin/panduan'), 1200)
      } else {
        setResult({ type: 'error', message: json.error ?? 'Gagal menyimpan.' })
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan jaringan.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        )}>
          <FontAwesomeIcon icon={result.type === 'success' ? faCheckCircle : faTriangleExclamation} className="w-4 h-4 mt-0.5 shrink-0" />
          {result.message}
        </div>
      )}

      {/* Judul */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Judul Rubrik</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
        <p className="mt-2 text-xs text-gray-400">
          Semua indikator dari assessment ditampilkan. Isi yang belum diisi akan disimpan sebagai &quot;-&quot;.
        </p>
      </div>

      {/* Tabel per kategori — tampilkan SEMUA indikator */}
      {rubric.assessment.categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-sky-600 px-6 py-3">
            <h3 className="font-semibold text-white text-sm">Kategori {cat.code}. {cat.name}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600">
                  <th className="w-10 px-3 py-3 text-center">No</th>
                  <th className="px-4 py-3 text-left min-w-[200px]">Indikator</th>
                  <th className="px-4 py-3 text-left min-w-[160px] bg-sky-50">Skor 1</th>
                  <th className="px-4 py-3 text-left min-w-[160px] bg-sky-50">Skor 2</th>
                  <th className="px-4 py-3 text-left min-w-[160px] bg-sky-50">Skor 3</th>
                  <th className="px-4 py-3 text-left min-w-[160px] bg-sky-50">Skor 4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cat.indicators.map((ind) => {
                  const row = rows[ind.id] ?? { score1: '', score2: '', score3: '', score4: '' }
                  const hasContent = row.score1 || row.score2 || row.score3 || row.score4
                  return (
                    <tr key={ind.id} className={cn('hover:bg-gray-50', hasContent ? '' : 'bg-amber-50/30')}>
                      <td className="px-3 py-3 text-center text-gray-500 font-medium align-top">{ind.number}</td>
                      <td className="px-4 py-3 text-gray-700 align-top leading-relaxed">
                        {ind.indicator}
                        {!hasContent && (
                          <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600">
                            Belum diisi
                          </span>
                        )}
                      </td>
                      {(['score1', 'score2', 'score3', 'score4'] as const).map((field) => (
                        <td key={field} className="px-4 py-3 align-top">
                          <textarea
                            value={row[field]}
                            onChange={(e) => updateRow(ind.id, field, e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder={`Kriteria skor ${field.replace('score', '')}...`}
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="flex justify-end rounded-xl border bg-white px-6 py-4 shadow-sm">
        <button type="button" disabled={saving} onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {saving ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </div>
  )
}
