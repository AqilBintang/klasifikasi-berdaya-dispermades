'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2,
  AlertTriangle, FolderPlus,
  ArrowRight, ArrowLeft, Eye, Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import type { ScoringRuleEntry } from '@/types/assessment'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndicatorRow { tempId: string; number: number; indicator: string; maxScore: number }
interface CategoryBlock {
  tempId: string; code: string; name: string; description: string; order: number
  indicators: IndicatorRow[]
  scoringRule: ScoringRuleEntry[]
  showScoringRule: boolean
}

let tempCounter = 0
const uid = () => `tmp_${++tempCounter}`
const newIndicator = (n: number): IndicatorRow => ({ tempId: uid(), number: n, indicator: '', maxScore: 4 })
const newCategory  = (order: number): CategoryBlock => ({
  tempId: uid(), code: String.fromCharCode(65 + order), name: '', description: '', order,
  indicators: [newIndicator(1)],
  scoringRule: [],
  showScoringRule: false,
})

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Isi Assessment' },
    { n: 2, label: 'Review & Konfirmasi' },
  ]
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className={cn(
            'flex items-center gap-2 text-sm font-semibold',
            step === s.n ? 'text-sky-700' : step > s.n ? 'text-green-600' : 'text-gray-400'
          )}>
            <span className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2',
              step === s.n ? 'bg-sky-600 border-sky-600 text-white' :
              step > s.n  ? 'bg-green-500 border-green-500 text-white' :
                            'bg-white border-gray-300 text-gray-400'
            )}>
              {step > s.n ? '✓' : s.n}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-3', step > 1 ? 'bg-green-400' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Indicator rows ───────────────────────────────────────────────────────────

function IndicatorRows({ indicators, catTempId, onChange, onAdd, onRemove }: {
  indicators: IndicatorRow[]; catTempId: string
  onChange: (cId: string, iId: string, f: keyof IndicatorRow, v: string | number) => void
  onAdd: (cId: string) => void; onRemove: (cId: string, iId: string) => void
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
            <div className="flex items-center justify-center pt-2">
              <span className="text-sm font-medium text-gray-500">{ind.number}</span>
            </div>
            <textarea
              value={ind.indicator}
              onChange={(e) => onChange(catTempId, ind.tempId, 'indicator', e.target.value)}
              placeholder="Tuliskan indikator penilaian..."
              rows={2} maxLength={2000}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
            <button type="button" onClick={() => onRemove(catTempId, ind.tempId)}
              disabled={indicators.length === 1}
              className="mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onAdd(catTempId)}
        className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors w-full justify-center">
        <Plus className="w-3.5 h-3.5" /> Tambah Indikator
      </button>
    </div>
  )
}

// ─── Scoring Rule Editor ──────────────────────────────────────────────────────

