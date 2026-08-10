'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, ClipboardList, CheckCircle,
  Circle, Archive, Pencil,
  Copy, Calendar,
} from 'lucide-react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'REVISION'

interface AssessmentItem {
  id: number
  title: string
  description: string | null
  periode: string
  status: AssessmentStatus
  categories: {
    id: number
    name: string
    indicators: { id: number }[]
  }[]
}

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',     icon: Circle,   cls: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: 'Published', icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  ARCHIVED:  { label: 'Archived',  icon: Archive,  cls: 'bg-amber-100 text-amber-700' },
  REVISION:  { label: 'Revision',  icon: Pencil,   cls: 'bg-orange-100 text-orange-700' },
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 transition-colors'

// ─── Modal Duplikat ───────────────────────────────────────────────────────────

interface DuplicateModalProps {
  assessment: AssessmentItem
  onClose: () => void
  onSuccess: () => void
}

function DuplicateModal({ assessment, onClose, onSuccess }: DuplicateModalProps) {
  const [periode, setPeriode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!periode.trim()) { setError('Periode wajib diisi'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/assessment/${assessment.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periode: periode.trim() }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setError(json.error ?? 'Gagal menduplikasi'); return }
      onSuccess()
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Duplikat Assessment</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700">
            <p className="font-medium">{assessment.title}</p>
            <p className="text-xs text-sky-500 mt-0.5">
              {assessment.categories.length} kategori ·{' '}
              {assessment.categories.reduce((s, c) => s + c.indicators.length, 0)} indikator
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Semua kategori dan indikator akan disalin ke assessment baru dengan status <strong>Draft</strong>.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="dup-periode" className="block text-sm font-medium text-gray-700">
              Periode Baru
            </label>
            <input
              id="dup-periode"
              type="text"
              value={periode}
              onChange={(e) => { setPeriode(e.target.value); setError('') }}
              placeholder={`contoh: ${new Date().getFullYear() + 1}`}
              className={inputCls}
              autoFocus
            />
            {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                loading ? 'bg-sky-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'
              )}
            >
              {loading
                ? <Loader2 className="size-4 animate-spin" />
                : <Copy className="w-3.5 h-3.5" />}
              {loading ? 'Menduplikat…' : 'Duplikat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function CreateAssessmentListClient({ assessments }: { assessments: AssessmentItem[] }) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState<AssessmentItem | null>(null)

  function handleSuccess() {
    setDuplicating(null)
    router.refresh()
  }

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
        <ClipboardList className="w-14 h-14 text-gray-200 mb-4" />
        <p className="text-gray-500 font-medium">Belum ada assessment</p>
        <p className="mt-1 text-sm text-gray-400 max-w-xs">
          Buat template assessment pertama untuk mulai mengelola penilaian kecamatan
        </p>
        <Link
          href="/admin/assessment/create/new"
          className="mt-5 flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Buat Assessment Pertama
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {assessments.map((a) => {
          const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.DRAFT
          const totalIndicators = a.categories.reduce((s, c) => s + c.indicators.length, 0)

          return (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Status + periode */}
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {a.periode}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 leading-snug">{a.title}</h3>
              {a.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.description}</p>
              )}

              {/* Meta */}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <span>{a.categories.length} kategori</span>
                <span>·</span>
                <span>{totalIndicators} indikator</span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/admin/assessment/${a.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Detail / Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setDuplicating(a)}
                  title="Duplikat ke periode baru"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Duplikat
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {duplicating && (
        <DuplicateModal
          assessment={duplicating}
          onClose={() => setDuplicating(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
