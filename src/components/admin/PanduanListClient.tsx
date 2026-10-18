'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faBook, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Loader2 } from 'lucide-react'
import { Pagination } from '@/components/shared/ui/Pagination'
import { toast } from '@/components/ui/toast'

interface RubricItem {
  id: number
  title: string
  assessment: { id: number; title: string; periode: string }
  _count: { items: number }
}

const PAGE_SIZE = 9

export function PanduanListClient({ rubrics: initialRubrics }: { rubrics: RubricItem[] }) {
  const router = useRouter()
  const [rubrics, setRubrics] = useState(initialRubrics)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(rubrics.length / PAGE_SIZE)
  const paged = rubrics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    setConfirmId(null)
    try {
      const res = await fetch(`/api/rubric/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRubrics((prev) => prev.filter((r) => r.id !== id))
        if (paged.length === 1 && page > 1) setPage(page - 1)
        toast.success('Rubrik berhasil dihapus.')
        router.refresh()
      } else {
        const json = await res.json()
        toast.error(json.error ?? 'Gagal menghapus rubrik.')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan.')
    } finally {
      setDeletingId(null)
    }
  }

  if (rubrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
        <FontAwesomeIcon icon={faBook} className="w-14 h-14 text-gray-200 mb-4" />
        <p className="text-gray-500 font-medium">Belum ada panduan rubrik</p>
        <p className="mt-1 text-sm text-gray-400 max-w-xs">
          Buat panduan rubrik untuk membantu kecamatan memahami kriteria penilaian
        </p>
        <Link
          href="/admin/panduan/new"
          className="mt-5 flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          Buat Rubrik Pertama
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paged.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                <FontAwesomeIcon icon={faBook} className="w-3 h-3" />
                Rubrik
              </span>
              <span className="text-xs text-gray-400">{r.assessment.periode}</span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{r.title}</h3>
            <p className="mt-1 text-xs text-gray-500 line-clamp-1">{r.assessment.title}</p>
            <p className="mt-2 text-xs text-gray-400">{r._count.items} indikator</p>

            {/* Inline confirm dialog */}
            {confirmId === r.id ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-xs text-red-700 font-medium mb-2">Hapus rubrik ini?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="flex-1 flex items-center justify-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ya, hapus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/admin/panduan/${r.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
                  Lihat / Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmId(r.id)}
                  disabled={deletingId === r.id}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