function ScoringRuleEditor({ rules, onChange }: {
  rules: ScoringRuleEntry[]
  onChange: (rules: ScoringRuleEntry[]) => void
}) {
  const updateRule = (idx: number, field: keyof ScoringRuleEntry, value: string) => {
    const next = rules.map((r, i) => {
      if (i !== idx) return r
      if (field === 'max') {
        const n = parseInt(value, 10)
        return { ...r, max: isNaN(n) ? undefined : n }
      }
      return { ...r, label: value }
    })
    onChange(next)
  }

  const addRule    = () => onChange([...rules, { label: '' }])
  const removeRule = (idx: number) => onChange(rules.filter((_, i) => i !== idx))

  return (
    <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-amber-800">Aturan Penilaian Kategori</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Tentukan label klasifikasi berdasarkan total skor. Baris terakhir tanpa batas maks = fallback.
          </p>
        </div>
      </div>

      {rules.length > 0 && (
        <div className="mb-2">
          <div className="grid grid-cols-[80px_1fr_32px] gap-2 px-1 mb-1">
            <span className="text-xs text-gray-400 font-medium">Skor maks</span>
            <span className="text-xs text-gray-400 font-medium">Label klasifikasi</span>
            <span />
          </div>
          <div className="flex flex-col gap-2">
            {rules.map((rule, idx) => (
              <div key={idx} className="grid grid-cols-[80px_1fr_32px] gap-2 items-center">
                <input
                  type="number" min={0}
                  value={rule.max ?? ''}
                  onChange={(e) => updateRule(idx, 'max', e.target.value)}
                  placeholder="—"
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                <input
                  type="text"
                  value={rule.label}
                  onChange={(e) => updateRule(idx, 'label', e.target.value)}
                  placeholder={idx === rules.length - 1 ? 'contoh: Berdaya (fallback)' : 'contoh: Rintisan'}
                  maxLength={100}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                <button type="button" onClick={() => removeRule(idx)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={addRule}
        className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 transition-colors">
        <Plus className="w-3 h-3" /> Tambah threshold
      </button>
    </div>
  )
}

// ─── Review step ──────────────────────────────────────────────────────────────

function ReviewStep({ title, description, periode, categories }: {
  title: string; description: string; periode: string; categories: CategoryBlock[]
}) {
  const totalIndicators = categories.reduce((s, c) => s + c.indicators.length, 0)
  return (
    <div className="space-y-5">
      {/* Info dasar */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
        <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-3">Informasi Assessment</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Judul</p>
            <p className="font-semibold text-gray-900">{title}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Periode</p>
            <p className="font-semibold text-gray-900">{periode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total</p>
            <p className="font-semibold text-gray-900">{categories.length} kategori · {totalIndicators} indikator</p>
          </div>
          {description && (
            <div className="sm:col-span-3">
              <p className="text-xs text-gray-500 mb-0.5">Deskripsi</p>
              <p className="text-gray-700">{description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Daftar kategori + indikator */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.tempId} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-3 bg-gray-800 px-5 py-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">{cat.code}</span>
              <div>
                <p className="text-sm font-semibold text-white">{cat.name}</p>
                {cat.description && <p className="text-xs text-gray-300">{cat.description}</p>}
              </div>
              <span className="ml-auto text-xs text-gray-400">{cat.indicators.length} indikator</span>
            </div>
            <ol className="divide-y divide-gray-100">
              {cat.indicators.map((ind) => (
                <li key={ind.tempId} className="flex gap-3 px-5 py-3 text-sm">
                  <span className="text-xs font-semibold text-gray-400 w-6 shrink-0 pt-0.5">{ind.number}.</span>
                  <span className="text-gray-700 leading-relaxed">{ind.indicator}</span>
                </li>
              ))}
            </ol>
            {cat.scoringRule.length > 0 && (
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-2">Aturan Penilaian</p>
                <div className="flex flex-wrap gap-2">
                  {cat.scoringRule.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-xs text-amber-800">
                      {r.max !== undefined ? `≤ ${r.max}` : 'else'} → {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ titre, periode, onConfirm, onCancel, saving }: {
  titre: string; periode: string; saving: boolean
  onConfirm: (status: 'DRAFT' | 'PUBLISHED') => void; onCancel: () => void
}) {
  const [choice, setChoice] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-amber-100 p-2">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900">Konfirmasi Akhir</h3>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Anda akan membuat assessment <strong className="text-gray-800">"{titre}"</strong> untuk periode <strong className="text-gray-800">{periode}</strong>.
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Pilih status */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Simpan sebagai</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setChoice('DRAFT')}
                className={cn('rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-colors',
                  choice === 'DRAFT' ? 'border-gray-700 bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                <p className="font-semibold">Draft</p>
                <p className="text-xs font-normal text-gray-400 mt-0.5">Tersimpan, belum aktif untuk kecamatan</p>
              </button>
              <button type="button" onClick={() => setChoice('PUBLISHED')}
                className={cn('rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-colors',
                  choice === 'PUBLISHED' ? 'border-sky-600 bg-sky-50 text-sky-900' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                <p className="font-semibold">Publish</p>
                <p className="text-xs font-normal text-gray-400 mt-0.5">Langsung aktif, kecamatan bisa mengisi</p>
              </button>
            </div>
          </div>

          {/* Peringatan publish */}
          {choice === 'PUBLISHED' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              Setelah assessment diisi oleh kecamatan, <strong>konten tidak dapat diubah</strong>. Pastikan semua indikator sudah benar.
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Kembali
          </button>
          <button type="button" onClick={() => onConfirm(choice)} disabled={saving}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50',
              choice === 'PUBLISHED' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-gray-700 hover:bg-gray-800'
            )}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {choice === 'PUBLISHED' ? 'Ya, Publish Sekarang' : 'Simpan sebagai Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function CreateAssessmentForm() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)
  const [showConfirm, setShowConfirm] = useState(false)

  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [periode, setPeriode]         = useState(String(new Date().getFullYear()))
  const [categories, setCategories]   = useState<CategoryBlock[]>([newCategory(0)])

  const [saving, setSaving]       = useState(false)
  const [checking, setChecking]   = useState(false)

  // ── Category handlers ──────────────────────────────────────

  const addCategory    = () => setCategories((p) => [...p, newCategory(p.length)])
  const removeCategory = (id: string) => setCategories((p) =>
    p.filter((c) => c.tempId !== id).map((c, i) => ({ ...c, order: i, code: String.fromCharCode(65 + i) }))
  )
  const updateCategory = (id: string, f: keyof CategoryBlock, v: string | number | boolean | ScoringRuleEntry[]) =>
    setCategories((p) => p.map((c) => c.tempId === id ? { ...c, [f]: v } : c))

  const toggleScoringRule = (id: string) =>
    setCategories((p) => p.map((c) => c.tempId === id ? { ...c, showScoringRule: !c.showScoringRule } : c))

  const addIndicator    = (cId: string) => setCategories((p) => p.map((c) =>
    c.tempId !== cId ? c : { ...c, indicators: [...c.indicators, newIndicator(c.indicators.length + 1)] }
  ))
  const removeIndicator = (cId: string, iId: string) => setCategories((p) => p.map((c) => {
    if (c.tempId !== cId) return c
    const filtered = c.indicators.filter((i) => i.tempId !== iId).map((i, idx) => ({ ...i, number: idx + 1 }))
    return { ...c, indicators: filtered }
  }))
  const updateIndicator = (cId: string, iId: string, f: keyof IndicatorRow, v: string | number) =>
    setCategories((p) => p.map((c) =>
      c.tempId !== cId ? c : { ...c, indicators: c.indicators.map((i) => i.tempId === iId ? { ...i, [f]: v } : i) }
    ))

  // ── Validate ───────────────────────────────────────────────

  const validate = (): string | null => {
    if (!title.trim()) return 'Judul assessment wajib diisi.'
    if (!periode.trim()) return 'Periode wajib diisi.'
    if (!/^\d{4}$/.test(periode.trim())) return 'Periode harus berupa 4 digit tahun (contoh: 2026).'
    for (const cat of categories) {
      if (!cat.name.trim()) return `Nama kategori "${cat.code}" wajib diisi.`
      for (const ind of cat.indicators) {
        if (!ind.indicator.trim()) return `Indikator nomor ${ind.number} di kategori "${cat.code}" belum diisi.`
      }
    }
    return null
  }

  // ── Step 1 → Step 2 ────────────────────────────────────────

  const goToReview = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    setChecking(true)
    try {
      const res = await fetch(`/api/assessment?checkPeriode=${encodeURIComponent(periode.trim())}`)
      const json = await res.json()
      const exists = (json.data ?? []).some((a: { periode: string }) => a.periode === periode.trim())
      if (exists) {
        toast.error(`Assessment untuk periode "${periode.trim()}" sudah ada. Hanya boleh 1 assessment per periode.`)
        return
      }
    } catch {
      // Gagal cek — tetap lanjut, API akan tolak saat submit
    } finally {
      setChecking(false)
    }

    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Step 2 → Submit ────────────────────────────────────────

  const handleConfirm = async (status: 'DRAFT' | 'PUBLISHED') => {
    setSaving(true)
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
            scoringRule: cat.scoringRule.length > 0 ? cat.scoringRule : null,
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
        setShowConfirm(false)
        toast.success(status === 'DRAFT' ? 'Assessment berhasil disimpan sebagai draft.' : 'Assessment berhasil dipublikasikan.')
        setTimeout(() => router.push('/admin/assessment/create'), 800)
      } else {
        setShowConfirm(false)
        toast.error(json.error ?? 'Gagal menyimpan assessment.')
      }
    } catch {
      setShowConfirm(false)
      toast.error('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {showConfirm && (
        <ConfirmModal
          titre={title} periode={periode} saving={saving}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <StepBar step={step} />

      {/* ── STEP 1: Form ── */}
      {step === 1 && (
        <>
          {/* Info dasar */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800">Informasi Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Assessment <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="contoh: Self Assessment Kecamatan Berdaya 2026"
                  maxLength={255}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periode <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-400 font-normal">(4 digit tahun, 1 assessment per tahun)</span>
                </label>
                <input type="text" value={periode} onChange={(e) => setPeriode(e.target.value)}
                  placeholder="2026" maxLength={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat assessment..." maxLength={2000}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
              </div>
            </div>
          </div>

          {/* Kategori */}
          {categories.map((cat) => (
            <div key={cat.tempId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-sky-600 px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">{cat.code}</span>
                  <input type="text" value={cat.name} onChange={(e) => updateCategory(cat.tempId, 'name', e.target.value)}
                    placeholder="Nama kategori..." maxLength={255}
                    className="bg-transparent border-b border-white/40 text-white placeholder:text-white/60 text-sm font-medium focus:outline-none focus:border-white w-72" />
                </div>
                <button type="button" onClick={() => removeCategory(cat.tempId)} disabled={categories.length === 1}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-3 h-3" /> Hapus Kategori
                </button>
              </div>
              <div className="px-6 pt-4 pb-2">
                <input type="text" value={cat.description} onChange={(e) => updateCategory(cat.tempId, 'description', e.target.value)}
                  placeholder="Deskripsi kategori (opsional)..." maxLength={2000}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20" />
              </div>
              <div className="px-6 pb-6">
                <IndicatorRows indicators={cat.indicators} catTempId={cat.tempId}
                  onChange={updateIndicator} onAdd={addIndicator} onRemove={removeIndicator} />

                {/* Scoring Rule toggle */}
                <div className="mt-4">
                  <button type="button"
                    onClick={() => toggleScoringRule(cat.tempId)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-700 transition-colors">
                    {cat.showScoringRule
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                    Aturan penilaian kategori
                    {cat.scoringRule.length > 0 && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {cat.scoringRule.length} threshold
                      </span>
                    )}
                  </button>
                  {cat.showScoringRule && (
                    <ScoringRuleEditor
                      rules={cat.scoringRule}
                      onChange={(rules) => updateCategory(cat.tempId, 'scoringRule', rules)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addCategory}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-4 text-sm font-medium text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors w-full justify-center">
            <FolderPlus className="w-4 h-4" /> Tambah Kategori Baru
          </button>

          {/* Next */}
          <div className="flex justify-end rounded-xl border bg-white px-6 py-4 shadow-sm">
            <button type="button" onClick={goToReview} disabled={checking}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-60">
              {checking
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Eye className="w-4 h-4" />}
              {checking ? 'Mengecek...' : 'Review Assessment'}
              {!checking && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 2: Review ── */}
      {step === 2 && (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Periksa kembali seluruh isi assessment.</p>
              <p className="mt-0.5 text-amber-700">Setelah diisi oleh kecamatan, assessment <strong>tidak dapat diubah</strong>. Pastikan semua indikator sudah benar sebelum melanjutkan.</p>
            </div>
          </div>

          <ReviewStep title={title} description={description} periode={periode} categories={categories} />

          <div className="flex items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
            <button type="button" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali Edit
            </button>
            <button type="button" onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors">
              <Shield className="w-4 h-4" />
              Konfirmasi & Simpan
            </button>
          </div>
        </>
      )}
    </div>
  )
}
