'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  GripVertical,
  Archive,
  Lock,
  Unlock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IndicatorRow {
  tempId: string
  number: number
  indicator: string
  maxScore: number
}

interface CategoryBlock {
  tempId: string
  code: string
  name: string
  description: string
  order: number
  indicators: IndicatorRow[]
}

interface AssessmentData {
  id: number
  title: string
  description: string | null
  periode: string
  status: 'DRAFT' | 'PUBLISHED' | 'REVISION' | 'ARCHIVED'
  categories: {
    id: number
    code: string
    name: string
    description: string | null
    order: number
    indicators: { id: number; number: number; indicator: string; maxScore: number }[]
  }[]
}

let counter = 0
const uid = () => `e_${++counter}`

const toBlock = (cat: AssessmentData['categories'][0]): CategoryBlock => ({
  tempId: uid(),
  code: cat.code,
  name: cat.name,
  description: cat.description ?? '',
  order: cat.order,
  indicators: cat.indicators.map((ind) => ({
    tempId: uid(),
    number: ind.number,
    indicator: ind.indicator,
    maxScore: ind.maxScore,
  })),
})

const newIndicator = (number: number): IndicatorRow => ({
  tempId: uid(), number, indicator: '', maxScore: 4,
})

const newCategory = (order: number): CategoryBlock => ({
  tempId: uid(),
  code: String.fromCharCode(65 + order),
  name: '',
  description: '',
  order,
  indicators: [newIndicator(1)],
})

