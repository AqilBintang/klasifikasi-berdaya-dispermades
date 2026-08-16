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
  needsRevision?: boolean
  changedIndicatorIds?: number[]
}

interface RowState { description: string; score: string; supportingDoc: string }

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function KecamatanAssessmentForm({
  assessment,
  existingEntries,
  submittedById,
  periode,
  needsRevision = false,
  changedIndicatorIds = [],
}: Props) {
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
  const rowsRef       = useRef(rows)

  useEffect(() => { rowsRef.current = rows }, [rows])

  const allSubmitted = existingEntries.length > 0 &&
    existingEntries.every((e) => e.status === 'SUBMITTED' || e.status === 'VALIDATED')

  // Saat needsRevision, user harus mengisi ulang indikator baru meski sebelumnya sudah submit
  const isFormLocked = allSubmitted && !needsRevision

  useUnsavedWarning(isDirty && !isFormLocked)

  // ── Auto-save logic ───────────────────────────────────────────

  const doSaveDraft = useCallback(async (currentRows: Record<number, RowState>) => {
    const entries = Object.entries(currentRows)
      .filter(([, r]) => r.description.trim() || (r.score && r.score !== ''))
      .map(([indId, r]) => {
        // Parse score, default to 1 if empty or invalid, cap at 4 for API compatibility
        const scoreValue = parseInt(r.score, 10)
        let score = isNaN(scoreValue) || scoreValue < 1 ? 1 : scoreValue
        score = score > 4 ? 4 : score // Cap at 4 for API validation

        return {
          indicatorId:   parseInt(indId, 10),
          submittedById,
          periode,
          description:   r.description.trim() || '-',
          score,
          supportingDoc: r.supportingDoc.trim() || null,
        }
      })

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

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    if (isFormLocked || !isDirty) return

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      doSaveDraft(rows)
    }, 800)

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [rows, isDirty, isFormLocked, doSaveDraft])

  const handleFieldBlur = useCallback(() => {
    if (!isDirty || isFormLocked) return
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = null
    }
    doSaveDraft(rowsRef.current)
  }, [isDirty, isFormLocked, doSaveDraft])

  const updateRow = (indId: number, field: keyof RowState, value: string) => {
    setRows((p) => ({ ...p, [indId]: { ...p[indId], [field]: value } }))
    setIsDirty(true)
    setResult(null)
  }

  // ── Manual save / submit ──────────────────────────────────────

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

    setSubmitting(true)
    setSubmitType(status === 'DRAFT' ? 'draft' : 'submit')
    setResult(null)

    // Saat revisi, hanya simpan indikator yang berubah
    const entriesToSave = Object.entries(rows)
      .filter(([indId, r]) => {
        if (!r.description.trim() && !(r.score && r.score !== '')) return false
        // Kalau revisi: prioritaskan indikator yang perlu diisi ulang
        // tapi tetap simpan semua yang diisi
        return true
      })
      .map(([indId, r]) => {
        // Parse score, default to 1 if empty or invalid, cap at 4 for API compatibility
        const scoreValue = parseInt(r.score, 10)
        let score = isNaN(scoreValue) || scoreValue < 1 ? 1 : scoreValue
        score = score > 4 ? 4 : score // Cap at 4 for API validation

        return {
          indicatorId:   parseInt(indId, 10),
          submittedById,
          periode,
          description:   r.description.trim() || '-',
          score,
          supportingDoc: r.supportingDoc.trim() || null,
        }
      })

    if (entriesToSave.length === 0) {
      setResult({ type: 'error', message: 'Isi minimal satu indikator sebelum menyimpan.' })
      setSubmitting(false); setSubmitType(null)
      return
    }

    // Kalau revisi dan mau submit, pastikan semua indikator yang berubah sudah diisi
    if (needsRevision && status === 'SUBMITTED' && changedIndicatorIds.length > 0) {
      const missingRevisionIndicators = changedIndicatorIds.filter(id => {
        const row = rows[id]
        return !row || !row.description.trim() || !row.score
      })
      if (missingRevisionIndicators.length > 0) {
        setResult({
          type: 'error',
          message: `Masih ada ${missingRevisionIndicators.length} indikator baru/berubah yang belum diisi. Harap lengkapi semua indikator yang ditandai.`
        })
        setSubmitting(false); setSubmitType(null)
        return
      }
    }

    try {
      const saves = await Promise.all(
        entriesToSave.map((e) =>
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

        // Skenario 1: jika ini adalah revisi, mark user sebagai up-to-date
        if (needsRevision) {
          await fetch(`/api/assessment/${assessment.id}/user-changes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        }
      }

      setIsDirty(false)
      setAutoSave('idle')
      setResult({
        type: 'success',
        message: status === 'DRAFT'
          ? 'Berhasil disimpan sebagai draft.'
          : needsRevision
            ? 'Revisi berhasil disubmit! Terima kasih telah melengkapi indikator yang diperbarui.'
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
      {/* Banner: perlu revisi */}
      {needsRevision && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-800 text-sm">Assessment Telah Diperbarui — Diperlukan Revisi</p>
            <p className="text-red-700 text-sm mt-0.5">
              Admin telah melakukan pembaruan pada assessment ini.
              {changedIndicatorIds.length > 0
                ? ` Ada ${changedIndicatorIds.length} indikator baru/berubah yang perlu Anda isi ulang (ditandai dengan border merah).`
                : ' Silakan tinjau dan submit ulang assessment Anda.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Status bar: submitted / auto-save indicator */}
      {isFormLocked ? (
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
                  const isSubmittedLocked = (existing?.status === 'SUBMITTED' || existing?.status === 'VALIDATED') && !needsRevision
                  // Saat revisi: indikator yang berubah harus bisa diedit ulang
                  const isChangedIndicator = changedIndicatorIds.includes(ind.id)
                  const isLocked = isSubmittedLocked && !isChangedIndicator

                  return (
                    <tr
                      key={ind.id}
                      className={cn(
                        'hover:bg-gray-50',
                        isChangedIndicator && needsRevision && 'bg-red-50/30'
                      )}
                    >
                      <td className="px-3 py-3 text-center text-gray-500 font-medium">{ind.number}</td>
                      <td className="px-4 py-3 text-gray-700 leading-relaxed">
                        {ind.indicator}
                        {isChangedIndicator && needsRevision && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Perlu diisi ulang
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(ind.id, 'description', e.target.value)}
                          onBlur={handleFieldBlur}
                          disabled={isLocked}
                          rows={3} maxLength={5000}
                          placeholder="Deskripsi pencapaian..."
                          className={cn(
                            'w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400',
                            isChangedIndicator && needsRevision
                              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                              : 'border-gray-300 focus:border-sky-400 focus:ring-sky-400/20'
                          )}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={row.score}
                          onChange={(e) => updateRow(ind.id, 'score', e.target.value)}
                          onBlur={handleFieldBlur}
                          disabled={isLocked}
                          className={cn(
                            'w-16 rounded-lg border bg-white px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50',
                            isChangedIndicator && needsRevision
                              ? 'border-red-300 focus:border-red-400'
                              : 'border-gray-300 focus:border-sky-400'
                          )}
                        >
                          <option value="">-</option>
                          {Array.from({ length: ind.maxScore }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
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
                          className={cn(
                            'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400',
                            isChangedIndicator && needsRevision
                              ? 'border-red-300 focus:border-red-400'
                              : 'border-gray-300 focus:border-sky-400'
                          )}
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
      {!isFormLocked && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
          <p className="text-xs text-gray-400 mr-auto">
            {needsRevision
              ? 'Isi semua indikator yang ditandai lalu submit untuk menyelesaikan revisi.'
              : 'Draft: tersimpan, belum dikirim ke admin. Submit: dikirim ke admin untuk divalidasi.'
            }
          </p>
          <button type="button" disabled={submitting} onClick={() => handleSave('DRAFT')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {submitting && submitType === 'draft'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            Simpan Draft
          </button>
          <button type="button" disabled={submitting} onClick={() => handleSave('SUBMITTED')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50',
              needsRevision ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700'
            )}>
            {submitting && submitType === 'submit'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            {needsRevision ? 'Submit Revisi' : 'Submit Assessment'}
          </button>
        </div>
      )}
    </div>
  )
}