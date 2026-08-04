'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'
import { Pagination } from '@/components/shared/ui/Pagination'

function KlasifikasiBadge({ level }: { level: KlasifikasiLevel | null }) {
  if (!level) return <span className="text-xs text-gray-400 italic">—</span>
  const cfg = KLASIFIKASI_CONFIG[level]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.emoji} {level}
    </span>
  )
}

interface RekapItem {
  key: string
  userId: number
  assessmentId: number
  user: { kecamatan: string | null; kabupaten: string | null; name: string }
  assessment: { id: number; title: string; periode: string }
  totalScore: number
  maxScore: number
  statusAkhir: KlasifikasiLevel | null
  categories: {
    code: string
    name: string
    totalScore: number
    maxScore: number
    klasifikasi: KlasifikasiLevel | null
  }[]
}

const PAGE_SIZE = 12

export function RekapitulasiClient({ data }: { data: RekapItem[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const paged = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paged.map((item) => {
          const pct = item.maxScore > 0 ? Math.round((item.totalScore / item.maxScore) * 100) : 0

          return (
            <Link
              key={item.key}
              href={`/admin/assessment/results/${item.userId}/${item.assessmentId}?periode=${item.assessment.periode}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-gray-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {item.user.kecamatan ?? item.user.name}
                  </p>
                  {item.user.kabupaten && (
                    <p className="text-xs text-gray-400">{item.user.kabupaten}</p>
                  )}
                </div>
                <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5 shrink-0" />
              </div>

              {/* Assessment info */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                {item.assessment.title} · Periode {item.assessment.periode}
              </div>

              {/* Score bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Total Skor</span>
                  <span className="font-semibold text-gray-700">
                    {item.totalScore}/{item.maxScore}{' '}
                    <span className="text-gray-400 font-normal">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gray-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Per kategori */}
              <div className="space-y-1.5 mb-3 pt-2 border-t">
                {item.categories.map((cat) => (
                  <div key={cat.code} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 truncate max-w-[40%]">
                      <span className="font-medium text-gray-700">{cat.code}.</span> {cat.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-500">{cat.totalScore}/{cat.maxScore}</span>
                      <KlasifikasiBadge level={cat.klasifikasi} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Status akhir */}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs font-medium text-gray-500">Status Akhir</span>
                <KlasifikasiBadge level={item.statusAkhir} />
              </div>
            </Link>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
