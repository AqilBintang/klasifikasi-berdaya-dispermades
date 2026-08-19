'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  finalScore: number
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

const categoryCodes = ['A', 'B', 'C', 'D', 'E', 'F']

function CategoryScore({ item, code }: { item: RekapItem; code: string }) {
  const category = item.categories.find((cat) => cat.code.toUpperCase() === code)
  return <>{category ? category.totalScore : '—'}</>
}

function CategoryStatus({ item, code }: { item: RekapItem; code: string }) {
  const category = item.categories.find((cat) => cat.code.toUpperCase() === code)
  return <KlasifikasiBadge level={category?.klasifikasi ?? null} />
}

export function RekapitulasiClient({ data }: { data: RekapItem[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const paged = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-max w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-center">No.</th>
              <th className="px-4 py-3 text-left">Kabupaten/Kota</th>
              <th className="px-4 py-3 text-left">Kecamatan</th>
              {categoryCodes.slice(0, 4).flatMap((code) => [
                <th key={`score-${code}`} className="px-4 py-3 text-center whitespace-nowrap">Skor Kategori {code}</th>,
                <th key={`status-${code}`} className="px-4 py-3 text-center whitespace-nowrap">Status Kategori {code}</th>,
              ])}
              {categoryCodes.slice(4).map((code) => (
                <th key={`score-${code}`} className="px-4 py-3 text-center whitespace-nowrap">Skor Kategori {code}</th>
              ))}
              <th className="px-4 py-3 text-center">Verifikasi</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Skor Final</th>
              <th className="px-4 py-3 text-center">Klasifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((item, index) => (
              <tr key={item.key} className="hover:bg-gray-50/70">
                <td className="px-4 py-3 text-center text-gray-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.user.kabupaten ?? '—'}</td>
                <td className="px-4 py-3 font-semibold whitespace-nowrap">
                  <Link href={`/admin/assessment/results/${item.userId}/${item.assessmentId}?periode=${item.assessment.periode}`} className="text-gray-900 hover:text-sky-700 hover:underline">
                    {item.user.kecamatan ?? item.user.name}
                  </Link>
                </td>
                {categoryCodes.slice(0, 4).flatMap((code) => [
                  <td key={`score-${code}`} className="px-4 py-3 text-center font-medium tabular-nums"><CategoryScore item={item} code={code} /></td>,
                  <td key={`status-${code}`} className="px-4 py-3 text-center"><CategoryStatus item={item} code={code} /></td>,
                ])}
                {categoryCodes.slice(4).map((code) => (
                  <td key={`score-${code}`} className="px-4 py-3 text-center font-medium tabular-nums"><CategoryScore item={item} code={code} /></td>
                ))}
                <td className="px-4 py-3 text-center"><span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Terverifikasi</span></td>
                <td className="px-4 py-3 text-center font-bold tabular-nums">{item.finalScore.toFixed(2)}</td>
                <td className="px-4 py-3 text-center"><KlasifikasiBadge level={item.statusAkhir} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
