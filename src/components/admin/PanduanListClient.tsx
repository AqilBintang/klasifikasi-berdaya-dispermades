'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faBook, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons'
import { Pagination } from '@/components/shared/ui/Pagination'

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
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(rubrics.length / PAGE_SIZE)
  const paged = rubrics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Hapus rubrik "${title}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/rubric/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRubrics((prev) => prev.filter((r) => r.id !== id))
        if (paged.length === 1 && page > 1) setPage(page - 1)
        router.refresh()
      } else {
        const json = await res.json()
        alert(json.error ?? 'Gagal menghapus rubrik.')
      }
    } catch {
      alert('Terjadi kesalahan jaringan.')
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
                onClick={() => handleDelete(r.id, r.title)}
                disabled={deletingId === r.id}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
