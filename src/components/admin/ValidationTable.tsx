'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle, faTimesCircle, faExclamationCircle,
  faSpinner, faChevronDown, faChevronRight,
  faMapMarkerAlt, faLink, faCheckDouble,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface SelfAssessmentRow {
  id: number; periode: string; status: string
  score: number; description: string; supportingDoc: string | null
  submittedAt: string | null
  submittedBy: { id: number; name: string; email: string; kecamatan: string | null; kabupaten: string | null }
  indicator: {
    number: number; indicator: string; maxScore: number
    category: { code: string; name: string; assessment: { id: number; title: string; periode: string } }
  }
  validations: {
    id: number; status: string; validatedScore: number | null
    notes: string | null; validatedAt: string; validator: { id: number; name: string }
  }[]
}

interface ValidationTableProps {
  submissions: SelfAssessmentRow[]
  validatorId: number
  onValidated: () => void
}

// ─── Validation Modal (single) ─────────────────────────────────────────────

function ValidationModal({ submission, validatorId, onClose, onSuccess }: {
  submission: SelfAssessmentRow; validatorId: number
  onClose: () => void; onSuccess: () => void
}) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'REVISION_NEEDED'>('APPROVED')
  const [validatedScore, setValidatedScore] = useState(String(submission.score))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/assessment/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfAssessmentId: submission.id,
          validatorId,
          status: decision,
          validatedScore: validatedScore ? parseInt(validatedScore, 10) : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (res.ok) { onSuccess(); onClose() }
      else setError(json.error ?? 'Gagal menyimpan.')
    } catch { setError('Terjadi kesalahan jaringan.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold text-gray-900">Validasi Indikator</h3>
          <p className="text-xs text-gray-500 mt-0.5">{submission.indicator.indicator}</p>
          <p className="text-xs text-sky-600">{submission.submittedBy.kecamatan ?? submission.submittedBy.name}{submission.submittedBy.kabupaten ? `, ${submission.submittedBy.kabupaten}` : ''}</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="rounded-lg bg-gray-50 border p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Deskripsi Pencapaian</p>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{submission.description}</p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Skor Diajukan</p>
                <span className="text-2xl font-bold text-gray-900">{submission.score}</span>
                <span className="text-gray-400 text-sm">/{submission.indicator.maxScore}</span>
              </div>
              {submission.supportingDoc && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Dokumen</p>
                  <a href={submission.supportingDoc} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sky-600 hover:underline text-sm">
                    <FontAwesomeIcon icon={faLink} className="w-3 h-3" /> Buka Dokumen
                  </a>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Keputusan</p>
            <div className="flex gap-2">
              {([
                { value: 'APPROVED', label: 'Setujui', icon: faCheckCircle, c: 'border-green-500 bg-green-50 text-green-700' },
                { value: 'REJECTED', label: 'Tolak', icon: faTimesCircle, c: 'border-red-500 bg-red-50 text-red-700' },
                { value: 'REVISION_NEEDED', label: 'Revisi', icon: faExclamationCircle, c: 'border-amber-500 bg-amber-50 text-amber-700' },
              ] as const).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setDecision(opt.value)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                    decision === opt.value ? opt.c : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  <FontAwesomeIcon icon={opt.icon} className="w-3.5 h-3.5" />{opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skor Validasi <span className="text-gray-400 font-normal">(opsional)</span></label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={submission.indicator.maxScore}
                  value={validatedScore} onChange={(e) => setValidatedScore(e.target.value)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none" />
                <span className="text-sm text-gray-400">/ {submission.indicator.maxScore}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
                placeholder="Catatan untuk kecamatan..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Batal</button>
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

// ─── Bulk Validate Modal ───────────────────────────────────────────────────

function BulkValidateModal({ pendingIds, validatorId, kecamatanName, onClose, onSuccess }: {
  pendingIds: number[]; validatorId: number; kecamatanName: string
  onClose: () => void; onSuccess: () => void
}) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'REVISION_NEEDED'>('APPROVED')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/assessment/validation/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfAssessmentIds: pendingIds, validatorId, status: decision, notes: notes.trim() || null }),
      })
      const json = await res.json()
      if (res.ok) { onSuccess(); onClose() }
      else setError(json.error ?? 'Gagal.')
    } catch { setError('Terjadi kesalahan jaringan.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold text-gray-900">Validasi Semua Assessment</h3>
          <p className="text-xs text-gray-500 mt-0.5">{kecamatanName} · {pendingIds.length} indikator menunggu</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4 mr-2" />
            Keputusan ini akan diterapkan ke <strong>semua {pendingIds.length} indikator</strong> yang belum divalidasi.
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Keputusan</p>
            <div className="flex gap-2">
              {([
                { value: 'APPROVED', label: 'Setujui Semua', icon: faCheckCircle, c: 'border-green-500 bg-green-50 text-green-700' },
                { value: 'REJECTED', label: 'Tolak Semua', icon: faTimesCircle, c: 'border-red-500 bg-red-50 text-red-700' },
                { value: 'REVISION_NEEDED', label: 'Revisi Semua', icon: faExclamationCircle, c: 'border-amber-500 bg-amber-50 text-amber-700' },
              ] as const).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setDecision(opt.value)}
                  className={cn('flex-1 flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-colors',
                    decision === opt.value ? opt.c : 'border-gray-200 text-gray-500')}>
                  <FontAwesomeIcon icon={opt.icon} className="w-4 h-4" />{opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan untuk Kecamatan <span className="text-gray-400 font-normal">(opsional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000}
              placeholder="Catatan yang sama akan dikirimkan ke semua indikator..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Batal</button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
            {saving && <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />}
            Terapkan ke Semua
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kecamatan Group ───────────────────────────────────────────────────────

function KecamatanGroup({ userId, name, kecamatan, kabupaten, submissions, validatorId, onValidated }: {
  userId: number; name: string; kecamatan: string | null; kabupaten: string | null
  submissions: SelfAssessmentRow[]; validatorId: number; onValidated: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState<SelfAssessmentRow | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  // Group by category
  const catMap: Record<string, { code: string; name: string; items: SelfAssessmentRow[] }> = {}
  for (const s of submissions) {
    const key = s.indicator.category.code
    if (!catMap[key]) catMap[key] = { code: key, name: s.indicator.category.name, items: [] }
    catMap[key].items.push(s)
  }
  const categories = Object.values(catMap)

  const pendingIds = submissions.filter((s) => s.status === 'SUBMITTED').map((s) => s.id)
  const totalPending = pendingIds.length

  return (
    <>
      {selected && (
        <ValidationModal submission={selected} validatorId={validatorId}
          onClose={() => setSelected(null)} onSuccess={() => { setSelected(null); onValidated() }} />
      )}
      {bulkOpen && (
        <BulkValidateModal pendingIds={pendingIds} validatorId={validatorId}
          kecamatanName={kecamatan ?? name}
          onClose={() => setBulkOpen(false)} onSuccess={() => { setBulkOpen(false); onValidated() }} />
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Group header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
          <button type="button" onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-3 flex-1 text-left hover:opacity-80">
            <div className="rounded-lg bg-sky-100 p-2">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{kecamatan ?? name}</p>
              {kabupaten && <p className="text-xs text-gray-500">{kabupaten}</p>}
            </div>
            {totalPending > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {totalPending} menunggu
              </span>
            )}
            <FontAwesomeIcon icon={expanded ? faChevronDown : faChevronRight} className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
          {totalPending > 0 && (
            <button type="button" onClick={() => setBulkOpen(true)}
              className="ml-4 flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 shrink-0">
              <FontAwesomeIcon icon={faCheckDouble} className="w-3.5 h-3.5" />
              Validasi Semua ({totalPending})
            </button>
          )}
        </div>

        {/* Categories */}
        {expanded && (
          <div className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <CategorySection key={cat.code} cat={cat} onValidate={setSelected} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Category Section ──────────────────────────────────────────────────────

function CategorySection({ cat, onValidate }: {
  cat: { code: string; name: string; items: SelfAssessmentRow[] }
  onValidate: (s: SelfAssessmentRow) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const pendingCount = cat.items.filter((s) => s.status === 'SUBMITTED').length

  return (
    <div>
      {/* Category header */}
      <button type="button" onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left transition-colors">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white shrink-0">
          {cat.code}
        </span>
        <span className="font-medium text-gray-800 text-sm flex-1">{cat.name}</span>
        {pendingCount > 0 && (
          <span className="text-xs text-amber-600 font-medium">{pendingCount} menunggu</span>
        )}
        <FontAwesomeIcon icon={expanded ? faChevronDown : faChevronRight} className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {/* Indicators */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {cat.items.map((s) => (
            <IndicatorRow key={s.id} submission={s} onValidate={onValidate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Indicator Row ─────────────────────────────────────────────────────────

function IndicatorRow({ submission: s, onValidate }: {
  submission: SelfAssessmentRow; onValidate: (s: SelfAssessmentRow) => void
}) {
  const isPending  = s.status === 'SUBMITTED'
  const validated  = s.validations[0]

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-colors',
      isPending ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white',
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: indikator info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-gray-500">No. {s.indicator.number}</span>
            <StatusPill status={s.status} />
          </div>
          <p className="text-sm font-medium text-gray-800 leading-snug">{s.indicator.indicator}</p>
        </div>

        {/* Right: action */}
        {isPending && (
          <button type="button" onClick={() => onValidate(s)}
            className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">
            Validasi
          </button>
        )}
      </div>

      {/* Detail grid */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="font-semibold text-gray-500 mb-1">Deskripsi</p>
          <p className="text-gray-700 leading-relaxed line-clamp-4 whitespace-pre-wrap">{s.description || '—'}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-500 mb-1">Skor</p>
          <p className="text-lg font-bold text-gray-900">
            {s.score}<span className="text-sm font-normal text-gray-400">/{s.indicator.maxScore}</span>
          </p>
          {validated?.validatedScore != null && validated.validatedScore !== s.score && (
            <p className="text-sky-600 text-xs mt-0.5">Skor validasi: {validated.validatedScore}</p>
          )}
          {validated?.notes && (
            <p className="text-amber-600 mt-1 line-clamp-2">💬 {validated.notes}</p>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-500 mb-1">Dokumen Pendukung</p>
          {s.supportingDoc ? (
            <a href={s.supportingDoc} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sky-600 hover:underline">
              <FontAwesomeIcon icon={faLink} className="w-3 h-3" /> Buka Dokumen
            </a>
          ) : (
            <p className="text-gray-400 italic">Tidak ada dokumen</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    SUBMITTED: 'bg-amber-100 text-amber-700',
    VALIDATED: 'bg-green-100 text-green-700',
    REJECTED:  'bg-red-100 text-red-700',
    DRAFT:     'bg-gray-100 text-gray-500',
  }
  const label: Record<string, string> = {
    SUBMITTED: 'Menunggu', VALIDATED: 'Divalidasi', REJECTED: 'Ditolak', DRAFT: 'Draft',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cfg[status] ?? 'bg-gray-100 text-gray-500')}>
      {label[status] ?? status}
    </span>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function ValidationTable({ submissions, validatorId, onValidated }: ValidationTableProps) {
  const groups: Record<number, {
    userId: number; name: string; kecamatan: string | null; kabupaten: string | null
    submissions: SelfAssessmentRow[]
  }> = {}

  for (const s of submissions) {
    const uid = s.submittedBy.id
    if (!groups[uid]) {
      groups[uid] = { userId: uid, name: s.submittedBy.name, kecamatan: s.submittedBy.kecamatan ?? null, kabupaten: s.submittedBy.kabupaten ?? null, submissions: [] }
    }
    groups[uid].submissions.push(s)
  }

  const groupList = Object.values(groups).sort((a, b) =>
    (a.kecamatan ?? a.name).localeCompare(b.kecamatan ?? b.name)
  )

  const totalPending = submissions.filter((s) => s.status === 'SUBMITTED').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4 shrink-0" />
        <span>
          <strong>{totalPending}</strong> indikator menunggu validasi dari{' '}
          <strong>{groupList.length}</strong> kecamatan
        </span>
      </div>

      {groupList.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
          Tidak ada submission yang perlu divalidasi.
        </div>
      ) : (
        groupList.map((g) => (
          <KecamatanGroup key={g.userId} {...g} validatorId={validatorId} onValidated={onValidated} />
        ))
      )}
    </div>
  )
}
