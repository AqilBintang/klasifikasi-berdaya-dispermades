'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Save, Plus, Trash2, ImageIcon, GripVertical, Layers, Info, Upload, Link2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BannerSlide {
  id: string
  imageUrl: string
  alt: string
}

interface TentangPlatform {
  heading: string
  description: string
  points: string[]
}

interface LandingPageData {
  banner: { slides: BannerSlide[] }
  tentangPlatform: TentangPlatform
}

interface Props {
  initialData: LandingPageData
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 transition-colors'

// ─── Tab slugs ────────────────────────────────────────────────────────────────

type Tab = 'banner' | 'tentang'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'banner',  label: 'Banner',           icon: <Layers   className="size-4" /> },
  { id: 'tentang', label: 'Tentang Platform', icon: <Info     className="size-4" /> },
]

// ─── SlideCard ────────────────────────────────────────────────────────────────
// Komponen terpisah supaya state "mode" (url | upload) per-slide tidak naik ke parent

interface SlideCardProps {
  slide: BannerSlide
  idx: number
  onUpdate: <K extends keyof BannerSlide>(key: K, val: BannerSlide[K]) => void
  onRemove: () => void
}

function SlideCard({ slide, idx, onUpdate, onRemove }: SlideCardProps) {
  const [mode, setMode]         = useState<'url' | 'upload'>(slide.imageUrl ? 'url' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/landing-page/upload', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok) throw new Error(json.error ?? 'Upload gagal')

      onUpdate('imageUrl', json.url!)
      setMode('url') // setelah upload berhasil, tampilkan URL-nya di input teks
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
      // reset supaya file yang sama bisa di-upload lagi kalau perlu
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex gap-3 items-start">
        {/* Drag handle — visual only */}
        <GripVertical className="mt-1 size-4 shrink-0 text-gray-300 cursor-grab" aria-hidden="true" />

        {/* Preview thumbnail */}
        <div className="shrink-0 w-24 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
          {slide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.imageUrl} alt={slide.alt || ''} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-gray-300" aria-hidden="true" />
          )}
        </div>

        {/* Right side: mode toggle + alt + remove */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setMode('url')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                mode === 'url'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Link2 className="size-3" />
              URL
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                mode === 'upload'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Upload className="size-3" />
              Upload
            </button>
          </div>

          {/* URL input */}
          {mode === 'url' && (
            <div className="flex items-center gap-2">
              <input
                id={`slide-url-${idx}`}
                type="text"
                value={slide.imageUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate('imageUrl', e.target.value)}
                placeholder="https://… atau /banners/banner-1.jpg"
                className={inputCls}
              />
              {slide.imageUrl && (
                <button
                  type="button"
                  onClick={() => onUpdate('imageUrl', '')}
                  aria-label="Hapus URL gambar"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Upload input */}
          {mode === 'upload' && (
            <div className="space-y-1.5">
              <label
                htmlFor={`slide-file-${idx}`}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm cursor-pointer transition-colors',
                  uploading
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-sky-200 text-sky-600 hover:bg-sky-50'
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Mengunggah…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    <span>Pilih gambar <span className="text-sky-400 font-normal">(JPG/PNG/WebP · 1200×220 px · maks 5 MB)</span></span>
                  </>
                )}
              </label>
              <input
                ref={fileRef}
                id={`slide-file-${idx}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={handleFile}
                className="sr-only"
              />
              {uploadError && (
                <p role="alert" className="text-xs text-red-500">{uploadError}</p>
              )}
              {slide.imageUrl && (
                <p className="text-xs text-gray-400 truncate">
                  Gambar saat ini:{' '}
                  <span className="font-medium text-gray-600">{slide.imageUrl}</span>
                </p>
              )}
            </div>
          )}

          {/* Alt text */}
          <div>
            <label htmlFor={`slide-alt-${idx}`} className="block text-xs font-medium text-gray-500 mb-1">
              Alt text <span className="font-normal text-gray-400">(untuk aksesibilitas)</span>
            </label>
            <input
              id={`slide-alt-${idx}`}
              type="text"
              value={slide.alt}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate('alt', e.target.value)}
              placeholder="Contoh: Banner program unggulan 2025"
              className={inputCls}
            />
          </div>
        </div>

        {/* Remove slide */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus slide ${idx + 1}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ─── LandingPageClient ────────────────────────────────────────────────────────

export function LandingPageClient({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('banner')
  const [slides, setSlides]       = useState<BannerSlide[]>(initialData.banner.slides)
  const [tentang, setTentang]     = useState<TentangPlatform>(initialData.tentangPlatform)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Partial<LandingPageData> =
        activeTab === 'banner'
          ? { banner: { slides } }
          : { tentangPlatform: tentang }

      const res = await fetch('/api/landing-page', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()
      showToast('ok', 'Perubahan berhasil disimpan.')
    } catch {
      showToast('err', 'Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  // ── Banner helpers ──

  function addSlide() {
    setSlides((prev) => [
      ...prev,
      { id: `banner-${Date.now()}`, imageUrl: '', alt: '' },
    ])
  }

  function removeSlide(idx: number) {
    setSlides((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateSlide<K extends keyof BannerSlide>(idx: number, key: K, val: BannerSlide[K]) {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [key]: val } : s))
    )
  }

  // ── Point helpers ──

  function addPoint() {
    setTentang((t) => ({ ...t, points: [...t.points, ''] }))
  }

  function removePoint(idx: number) {
    setTentang((t) => ({ ...t, points: t.points.filter((_, i) => i !== idx) }))
  }

  function updatePoint(idx: number, val: string) {
    setTentang((t) => ({
      ...t,
      points: t.points.map((p, i) => (i === idx ? val : p)),
    }))
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Landing Page</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ubah konten yang tampil di halaman publik.
          </p>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
        >
          <Save className="size-4" />
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={cn(
            'rounded-lg px-4 py-3 text-sm font-medium',
            toast.type === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0" aria-label="Tab navigasi landing page">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Banner ── */}
      {activeTab === 'banner' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-xs text-sky-700 space-y-1.5">
            <div className="mt-1.5 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700">
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              <span>
                Ukuran gambar yang disarankan: <strong>1200 × 220 px</strong> (rasio ±16:3), format JPG atau PNG, maks 5 MB.
                Gambar akan dipotong otomatis jika tidak sesuai rasio.
              </span>
            </div>
          </div>

          {slides.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
              Belum ada slide. Tambahkan slide baru.
            </div>
          )}

          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                idx={idx}
                onUpdate={(key, val) => updateSlide(idx, key, val)}
                onRemove={() => removeSlide(idx)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSlide}
            className="flex items-center gap-2 text-sm"
          >
            <Plus className="size-4" />
            Tambah Slide
          </Button>
        </div>
      )}

      {/* ── Tab: Tentang Platform ── */}
      {activeTab === 'tentang' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Ubah teks di bagian &ldquo;Tentang Platform&rdquo; pada landing page.
          </p>

          {/* Heading */}
          <div className="space-y-1.5">
            <label htmlFor="tentang-heading" className="block text-sm font-medium text-gray-700">
              Judul
            </label>
            <input
              id="tentang-heading"
              type="text"
              value={tentang.heading}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTentang((t) => ({ ...t, heading: e.target.value }))
              }
              placeholder="Apa itu Klasifikasi Berdaya?"
              className={cn(inputCls, 'max-w-xl')}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="tentang-desc" className="block text-sm font-medium text-gray-700">
              Deskripsi
            </label>
            <textarea
              id="tentang-desc"
              value={tentang.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setTentang((t) => ({ ...t, description: e.target.value }))
              }
              rows={4}
              className={cn(inputCls, 'max-w-xl resize-none')}
            />
          </div>

          {/* Points */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Poin-poin Utama</p>
            <p className="text-xs text-gray-400">Tampil sebagai daftar bullet di landing page.</p>

            <div className="space-y-2 max-w-xl">
              {tentang.points.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <input
                    type="text"
                    aria-label={`Poin ${idx + 1}`}
                    value={point}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updatePoint(idx, e.target.value)}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removePoint(idx)}
                    aria-label={`Hapus poin ${idx + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addPoint}
              className="flex items-center gap-2 text-sm"
            >
              <Plus className="size-4" />
              Tambah Poin
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
