'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faClipboardList, faCheckCircle,
  faCircleDot, faBoxArchive, faPencil,
} from '@fortawesome/free-solid-svg-icons'
import { Pagination } from '@/components/shared/ui/Pagination'

type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

interface AssessmentItem {
  id: number
  title: string
  description: string | null
  periode: string
  status: AssessmentStatus
  categories: {
    id: number
    name: string
    _count: { indicators: number } | null
  }[]
}

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',     icon: faCircleDot,   class: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: 'Published', icon: faCheckCircle, class: 'bg-green-100 text-green-700' },
  ARCHIVED:  { label: 'Archived',  icon: faBoxArchive,  class: 'bg-amber-100 text-amber-700' },
}

const PAGE_SIZE = 9

export function AssessmentListClient({ assessments }: { assessments: AssessmentItem[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(assessments.length / PAGE_SIZE)
  const paged = assessments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
        <FontAwesomeIcon icon={faClipboardList} className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Belum ada assessment</p>
        <p className="mt-1 text-sm text-gray-400">Buat assessment baru untuk mulai mengelola penilaian desa</p>
        <Link
          href="/admin/assessment/create"
          className="mt-4 flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          Buat Assessment Pertama
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paged.map((a) => {
          const statusCfg = STATUS_CONFIG[a.status]
          const totalIndicators = a.categories.reduce(
            (sum, cat) => sum + (cat._count?.indicators ?? 0),
            0
          )
          return (
            <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Status badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.class}`}>
                  <FontAwesomeIcon icon={statusCfg.icon} className="w-3 h-3" />
                  {statusCfg.label}
                </span>
                <span className="text-xs text-gray-400">Periode: {a.periode}</span>
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
              <div className="mt-4">
                <Link
                  href={`/admin/assessment/${a.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full"
                >
                  <FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
                  Detail / Edit
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
