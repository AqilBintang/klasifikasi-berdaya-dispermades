'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faTrash,
  faFloppyDisk,
  faSpinner,
  faCheckCircle,
  faTriangleExclamation,
  faFolderPlus,
  faGripVertical,
  faBoxArchive,
} from '@fortawesome/free-solid-svg-icons'
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
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
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

export function EditAssessmentForm({ assessment }: { assessment: AssessmentData }) {
  const router = useRouter()
  const [title, setTitle] = useState(assessment.title)
  const [description, setDescription] = useState(assessment.description ?? '')
  const [periode, setPeriode] = useState(assessment.periode)
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(assessment.status)
  const [categories, setCategories] = useState<CategoryBlock[]>(
    assessment.categories.map(toBlock)
  )
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

  const handleSave = async () => {
    if (!title.trim()) { setResult({ type: 'error', message: 'Judul wajib diisi.' }); return }
    for (const cat of categories) {
      if (!cat.name.trim()) { setResult({ type: 'error', message: `Nama kategori "${cat.code}" wajib diisi.` }); return }
      for (const ind of cat.indicators) {
        if (!ind.indicator.trim()) { setResult({ type: 'error', message: `Indikator nomor ${ind.number} di kategori "${cat.code}" belum diisi.` }); return }
      }
    }

    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/assessment/${assessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          periode: periode.trim(),
          status,
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
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult({ type: 'success', message: 'Assessment berhasil disimpan.' })
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

  return (
    <div className="space-y-6">
      {/* Result */}
      {result && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        )}>
          <FontAwesomeIcon icon={result.type === 'success' ? faCheckCircle : faTriangleExclamation} className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      {/* Info dasar */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FontAwesomeIcon icon={faGripVertical} className="w-4 h-4 text-gray-400" />
          Informasi Assessment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periode <span className="text-red-500">*</span></label>
            <input type="text" value={periode} onChange={(e) => setPeriode(e.target.value)} maxLength={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
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
                className="bg-transparent border-b border-white/40 text-white placeholder:text-white/60 text-sm font-medium focus:outline-none focus:border-white w-72" />
            </div>
            <button type="button" onClick={() => removeCategory(cat.tempId)} disabled={categories.length === 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" /> Hapus
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
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
                <button type="button" onClick={() => removeIndicator(cat.tempId, ind.tempId)}
                  disabled={cat.indicators.length === 1}
                  className="mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
                  <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addIndicator(cat.tempId)}
              className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 w-full justify-center">
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" /> Tambah Indikator
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addCategory}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-4 text-sm font-medium text-gray-500 hover:border-sky-400 hover:text-sky-600 w-full justify-center">
        <FontAwesomeIcon icon={faFolderPlus} className="w-4 h-4" /> Tambah Kategori Baru
      </button>

      {/* Action */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 rounded-xl border bg-white px-6 py-4 shadow-sm">
        {status === 'PUBLISHED' && (
          <button type="button" onClick={() => { setStatus('ARCHIVED') }}
            className="flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 mr-auto">
            <FontAwesomeIcon icon={faBoxArchive} className="w-3.5 h-3.5" /> Archive
          </button>
        )}
        <button type="button" disabled={saving} onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {saving ? <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </div>
  )
}
