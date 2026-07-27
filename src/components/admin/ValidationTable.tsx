'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle,
  faTimesCircle,
  faExclamationCircle,
  faSpinner,
  faEye,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface SelfAssessmentRow {
  id: number
  periode: string
  status: string
  score: number
  description: string
  supportingDoc: string | null
  submittedAt: string | null
  submittedBy: { id: number; name: string; email: string }
  indicator: {
    number: number
    indicator: string
    maxScore: number
    category: {
      code: string
      name: string
      assessment: { id: number; title: string; periode: string }
    }
  }
  validations: {
    id: number
    status: string
    validatedScore: number | null
    notes: string | null
    validatedAt: string
    validator: { id: number; name: string }
  }[]
}

interface ValidationTableProps {
  submissions: SelfAssessmentRow[]
  validatorId: number
  onValidated: () => void
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  DRAFT:     { label: 'Draft',           class: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Menunggu',        class: 'bg-amber-100 text-amber-700' },
  VALIDATED: { label: 'Divalidasi',      class: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Ditolak',         class: 'bg-red-100 text-red-700' },
}

function ValidationModal({
  submission,
  validatorId,
  onClose,
  onSuccess,
}: {
  submission: SelfAssessmentRow
  validatorId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [validationStatus, setValidationStatus] = useState<'APPROVED' | 'REJECTED' | 'REVISION_NEEDED'>('APPROVED')
  const [validatedScore, setValidatedScore] = useState<string>(String(submission.score))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/assessment/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfAssessmentId: submission.id,
          validatorId,
          status: validationStatus,
          validatedScore: validatedScore ? parseInt(validatedScore, 10) : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        onSuccess()
        onClose()
      } else {
        setError(json.error ?? 'Gagal menyimpan validasi.')
      }
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold text-gray-900">Validasi Self Assessment</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {submission.indicator.category.code}. {submission.indicator.category.name} — Indikator {submission.indicator.number}
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Submission detail */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
            <div><span className="font-medium text-gray-600">Dari:</span> {submission.submittedBy.name}</div>
            <div><span className="font-medium text-gray-600">Deskripsi:</span>
              <p className="mt-1 text-gray-700">{submission.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span><span className="font-medium text-gray-600">Skor:</span> {submission.score}/{submission.indicator.maxScore}</span>
              {submission.supportingDoc && (
                <a href={submission.supportingDoc} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-600 hover:underline text-xs">
                  <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
                  Lihat Dokumen
                </a>
              )}
            </div>
          </div>

          {/* Validation decision */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keputusan</label>
            <div className="flex gap-2">
              {([
                { value: 'APPROVED', label: 'Setujui', icon: faCheckCircle, color: 'border-green-500 bg-green-50 text-green-700' },
                { value: 'REJECTED', label: 'Tolak', icon: faTimesCircle, color: 'border-red-500 bg-red-50 text-red-700' },
                { value: 'REVISION_NEEDED', label: 'Revisi', icon: faExclamationCircle, color: 'border-amber-500 bg-amber-50 text-amber-700' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValidationStatus(opt.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                    validationStatus === opt.value ? opt.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <FontAwesomeIcon icon={opt.icon} className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Validated score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skor Validasi <span className="text-gray-400 font-normal">(opsional — jika berbeda)</span>
            </label>
            <input
              type="number"
              min={0}
              max={submission.indicator.maxScore}
              value={validatedScore}
              onChange={(e) => setValidatedScore(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Tambahkan catatan untuk kecamatan..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
            {saving && <FontAwesomeIcon icon={faSpinner} className="w-3.5 h-3.5 animate-spin" />}
            Simpan Validasi
          </button>
        </div>
      </div>
    </div>
  )
}

export function ValidationTable({ submissions, validatorId, onValidated }: ValidationTableProps) {
  const [selected, setSelected] = useState<SelfAssessmentRow | null>(null)

  const pending = submissions.filter((s) => s.status === 'SUBMITTED')
  const done    = submissions.filter((s) => s.status !== 'SUBMITTED' && s.status !== 'DRAFT')

  return (
    <>
      {selected && (
        <ValidationModal
          submission={selected}
          validatorId={validatorId}
          onClose={() => setSelected(null)}
          onSuccess={onValidated}
        />
      )}

      {/* Pending */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Menunggu Validasi ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
            Tidak ada submission yang perlu divalidasi.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-xs font-semibold text-gray-600">
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Kategori / Indikator</th>
                  <th className="px-4 py-3">Dari</th>
                  <th className="px-4 py-3 text-center">Skor</th>
                  <th className="px-4 py-3">Disubmit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{s.indicator.category.assessment.title}</div>
                      <div className="text-xs text-gray-400">{s.periode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-medium">{s.indicator.category.code}{s.indicator.number}.</span>{' '}
                      <span className="line-clamp-1">{s.indicator.indicator}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.submittedBy.name}</td>
                    <td className="px-4 py-3 text-center font-medium">{s.score}/{s.indicator.maxScore}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                      >
                        Validasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="font-semibold text-gray-800">Sudah Diproses ({done.length})</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-xs font-semibold text-gray-600">
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Indikator</th>
                  <th className="px-4 py-3">Dari</th>
                  <th className="px-4 py-3 text-center">Skor</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {done.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.DRAFT
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{s.indicator.category.assessment.title}</td>
                      <td className="px-4 py-3 text-gray-600 line-clamp-1">{s.indicator.indicator}</td>
                      <td className="px-4 py-3 text-gray-600">{s.submittedBy.name}</td>
                      <td className="px-4 py-3 text-center">{s.score}/{s.indicator.maxScore}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.class}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
