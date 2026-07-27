import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faClipboardList,
  faCheckCircle,
  faCircleDot,
  faBoxArchive,
  faPencil,
  faCalendarDays,
} from '@fortawesome/free-solid-svg-icons'

interface AssessmentItem {
  id: number
  title: string
  description: string | null
  periode: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: string
  categories: {
    id: number
    name: string
    indicators: { id: number }[]
  }[]
}

async function getAssessments(): Promise<AssessmentItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/assessment`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',      icon: faCircleDot,   cls: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: 'Published',  icon: faCheckCircle, cls: 'bg-green-100 text-green-700' },
  ARCHIVED:  { label: 'Archived',   icon: faBoxArchive,  cls: 'bg-amber-100 text-amber-700' },
}

export default async function CreateAssessmentIndexPage() {
  const assessments = await getAssessments()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Assessment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Daftar template assessment yang telah dibuat
          </p>
        </div>
        <Link
          href="/admin/assessment/create/new"
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          Buat Assessment
        </Link>
      </div>

      {/* Empty state */}
      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faClipboardList} className="w-14 h-14 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada assessment</p>
          <p className="mt-1 text-sm text-gray-400 max-w-xs">
            Buat template assessment pertama untuk mulai mengelola penilaian kecamatan
          </p>
          <Link
            href="/admin/assessment/create/new"
            className="mt-5 flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            Buat Assessment Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assessments.map((a) => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.DRAFT
            const totalIndicators = a.categories.reduce(
              (sum, cat) => sum + cat.indicators.length, 0
            )
            return (
              <div
                key={a.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Status + periode */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
                    <FontAwesomeIcon icon={cfg.icon} className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
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

                {/* Action */}
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
      )}
    </div>
  )
}
