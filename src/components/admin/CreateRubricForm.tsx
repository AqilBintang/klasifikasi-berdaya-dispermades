'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk, faSpinner, faCheckCircle, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface Indicator { id: number; number: number; indicator: string }
interface Category   { id: number; code: string; name: string; indicators: Indicator[] }
interface AssessmentOption { id: number; title: string; periode: string; categories: Category[] }

interface CreateRubricFormProps { assessments: AssessmentOption[] }

interface ScoreRow { score1: string; score2: string; score3: string; score4: string }

export function CreateRubricForm({ assessments }: CreateRubricFormProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [title, setTitle] = useState('RUBRIK PENILAIAN KECAMATAN BERDAYA PROGRAM')
  const [rows, setRows] = useState<Record<number, ScoreRow>>({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selectedAssessment = assessments.find((a) => a.id === selectedId)

  const handleSelectAssessment = (id: number) => {
    setSelectedId(id)
    const a = assessments.find((x) => x.id === id)
    if (!a) return
    const init: Record<number, ScoreRow> = {}
    a.categories.forEach((cat) =>
      cat.indicators.forEach((ind) => {
        init[ind.id] = { score1: '', score2: '', score3: '', score4: '' }
      })
    )
    setRows(init)
  }

  const updateRow = (indId: number, field: keyof ScoreRow, val: string) =>
    setRows((p) => ({ ...p, [indId]: { ...p[indId], [field]: val } }))

  const handleSave = async () => {
    if (!selectedId) { setResult({ type: 'error', message: 'Pilih assessment terlebih dahulu.' }); return }
    if (!title.trim()) { setResult({ type: 'error', message: 'Judul rubrik wajib diisi.' }); return }

    const items = Object.entries(rows)
      .filter(([, r]) => r.score1.trim() || r.score2.trim() || r.score3.trim() || r.score4.trim())
      .map(([indId, r]) => ({
        indicatorId: parseInt(indId, 10),
        score1: r.score1.trim() || '-',
        score2: r.score2.trim() || '-',
        score3: r.score3.trim() || '-',
        score4: r.score4.trim() || '-',
      }))

    if (items.length === 0) { setResult({ type: 'error', message: 'Isi minimal satu indikator.' }); return }

    setSaving(true); setResult(null)
    try {
      const res = await fetch('/api/rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: selectedId, title: title.trim(), items }),
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

      {/* Info dasar */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Assessment <span className="text-red-500">*</span></label>
          <select
            value={selectedId}
            onChange={(e) => handleSelectAssessment(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
          >
            <option value="">-- Pilih assessment --</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.title} ({a.periode})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul Rubrik <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />
        </div>
      </div>

      {/* Tabel per kategori */}
      {selectedAssessment?.categories.map((cat) => (
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
                  return (
                    <tr key={ind.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-center text-gray-500 font-medium align-top">{ind.number}</td>
                      <td className="px-4 py-3 text-gray-700 align-top leading-relaxed">{ind.indicator}</td>
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

      {selectedAssessment && (
        <div className="flex justify-end rounded-xl border bg-white px-6 py-4 shadow-sm">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />}
            Simpan Rubrik
          </button>
        </div>
      )}
    </div>
  )
}
