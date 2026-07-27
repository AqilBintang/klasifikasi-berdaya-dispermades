'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFloppyDisk, faPaperPlane, faSpinner,
  faCheckCircle, faTriangleExclamation, faUpload,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface Indicator {
  id: number
  number: number
  indicator: string
  maxScore: number
}

interface Category {
  id: number
  code: string
  name: string
  indicators: Indicator[]
}

interface ExistingEntry {
  id: number
  indicatorId: number
  description: string
  score: number
  supportingDoc: string | null
  status: string
}

interface Props {
  assessment: { id: number; title: string; periode: string; categories: Category[] }
  existingEntries: ExistingEntry[]
  submittedById: number
  periode: string
}

interface RowState {
  description: string
  score: string
  supportingDoc: string
}

export function KecamatanAssessmentForm({ assessment, existingEntries, submittedById, periode }: Props) {
  const router = useRouter()

  // Init state dari existing entries
  const initRows: Record<number, RowState> = {}
  for (const cat of assessment.categories) {
    for (const ind of cat.indicators) {
      const existing = existingEntries.find((e) => e.indicatorId === ind.id)
      initRows[ind.id] = {
        description:  existing?.description   ?? '',
        score:        existing?.score != null  ? String(existing.score) : '',
        supportingDoc: existing?.supportingDoc ?? '',
      }
    }
  }

  const [rows, setRows] = useState<Record<number, RowState>>(initRows)
  const [submitting, setSubmitting] = useState(false)
  const [submitType, setSubmitType] = useState<'draft' | 'submit' | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const updateRow = (indId: number, field: keyof RowState, value: string) =>
    setRows((p) => ({ ...p, [indId]: { ...p[indId], [field]: value } }))

  // Cek apakah semua sudah SUBMITTED (read-only)
  const allSubmitted = existingEntries.length > 0 &&
    existingEntries.every((e) => e.status === 'SUBMITTED' || e.status === 'VALIDATED')

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    setSubmitting(true)
    setSubmitType(status === 'DRAFT' ? 'draft' : 'submit')
    setResult(null)

    const entries = Object.entries(rows)
      .filter(([, r]) => r.description.trim() || r.score)
      .map(([indId, r]) => ({
        indicatorId: parseInt(indId, 10),
        submittedById,
        periode,
        description: r.description.trim() || '-',
        score: parseInt(r.score || '0', 10),
        supportingDoc: r.supportingDoc.trim() || null,
      }))

    if (entries.length === 0) {
      setResult({ type: 'error', message: 'Isi minimal satu indikator sebelum menyimpan.' })
      setSubmitting(false)
      setSubmitType(null)
      return
    }

    try {
      // Upsert semua entries
      const saves = await Promise.all(
        entries.map((e) =>
          fetch('/api/assessment/self-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(e),
          }).then((r) => r.json())
        )
      )

      // Jika submit, patch status ke SUBMITTED
      if (status === 'SUBMITTED') {
        await Promise.all(
          saves.map((s) =>
            s.data?.id
              ? fetch(`/api/assessment/self-assessment/${s.data.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'SUBMITTED' }),
                })
              : Promise.resolve()
          )
        )
      }

      setResult({
        type: 'success',
        message: status === 'DRAFT'
          ? 'Berhasil disimpan sebagai draft.'
          : 'Assessment berhasil disubmit untuk divalidasi.',
      })
      setTimeout(() => router.refresh(), 1000)
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan. Coba lagi.' })
    } finally {
      setSubmitting(false)
      setSubmitType(null)
    }
  }

  return (
    <div className="space-y-6">
      {allSubmitted && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" />
          Assessment sudah disubmit dan sedang menunggu validasi.
        </div>
      )}

      {result && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        )}>
          <FontAwesomeIcon icon={result.type === 'success' ? faCheckCircle : faTriangleExclamation} className="w-4 h-4 mt-0.5 shrink-0" />
          {result.message}
        </div>
      )}

      {assessment.categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-sky-600 px-6 py-3">
            <h3 className="font-semibold text-white text-sm">{cat.code}. {cat.name}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600">
                  <th className="w-10 px-3 py-3 text-center">No</th>
                  <th className="px-4 py-3 text-left">Indikator</th>
                  <th className="w-56 px-4 py-3 text-left">Deskripsi</th>
                  <th className="w-20 px-4 py-3 text-center">Skor</th>
                  <th className="w-44 px-4 py-3 text-left">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUpload} className="w-3 h-3" /> Dokumen
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cat.indicators.map((ind) => {
                  const row = rows[ind.id]
                  const existing = existingEntries.find((e) => e.indicatorId === ind.id)
                  const isSubmitted = existing?.status === 'SUBMITTED' || existing?.status === 'VALIDATED'
                  return (
                    <tr key={ind.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-center text-gray-500 font-medium">{ind.number}</td>
                      <td className="px-4 py-3 text-gray-700 leading-relaxed">{ind.indicator}</td>
                      <td className="px-4 py-3">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(ind.id, 'description', e.target.value)}
                          disabled={isSubmitted}
                          rows={3}
                          maxLength={5000}
                          placeholder="Deskripsi pencapaian..."
                          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={row.score}
                          onChange={(e) => updateRow(ind.id, 'score', e.target.value)}
                          disabled={isSubmitted}
                          className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none disabled:bg-gray-50"
                        >
                          <option value="">-</option>
                          {Array.from({ length: ind.maxScore + 1 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-0.5">/{ind.maxScore}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="url"
                          value={row.supportingDoc}
                          onChange={(e) => updateRow(ind.id, 'supportingDoc', e.target.value)}
                          disabled={isSubmitted}
                          placeholder="https://..."
                          maxLength={500}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!allSubmitted && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
          <p className="text-xs text-gray-400 mr-auto">
            Draft: tersimpan, belum dikirim. Submit: dikirim ke admin untuk divalidasi.
          </p>
          <button type="button" disabled={submitting} onClick={() => handleSave('DRAFT')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {submitting && submitType === 'draft'
              ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
              : <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />}
            Simpan Draft
          </button>
          <button type="button" disabled={submitting} onClick={() => handleSave('SUBMITTED')}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
            {submitting && submitType === 'submit'
              ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
              : <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />}
            Submit
          </button>
        </div>
      )}
    </div>
  )
}