export function EditAssessmentForm({ assessment, isLocked = false }: { assessment: AssessmentData; isLocked?: boolean }) {
  const router = useRouter()
  const [title, setTitle] = useState(assessment.title)
  const [description, setDescription] = useState(assessment.description ?? '')
  const [periode, setPeriode] = useState(assessment.periode)
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(
    // REVISION bukan pilihan di dropdown — tampilkan sebagai PUBLISHED di form
    assessment.status === 'REVISION' ? 'PUBLISHED' : assessment.status
  )
  const [categories, setCategories] = useState<CategoryBlock[]>(
    assessment.categories.map(toBlock)
  )
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  // REVISION mode: admin sudah klik "Mulai Edit", assessment sedang di-lock
  const [isRevisionMode, setIsRevisionMode] = useState(assessment.status === 'REVISION')
  const [lockingRevision, setLockingRevision] = useState(false)

  const [isPublishing, setIsPublishing] = useState(false)

  // Assessment PUBLISHED dengan jawaban masuk — harus lock dulu sebelum bisa edit
  const needsLockBeforeEdit = isLocked && !isRevisionMode && assessment.status === 'PUBLISHED'

  // ── Auto save (hanya saat status DRAFT) ────────────────────────────────────

  const scheduleAutoSave = () => {
    if (status !== 'DRAFT') return
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true)
      try {
        await fetch(`/api/assessment/${assessment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || assessment.title,
            description: description.trim() || null,
            periode: periode.trim() || assessment.periode,
            status: 'DRAFT',
            categories: categories.map((cat) => ({
              code: cat.code,
              name: cat.name.trim() || `Kategori ${cat.code}`,
              description: cat.description.trim() || null,
              order: cat.order,
              indicators: cat.indicators.map((ind) => ({
                number: ind.number,
                indicator: ind.indicator.trim(),
                maxScore: ind.maxScore,
              })),
            })),
          }),
        })
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 2500)
      } catch {
        // silent fail
      } finally {
        setAutoSaving(false)
      }
    }, 2000)
  }

  // Trigger auto save setiap kali konten form berubah
  useEffect(() => {
    scheduleAutoSave()
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, periode, categories])

  const addCategory = () =>
    setCategories((p) => [...p, newCategory(p.length)])

  const removeCategory = (tempId: string) =>
    setCategories((p) =>
      p.filter((c) => c.tempId !== tempId).map((c, i) => ({ ...c, order: i, code: String.fromCharCode(65 + i) }))
    )

  const updateCategory = (tempId: string, field: keyof CategoryBlock, value: string | number) =>
    setCategories((p) => p.map((c) => c.tempId === tempId ? { ...c, [field]: value } : c))

  const addIndicator = (catTempId: string) =>
    setCategories((p) =>
      p.map((c) => c.tempId !== catTempId ? c : {
        ...c, indicators: [...c.indicators, newIndicator(c.indicators.length + 1)],
      })
    )

  const removeIndicator = (catTempId: string, indTempId: string) =>
    setCategories((p) =>
      p.map((c) => c.tempId !== catTempId ? c : {
        ...c,
        indicators: c.indicators
          .filter((i) => i.tempId !== indTempId)
          .map((i, idx) => ({ ...i, number: idx + 1 })),
      })
    )

  const updateIndicator = (catTempId: string, indTempId: string, field: keyof IndicatorRow, value: string | number) =>
    setCategories((p) =>
      p.map((c) => c.tempId !== catTempId ? c : {
        ...c,
        indicators: c.indicators.map((i) => i.tempId === indTempId ? { ...i, [field]: value } : i),
      })
    )

  // Lock assessment ke REVISION sebelum admin bisa edit
  const handleStartEdit = async () => {
    setLockingRevision(true)
    setResult(null)
    try {
      const res = await fetch(`/api/assessment/${assessment.id}/revision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      })
      const json = await res.json()
      if (res.ok) {
        setIsRevisionMode(true)
        if (json.activeUsers > 0) {
          setResult({
            type: 'success',
            message: `Assessment dikunci untuk edit. Ada ${json.activeUsers} kecamatan yang sedang mengisi — mereka dapat menyelesaikan pengisian, lalu akan diminta revisi setelah Anda publish.`,
          })
        }
      } else {
        setResult({ type: 'error', message: json.error ?? 'Gagal mengunci assessment.' })
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan jaringan.' })
    } finally {
      setLockingRevision(false)
    }
  }

  // Batalkan edit — unlock kembali ke PUBLISHED
  const handleCancelEdit = async () => {
    setLockingRevision(true)
    setResult(null)
    try {
      const res = await fetch(`/api/assessment/${assessment.id}/revision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      })
      const json = await res.json()
      if (res.ok) {
        setIsRevisionMode(false)
        setResult({ type: 'success', message: 'Edit dibatalkan. Assessment kembali ke status Published.' })
      } else {
        setResult({ type: 'error', message: json.error ?? 'Gagal membatalkan edit.' })
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan jaringan.' })
    } finally {
      setLockingRevision(false)
    }
  }

  // Calculate changes between original and current data
  const calculateChanges = () => {
    const changes: Array<{
      type: IndicatorChangeType
      indicatorId?: number
      oldValue?: any
      newValue?: any
      requiresResubmit?: boolean
    }> = []

    const originalIndicators = new Map<number, { indicator: string; maxScore: number; categoryId: number }>()
    assessment.categories.forEach(cat => {
      cat.indicators.forEach(ind => {
        originalIndicators.set(ind.id, {
          indicator: ind.indicator,
          maxScore: ind.maxScore,
          categoryId: cat.id
        })
      })
    })

    const originalCount = originalIndicators.size
    const currentCount = categories.reduce((s, c) => s + c.indicators.length, 0)

    if (currentCount > originalCount) {
      for (let i = originalCount; i < currentCount; i++) {
        changes.push({ type: IndicatorChangeType.ADDED, requiresResubmit: true })
      }
    } else if (currentCount < originalCount) {
      for (let i = currentCount; i < originalCount; i++) {
        changes.push({ type: IndicatorChangeType.REMOVED, requiresResubmit: false })
      }
    }

    if (title !== assessment.title || description !== (assessment.description ?? '')) {
      changes.push({ type: IndicatorChangeType.MODIFIED, requiresResubmit: false })
    }

    return changes
  }

  
  const handleSave = async (withMigration = false) => {
    if (!title.trim()) { setResult({ type: 'error', message: 'Judul wajib diisi.' }); return }
    for (const cat of categories) {
      if (!cat.name.trim()) { setResult({ type: 'error', message: `Nama kategori "${cat.code}" wajib diisi.` }); return }
      for (const ind of cat.indicators) {
        if (!ind.indicator.trim()) { setResult({ type: 'error', message: `Indikator nomor ${ind.number} di kategori "${cat.code}" belum diisi.` }); return }
      }
    }

    // Kalau assessment sedang di-lock (REVISION) dan mau publish, wajib pakai migration flow
    if (isRevisionMode && status === 'PUBLISHED' && !withMigration) {
      // Proceed directly to save without preview impact
    }

    // Assessment baru (belum ada jawaban) publish biasa
    if (status === 'PUBLISHED' && assessment.status !== 'PUBLISHED' && !isRevisionMode && !withMigration) {
      // Proceed directly to save without preview impact
    }

    setSaving(true)
    setResult(null)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        periode: periode.trim(),
        status,
        withMigration,
        changes: withMigration ? calculatedChanges : undefined,
        categories: categories.map((cat) => ({
          code: cat.code,
          name: cat.name.trim(),
          description: cat.description.trim() || null,
          order: cat.order,
          indicators: cat.indicators.map((ind) => ({
            number: ind.number,
            indicator: ind.indicator.trim(),
            maxScore: ind.maxScore,
          })),
        })),
      }

      const res = await fetch(`/api/assessment/${assessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (res.ok) {
        const message = withMigration
          ? 'Assessment berhasil dipublish. Kecamatan yang sudah submit akan diminta revisi untuk indikator baru.'
          : 'Assessment berhasil disimpan.'
        setResult({ type: 'success', message })
        setTimeout(() => router.push('/admin/assessment/create'), 1500)
      } else {
        setResult({ type: 'error', message: json.error ?? 'Gagal menyimpan.' })
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan jaringan.' })
    } finally {
      setSaving(false)
    }
  }

  // Form tidak bisa diedit kalau: (1) belum di-lock padahal ada jawaban, atau (2) ARCHIVED
  const formDisabled = needsLockBeforeEdit || assessment.status === 'ARCHIVED'

  return (
    <div className="space-y-6">
      {/* Banner: perlu lock sebelum edit */}
      {needsLockBeforeEdit && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <span className="text-xl">🔒</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">Assessment Memiliki Jawaban Masuk</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Ada kecamatan yang sudah mengisi assessment ini. Untuk mengedit, klik tombol di bawah — assessment akan dikunci sementara agar tidak ada pengisian baru yang dimulai, dan kecamatan yang sudah submit akan diminta revisi setelah Anda publish.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={lockingRevision}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 shrink-0"
          >
            {lockingRevision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Mulai Edit
          </button>
        </div>
      )}

      {/* Banner: sedang dalam mode revision */}
      {isRevisionMode && !needsLockBeforeEdit && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-300 bg-sky-50 px-5 py-4">
          <span className="text-xl">✏️</span>
          <div className="flex-1">
            <p className="font-semibold text-sky-800 text-sm">Mode Edit Aktif</p>
            <p className="text-sky-700 text-sm mt-0.5">
              Assessment sedang dikunci. Kecamatan yang baru tidak dapat memulai pengisian. Kecamatan yang sedang mengisi dapat menyelesaikan pengisian dengan versi lama, lalu akan diminta revisi setelah Anda publish.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={lockingRevision || saving}
            className="flex items-center gap-2 rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 hover:bg-sky-100 disabled:opacity-50 shrink-0"
          >
            {lockingRevision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            Batalkan Edit
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        )}>
          {result.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}

      {/* Auto save indicator (hanya untuk DRAFT) */}
      {assessment.status === 'DRAFT' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {autoSaving
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan draft otomatis...</>
            : autoSaved
              ? <><CheckCircle className="w-3 h-3 text-green-500" /> <span className="text-green-600">Draft tersimpan otomatis</span></>
              : <><span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" /> Draft disimpan otomatis saat ada perubahan</>
          }
        </div>
      )}

      {/* Info dasar */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          Informasi Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255}
              disabled={formDisabled}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periode <span className="text-red-500">*</span></label>
            <input type="text" value={periode} onChange={(e) => setPeriode(e.target.value)} maxLength={20}
              disabled={formDisabled}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
              disabled={formDisabled}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
              disabled={formDisabled}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* Kategori */}
      {categories.map((cat) => (
        <div key={cat.tempId} className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between bg-sky-600 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">{cat.code}</span>
              <input type="text" value={cat.name} onChange={(e) => updateCategory(cat.tempId, 'name', e.target.value)}
                placeholder="Nama kategori..." maxLength={255}
                disabled={formDisabled}
                className="bg-transparent border-b border-white/40 text-white placeholder:text-white/60 text-sm font-medium focus:outline-none focus:border-white w-72 disabled:cursor-not-allowed disabled:opacity-70" />
            </div>
            <button type="button" onClick={() => removeCategory(cat.tempId)} disabled={categories.length === 1 || formDisabled}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <Trash2 className="w-3 h-3" /> Hapus
            </button>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-[32px_1fr_auto] gap-2 px-1 text-xs font-semibold text-gray-500 mb-1">
              <span className="text-center">No</span><span>Indikator</span><span />
            </div>
            {cat.indicators.map((ind) => (
              <div key={ind.tempId} className="grid grid-cols-[32px_1fr_auto] gap-2 items-start">
                <div className="flex items-center justify-center pt-2.5">
                  <span className="text-sm font-medium text-gray-500">{ind.number}</span>
                </div>
                <textarea value={ind.indicator} onChange={(e) => updateIndicator(cat.tempId, ind.tempId, 'indicator', e.target.value)}
                  placeholder="Tuliskan indikator penilaian..." rows={2} maxLength={2000}
                  disabled={formDisabled}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
                <button type="button" onClick={() => removeIndicator(cat.tempId, ind.tempId)}
                  disabled={cat.indicators.length === 1 || formDisabled}
                  className="mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addIndicator(cat.tempId)}
              disabled={formDisabled}
              className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500">
              <Plus className="w-3.5 h-3.5" /> Tambah Indikator
            </button>
          </div>
        </div>
      ))}

      {!formDisabled && (
        <button type="button" onClick={addCategory}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-4 text-sm font-medium text-gray-500 hover:border-sky-400 hover:text-sky-600 w-full justify-center">
          <FolderPlus className="w-4 h-4" /> Tambah Kategori Baru
        </button>
      )}

      
      {!formDisabled && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
          {status === 'PUBLISHED' && (
            <button type="button" onClick={() => { setStatus('ARCHIVED') }}
              className="flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 mr-auto">
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          )}

          
          <button
            type="button"
            disabled={saving || isPublishing}
            onClick={() => handleSave()}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {(saving || isPublishing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPublishing ? 'Publishing...' : 'Simpan Perubahan'}
          </button>
        </div>
      )}
    </div>
  )
}