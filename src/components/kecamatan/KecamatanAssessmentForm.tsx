'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, Send, Loader2,
  CheckCircle, AlertTriangle, Upload,
  CloudUpload, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning'

interface Indicator { id: number; number: number; indicator: string; maxScore: number }
interface Category   { id: number; code: string; name: string; indicators: Indicator[] }
interface ExistingEntry {
  id: number; indicatorId: number; description: string
  score: number; supportingDoc: string | null; status: string
}

interface Props {
  assessment: { id: number; title: string; periode: string; categories: Category[] }
  existingEntries: ExistingEntry[]
  submittedById: number
  periode: string
}

interface RowState { description: string; score: string; supportingDoc: string }

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function KecamatanAssessmentForm({ assessment, existingEntries, submittedById, periode }: Props) {
  const router = useRouter()

  // Init rows dari existing
  const initRows = useCallback((): Record<number, RowState> => {
    const r: Record<number, RowState> = {}
    for (const cat of assessment.categories) {
      for (const ind of cat.indicators) {
        const ex = existingEntries.find((e) => e.indicatorId === ind.id)
        r[ind.id] = {
          description:   ex?.description    ?? '',
          score:         ex?.score != null   ? String(ex.score) : '',
          supportingDoc: ex?.supportingDoc   ?? '',
        }
      }
    }
    return r
  }, [assessment.categories, existingEntries])

  const [rows, setRows]           = useState<Record<number, RowState>>(initRows)
  const [isDirty, setIsDirty]     = useState(false)
  const [autoSave, setAutoSave]   = useState<AutoSaveStatus>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submitType, setSubmitType] = useState<'draft' | 'submit' | null>(null)
  const [result, setResult]       = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstMount  = useRef(true)
  const rowsRef       = useRef(rows)  // selalu up-to-date untuk flush saat blur

  // Update ref setiap kali rows berubah
  useEffect(() => { rowsRef.current = rows }, [rows])

  const allSubmitted = existingEntries.length > 0 &&
    existingEntries.every((e) => e.status === 'SUBMITTED' || e.status === 'VALIDATED')

  // Blokir browser refresh/close jika ada unsaved changes
  useUnsavedWarning(isDirty && !allSubmitted)

  // ── Auto-save logic ───────────────────────────────────────────

  const doSaveDraft = useCallback(async (currentRows: Record<number, RowState>) => {
    const entries = Object.entries(currentRows)
      .filter(([, r]) => r.description.trim() || r.score)
      .map(([indId, r]) => ({
        indicatorId:   parseInt(indId, 10),
        submittedById,
        periode,
        description:   r.description.trim() || '-',
        score:         parseInt(r.score || '0', 10),
        supportingDoc: r.supportingDoc.trim() || null,
      }))

    if (entries.length === 0) return

    setAutoSave('saving')
    try {
      await Promise.all(
        entries.map((e) =>
          fetch('/api/assessment/self-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(e),
          })
        )
      )
      setAutoSave('saved')
      setIsDirty(false)
      setTimeout(() => setAutoSave('idle'), 2500)
    } catch {
      setAutoSave('error')
      setTimeout(() => setAutoSave('idle'), 3000)
    }
  }, [submittedById, periode])

  // Trigger auto-save 800ms setelah user berhenti mengetik
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    if (allSubmitted || !isDirty) return

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      doSaveDraft(rows)
    }, 800)

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [rows, isDirty, allSubmitted, doSaveDraft])

  // Flush save segera saat user blur dari field (pindah focus/navigasi)
  const handleFieldBlur = useCallback(() => {
    if (!isDirty || allSubmitted) return
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = null
    }
    doSaveDraft(rowsRef.current)
  }, [isDirty, allSubmitted, doSaveDraft])

  const updateRow = (indId: number, field: keyof RowState, value: string) => {
    setRows((p) => ({ ...p, [indId]: { ...p[indId], [field]: value } }))
    setIsDirty(true)
    setResult(null)
  }

  // ── Manual save / submit ──────────────────────────────────────

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    // Batalkan auto-save yang pending
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

    setSubmitting(true)
    setSubmitType(status === 'DRAFT' ? 'draft' : 'submit')
    setResult(null)

    const entries = Object.entries(rows)
      .filter(([, r]) => r.description.trim() || r.score)
      .map(([indId, r]) => ({
        indicatorId:   parseInt(indId, 10),
        submittedById,
        periode,
        description:   r.description.trim() || '-',
        score:         parseInt(r.score || '0', 10),
        supportingDoc: r.supportingDoc.trim() || null,
      }))

    if (entries.length === 0) {
      setResult({ type: 'error', message: 'Isi minimal satu indikator sebelum menyimpan.' })
      setSubmitting(false); setSubmitType(null)
      return
    }

    try {
      const saves = await Promise.all(
        entries.map((e) =>
          fetch('/api/assessment/self-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(e),
          }).then((r) => r.json())
        )
      )

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

      setIsDirty(false)
      setAutoSave('idle')
      setResult({
        type: 'success',
        message: status === 'DRAFT'
          ? 'Berhasil disimpan sebagai draft.'
          : 'Assessment berhasil disubmit untuk divalidasi!',
      })
      if (status === 'SUBMITTED') {
        setTimeout(() => router.refresh(), 1200)
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan. Coba lagi.' })
    } finally {
      setSubmitting(false); setSubmitType(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Status bar: submitted / auto-save indicator */}
      {allSubmitted ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="w-4 h-4" />
          Assessment sudah disubmit dan sedang menunggu validasi.
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs text-sky-700">
          <span>Perubahan akan otomatis disimpan sebagai draft dalam 2 detik.</span>
          <span className="flex items-center gap-1.5 font-medium">
            {autoSave === 'saving' && (
              <><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</>
            )}
            {autoSave === 'saved' && (
              <><CheckCircle2 className="w-3 h-3 text-green-600" />
              <span className="text-green-700">Tersimpan otomatis</span></>
            )}
            {autoSave === 'error' && (
              <><AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-red-600">Auto-save gagal</span></>
            )}
            {autoSave === 'idle' && isDirty && (
              <><CloudUpload className="w-3 h-3 text-sky-500" />
              <span>Ada perubahan belum disimpan</span></>
            )}
          </span>
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        )}>
          {result.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          {result.message}
        </div>
      )}

      {/* Tabel per kategori */}
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
                      <Upload className="w-3 h-3" /> Dokumen
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cat.indicators.map((ind) => {
                  const row = rows[ind.id]
                  const existing = existingEntries.find((e) => e.indicatorId === ind.id)
                  const isLocked = existing?.status === 'SUBMITTED' || existing?.status === 'VALIDATED'
                  return (
                    <tr key={ind.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-center text-gray-500 font-medium">{ind.number}</td>
                      <td className="px-4 py-3 text-gray-700 leading-relaxed">{ind.indicator}</td>
                      <td className="px-4 py-3">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(ind.id, 'description', e.target.value)}
                          onBlur={handleFieldBlur}
                          disabled={isLocked}
                          rows={3} maxLength={5000}
                          placeholder="Deskripsi pencapaian..."
                          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={row.score}
                          onChange={(e) => updateRow(ind.id, 'score', e.target.value)}
                          onBlur={handleFieldBlur}
                          disabled={isLocked}
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
                          onBlur={handleFieldBlur}
                          disabled={isLocked}
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

      {/* Action buttons */}
      {!allSubmitted && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
          <p className="text-xs text-gray-400 mr-auto">
            Draft: tersimpan, belum dikirim ke admin. Submit: dikirim ke admin untuk divalidasi.
          </p>
          <button type="button" disabled={submitting} onClick={() => handleSave('DRAFT')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {submitting && submitType === 'draft'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            Simpan Draft
          </button>
          <button type="button" disabled={submitting} onClick={() => handleSave('SUBMITTED')}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
            {submitting && submitType === 'submit'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            Submit Assessment
          </button>
        </div>
      )}
    </div>
  )
}
