'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faTrash,
  faFloppyDisk,
  faPaperPlane,
  faSpinner,
  faCheckCircle,
  faTriangleExclamation,
  faGripVertical,
  faFolderPlus,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

let tempCounter = 0
const uid = () => `tmp_${++tempCounter}`

const newIndicator = (number: number): IndicatorRow => ({
  tempId: uid(),
  number,
  indicator: '',
  maxScore: 4,
})

const newCategory = (order: number): CategoryBlock => ({
  tempId: uid(),
  code: String.fromCharCode(65 + order), // A, B, C, ...
  name: '',
  description: '',
  order,
  indicators: [newIndicator(1)],
})

// ─── Sub-components ───────────────────────────────────────────────────────────

function IndicatorRows({
  indicators,
  catTempId,
  onChange,
  onAdd,
  onRemove,
}: {
  indicators: IndicatorRow[]
  catTempId: string
  onChange: (catId: string, indTempId: string, field: keyof IndicatorRow, value: string | number) => void
  onAdd: (catId: string) => void
  onRemove: (catId: string, indTempId: string) => void
}) {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-[32px_1fr_auto] gap-2 px-2 mb-1">
        <span className="text-xs font-semibold text-gray-500 text-center">No</span>
        <span className="text-xs font-semibold text-gray-500">Indikator</span>
        <span />
      </div>

      <div className="flex flex-col gap-2">
        {indicators.map((ind) => (
          <div key={ind.tempId} className="grid grid-cols-[32px_1fr_auto] gap-2 items-start">
            {/* Nomor */}
            <div className="flex items-center justify-center pt-2">
              <span className="text-sm font-medium text-gray-500">{ind.number}</span>
            </div>

            {/* Indikator text */}
            <textarea
              value={ind.indicator}
              onChange={(e) => onChange(catTempId, ind.tempId, 'indicator', e.target.value)}
              placeholder="Tuliskan indikator penilaian..."
              rows={2}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(catTempId, ind.tempId)}
              disabled={indicators.length === 1}
              className="mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Hapus indikator"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add indicator */}
      <button
        type="button"
        onClick={() => onAdd(catTempId)}
        className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors w-full justify-center"
      >
        <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
        Tambah Indikator
      </button>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function CreateAssessmentForm() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [periode, setPeriode] = useState(String(new Date().getFullYear()))
  const [categories, setCategories] = useState<CategoryBlock[]>([newCategory(0)])
  const [submitting, setSubmitting] = useState(false)
  const [submitType, setSubmitType] = useState<'draft' | 'publish' | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Category handlers ──────────────────────────────────────

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      newCategory(prev.length),
    ])
  }

  const removeCategory = (catTempId: string) => {
    setCategories((prev) =>
      prev
        .filter((c) => c.tempId !== catTempId)
        .map((c, i) => ({ ...c, order: i, code: String.fromCharCode(65 + i) }))
    )
  }

  const updateCategory = (catTempId: string, field: keyof CategoryBlock, value: string | number) => {
    setCategories((prev) =>
      prev.map((c) => (c.tempId === catTempId ? { ...c, [field]: value } : c))
    )
  }

  // ── Indicator handlers ─────────────────────────────────────

  const addIndicator = (catTempId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.tempId !== catTempId) return c
        return {
          ...c,
          indicators: [...c.indicators, newIndicator(c.indicators.length + 1)],
        }
      })
    )
  }

  const removeIndicator = (catTempId: string, indTempId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.tempId !== catTempId) return c
        const filtered = c.indicators
          .filter((i) => i.tempId !== indTempId)
          .map((i, idx) => ({ ...i, number: idx + 1 }))
        return { ...c, indicators: filtered }
      })
    )
  }

  const updateIndicator = (
    catTempId: string,
    indTempId: string,
    field: keyof IndicatorRow,
    value: string | number
  ) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.tempId !== catTempId) return c
        return {
          ...c,
          indicators: c.indicators.map((i) =>
            i.tempId === indTempId ? { ...i, [field]: value } : i
          ),
        }
      })
    )
  }

  // ── Validation ─────────────────────────────────────────────

  const validate = () => {
    if (!title.trim()) return 'Judul assessment wajib diisi.'
    if (!periode.trim()) return 'Periode wajib diisi.'
    for (const cat of categories) {
      if (!cat.name.trim()) return `Nama kategori "${cat.code}" wajib diisi.`
      for (const ind of cat.indicators) {
        if (!ind.indicator.trim()) return `Indikator nomor ${ind.number} di kategori "${cat.code}" belum diisi.`
      }
    }
    return null
  }

  // ── Submit ─────────────────────────────────────────────────

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    setResult(null)
    const err = validate()
    if (err) {
      setResult({ type: 'error', message: err })
      return
    }

    setSubmitting(true)
    setSubmitType(status === 'DRAFT' ? 'draft' : 'publish')

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          periode: periode.trim(),
          status,
          categories: categories.map((cat) => ({
            code: cat.code,
            name: cat.name.trim(),
            description: cat.description.trim() || undefined,
            order: cat.order,
            indicators: cat.indicators.map((ind) => ({
              number: ind.number,
              indicator: ind.indicator.trim(),
              maxScore: ind.maxScore,
            })),
          })),
        }),
      })

      const json = await res.json()

      if (res.ok) {
        setResult({
          type: 'success',
          message: status === 'DRAFT'
            ? 'Assessment berhasil disimpan sebagai draft.'
            : 'Assessment berhasil dipublikasikan.',
        })
        // Redirect ke list assessment setelah 1.5 detik
        setTimeout(() => router.push('/admin/assessment/create'), 1500)
      } else {
        setResult({ type: 'error', message: json.error ?? 'Gagal menyimpan assessment.' })
      }
    } catch {
      setResult({ type: 'error', message: 'Terjadi kesalahan jaringan. Coba lagi.' })
    } finally {
      setSubmitting(false)
      setSubmitType(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
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

      {/* ── Info Dasar ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FontAwesomeIcon icon={faGripVertical} className="w-4 h-4 text-gray-400" />
          Informasi Assessment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Judul */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul Assessment <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="contoh: Self Assessment Desa 2025"
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          {/* Periode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              placeholder="contoh: 2025 atau 2025-Q1"
              maxLength={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat assessment..."
              maxLength={2000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>
        </div>
      </div>

      {/* ── Kategori + Indikator ── */}
      {categories.map((cat) => (
        <div key={cat.tempId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Category header */}
          <div className="flex items-center justify-between bg-sky-600 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {cat.code}
              </span>
              <input
                type="text"
                value={cat.name}
                onChange={(e) => updateCategory(cat.tempId, 'name', e.target.value)}
                placeholder="Nama kategori..."
                maxLength={255}
                className="bg-transparent border-b border-white/40 text-white placeholder:text-white/60 text-sm font-medium focus:outline-none focus:border-white w-72"
              />
            </div>
            <button
              type="button"
              onClick={() => removeCategory(cat.tempId)}
              disabled={categories.length === 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              Hapus Kategori
            </button>
          </div>

          {/* Category description */}
          <div className="px-6 pt-4 pb-2">
            <input
              type="text"
              value={cat.description}
              onChange={(e) => updateCategory(cat.tempId, 'description', e.target.value)}
              placeholder="Deskripsi kategori (opsional)..."
              maxLength={2000}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          {/* Indicators */}
          <div className="px-6 pb-6">
            <IndicatorRows
              indicators={cat.indicators}
              catTempId={cat.tempId}
              onChange={updateIndicator}
              onAdd={addIndicator}
              onRemove={removeIndicator}
            />
          </div>
        </div>
      ))}

      {/* Add category */}
      <button
        type="button"
        onClick={addCategory}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-4 text-sm font-medium text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors w-full justify-center"
      >
        <FontAwesomeIcon icon={faFolderPlus} className="w-4 h-4" />
        Tambah Kategori Baru
      </button>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
        <p className="text-xs text-gray-400 mr-auto">
          Draft: tersimpan tapi belum aktif. Publish: langsung bisa digunakan.
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
          onClick={() => handleSave('PUBLISHED')}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
        >
          {submitting && submitType === 'publish' ? (
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
          )}
          Publish Assessment
        </button>
      </div>
    </div>
  )
}
