'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFloppyDisk,
  faPaperPlane,
  faUpload,
  faCircleInfo,
  faSpinner,
  faCheckCircle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Indicator {
  id: number
  number: number
  indicator: string
  maxScore: number
}

export interface CategoryWithIndicators {
  id: number
  code: string
  name: string
  indicators: Indicator[]
}

interface RowEntry {
  indicatorId: number
  description: string
  score: string       // string agar input kosong bisa dihandle
  supportingDoc: string
}

interface AssessmentFormProps {
  categories: CategoryWithIndicators[]
  submittedById: number  // ID user yang sedang login
  periode: string        // tahun/periode assessment
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreSelect({
  value,
  maxScore,
  onChange,
}: {
  value: string
  maxScore: number
  onChange: (v: string) => void
}) {
  const options = Array.from({ length: maxScore + 1 }, (_, i) => i)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
    >
      <option value="">-</option>
      {options.map((n) => (
        <option key={n} value={String(n)}>
          {n}
        </option>
      ))}
    </select>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function AssessmentForm({ categories, submittedById, periode }: AssessmentFormProps) {
  // Initialize row entries for all indicators
  const initialRows: Record<number, RowEntry> = {}
  for (const cat of categories) {
    for (const ind of cat.indicators) {
      initialRows[ind.id] = {
        indicatorId: ind.id,
        description: '',
        score: '',
        supportingDoc: '',
      }
    }
  }

  const [rows, setRows] = useState<Record<number, RowEntry>>(initialRows)
  const [submitting, setSubmitting] = useState(false)
  const [submitType, setSubmitType] = useState<'draft' | 'submit' | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const updateRow = (indicatorId: number, field: keyof RowEntry, value: string) => {
    setRows((prev) => ({
      ...prev,
      [indicatorId]: { ...prev[indicatorId], [field]: value },
    }))
  }

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    setSubmitting(true)
    setSubmitType(status === 'DRAFT' ? 'draft' : 'submit')
    setResult(null)

    const entries = Object.values(rows).filter((r) => r.description.trim() || r.score)

    if (entries.length === 0) {
      setResult({ type: 'error', message: 'Isi minimal satu indikator sebelum menyimpan.' })
      setSubmitting(false)
      setSubmitType(null)
      return
    }

    try {
      const promises = entries.map((entry) =>
        fetch('/api/assessment/self-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            indicatorId: entry.indicatorId,
            submittedById,
            periode,
            description: entry.description.trim(),
            score: parseInt(entry.score || '0', 10),
            supportingDoc: entry.supportingDoc.trim() || null,
          }),
        })
      )

      const responses = await Promise.all(promises)
      const allOk = responses.every((r) => r.ok)

      if (allOk) {
        // Jika submit, patch semua ke SUBMITTED
        if (status === 'SUBMITTED') {
          const results = await Promise.all(responses.map((r) => r.json()))
          await Promise.all(
            results.map((r) =>
              fetch(`/api/assessment/self-assessment/${r.data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SUBMITTED' }),
              })
            )
          )
        }
        setResult({
          type: 'success',
          message: status === 'DRAFT'
            ? `${entries.length} indikator berhasil disimpan sebagai draft.`
            : `Assessment berhasil disubmit untuk periode ${periode}.`,
        })
      } else {
        setResult({ type: 'error', message: 'Beberapa entri gagal disimpan. Coba lagi.' })
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan jaringan. Coba lagi.' })
    } finally {
      setSubmitting(false)
      setSubmitType(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Info periode */}
      <div className="flex items-center gap-2 rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-800">
        <FontAwesomeIcon icon={faCircleInfo} className="w-4 h-4 shrink-0" />
        <span>Periode Assessment: <strong>{periode}</strong> · Diisi oleh User ID: {submittedById}</span>
      </div>

      {/* Result banner */}
      {result && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          result.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        )}>
          <FontAwesomeIcon
            icon={result.type === 'success' ? faCheckCircle : faTriangleExclamation}
            className="w-4 h-4 mt-0.5 shrink-0"
          />
          <span>{result.message}</span>
        </div>
      )}

      {/* Per-category tables */}
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Category header */}
          <div className="bg-sky-600 px-6 py-3">
            <h3 className="font-semibold text-white text-sm">
              {cat.code}. {cat.name}
            </h3>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-12 px-4 py-3 text-center font-semibold text-gray-700">No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Indikator</th>
                  <th className="w-64 px-4 py-3 text-left font-semibold text-gray-700">
                    Deskripsi Pencapaian
                  </th>
                  <th className="w-24 px-4 py-3 text-center font-semibold text-gray-700">
                    Skor<br />
                    <span className="text-xs font-normal text-gray-400">(0–maks)</span>
                  </th>
                  <th className="w-48 px-4 py-3 text-left font-semibold text-gray-700">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUpload} className="w-3 h-3" />
                      Dokumen Pendukung
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cat.indicators.map((ind) => {
                  const row = rows[ind.id]
                  return (
                    <tr key={ind.id} className="hover:bg-gray-50 transition-colors">
                      {/* Nomor */}
                      <td className="px-4 py-3 text-center text-gray-500 font-medium">
                        {ind.number}
                      </td>

                      {/* Indikator */}
                      <td className="px-4 py-3 text-gray-700 leading-relaxed">
                        {ind.indicator}
                      </td>

                      {/* Deskripsi */}
                      <td className="px-4 py-3">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(ind.id, 'description', e.target.value)}
                          placeholder="Tuliskan deskripsi pencapaian..."
                          rows={3}
                          maxLength={5000}
                          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                        />
                      </td>

                      {/* Skor */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ScoreSelect
                            value={row.score}
                            maxScore={ind.maxScore}
                            onChange={(v) => updateRow(ind.id, 'score', v)}
                          />
                          <span className="text-xs text-gray-400">maks {ind.maxScore}</span>
                        </div>
                      </td>

                      {/* Dokumen pendukung */}
                      <td className="px-4 py-3">
                        <input
                          type="url"
                          value={row.supportingDoc}
                          onChange={(e) => updateRow(ind.id, 'supportingDoc', e.target.value)}
                          placeholder="https://drive.google.com/..."
                          maxLength={500}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                        />
                        <p className="mt-1 text-xs text-gray-400">URL Google Drive / link dokumen</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
        <p className="text-xs text-gray-400 mr-auto">
          Simpan sebagai draft untuk melanjutkan nanti, atau submit untuk dikirim ke validator.
        </p>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSave('DRAFT')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {submitting && submitType === 'draft' ? (
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />
          )}
          Simpan Draft
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSave('SUBMITTED')}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
        >
          {submitting && submitType === 'submit' ? (
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
          )}
          Submit Assessment
        </button>
      </div>
    </div>
  )
}
