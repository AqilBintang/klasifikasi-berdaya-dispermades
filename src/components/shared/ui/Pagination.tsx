'use client'

import { cn } from '@/lib/utils'

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: Props) {
  if (totalPages <= 1) return null

  // Show max 5 page buttons, centered around current page
  const delta = 2
  const start = Math.max(1, page - delta)
  const end = Math.min(totalPages, page + delta)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>

      {start > 1 && (
        <>
          <button type="button" onClick={() => onPageChange(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            1
          </button>
          {start > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors',
            p === page
              ? 'border-sky-500 bg-sky-500 font-semibold text-white'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
          <button type="button" onClick={() => onPageChange(totalPages)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>
  )
}
