'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPenToSquare, faCheckDouble,
  faChevronLeft, faChevronRight,
  faCircleCheck, faXmark, faRotateLeft,
} from '@fortawesome/free-solid-svg-icons'

type SubmissionEvent = {
  type: 'submission'
  at: string // ISO string — Date tidak serializable dari server ke client
  kecamatan: string
  kabupaten: string | null
  periode: string
  assessmentTitle: string
}

type ValidationEvent = {
  type: 'validation'
  at: string
  validator: string
  kecamatan: string
  status: 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED'
}

export type ActivityItem = SubmissionEvent | ValidationEvent

const VALIDATION_CFG = {
  APPROVED:        { label: 'Disetujui',    icon: faCircleCheck, dot: 'bg-green-500' },
  REJECTED:        { label: 'Ditolak',      icon: faXmark,       dot: 'bg-red-500'   },
  REVISION_NEEDED: { label: 'Perlu Revisi', icon: faRotateLeft,  dot: 'bg-amber-500' },
} as const

function formatRelative(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'Baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d} hari lalu`
  return new Date(isoStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const PAGE_SIZE = 5

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col">
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-400">Belum ada aktivitas.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {paged.map((item, i) => {
              const timeStr = formatRelative(item.at)

              if (item.type === 'submission') {
                return (
                  <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100">
                      <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 leading-snug">
                        <span className="font-semibold">{item.kecamatan}</span>
                        <span className="text-gray-500"> mengisi assessment</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.assessmentTitle}
                        {item.kabupaten ? ` · ${item.kabupaten}` : ''}
                        {' · '}Periode {item.periode}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap pt-0.5">{timeStr}</span>
                  </li>
                )
              }

              const cfg = VALIDATION_CFG[item.status]
              return (
                <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <FontAwesomeIcon icon={faCheckDouble} className="w-3 h-3 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 leading-snug">
                      <span className="font-semibold">{item.validator}</span>
                      <span className="text-gray-500"> memvalidasi </span>
                      <span className="font-semibold">{item.kecamatan}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap pt-0.5">{timeStr}</span>
                </li>
              )
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-5 py-3">
              <p className="text-xs text-gray-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, items.length)} dari {items.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Halaman sebelumnya"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
                </button>
                <span className="text-xs text-gray-500 px-1">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Halaman berikutnya"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
