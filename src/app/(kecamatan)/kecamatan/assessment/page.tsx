import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList, faCalendarDays, faArrowRight,
  faCircleExclamation, faHourglass, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'

// ─── Status badge ──────────────────────────────────────────────────────────

type AssessmentStatus = 'BELUM_DIISI' | 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'PARTIAL'

const STATUS_CONFIG: Record<AssessmentStatus, {
  label: string
  icon: typeof faCircleExclamation
  cls: string
}> = {
  BELUM_DIISI: { label: 'Belum Diisi',      icon: faCircleExclamation, cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  DRAFT:       { label: 'Draft',             icon: faCircleExclamation, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  PARTIAL:     { label: 'Diisi Sebagian',    icon: faCircleExclamation, cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  SUBMITTED:   { label: 'Menunggu Validasi', icon: faHourglass,         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  VALIDATED:   { label: 'Disetujui',         icon: faCircleCheck,       cls: 'bg-green-50 text-green-700 border-green-200' },
}

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <FontAwesomeIcon icon={cfg.icon} className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ─── Derive status ─────────────────────────────────────────────────────────

function deriveStatus(totalIndicators: number, entries: { status: string }[]): AssessmentStatus {
  if (entries.length === 0) return 'BELUM_DIISI'
  if (entries.every((e) => e.status === 'VALIDATED')) return 'VALIDATED'
  const allDone = entries.every((e) => e.status === 'SUBMITTED' || e.status === 'VALIDATED')
  if (allDone) return 'SUBMITTED'
  if (entries.length < totalIndicators) return 'PARTIAL'
  return 'DRAFT'
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function KecamatanAssessmentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'USER') redirect('/admin')
  const userId = parseInt(session.user.id ?? '0', 10)

  const assessments = await prisma.assessment.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      categories: { include: { indicators: { select: { id: true } } } },
    },
  })

  const allEntries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      indicator: { category: { assessmentId: { in: assessments.map((a) => a.id) } } },
    },
    select: {
      id: true,
      status: true,
      indicator: { select: { category: { select: { assessmentId: true } } } },
    },
  })

  const entriesByAssessment: Record<number, { status: string }[]> = {}
  for (const e of allEntries) {
    const aId = e.indicator.category.assessmentId
    if (!entriesByAssessment[aId]) entriesByAssessment[aId] = []
    entriesByAssessment[aId].push({ status: e.status })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Isi Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">Pilih assessment yang ingin Anda isi</p>
      </div>

      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faClipboardList} className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-sm">Belum ada assessment yang tersedia</p>
          <p className="text-xs text-slate-400 mt-1">Hubungi administrator untuk informasi lebih lanjut</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assessments.map((a) => {
            const totalInd = a.categories.reduce((s, c) => s + c.indicators.length, 0)
            const entries  = entriesByAssessment[a.id] ?? []
            const status   = deriveStatus(totalInd, entries)
            const isLocked = status === 'VALIDATED'

            return (
              <Link
                key={a.id}
                href={`/kecamatan/assessment/${a.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={status} />
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                    {a.periode}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.description}</p>
                )}

                {entries.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progres pengisian</span>
                      <span>{entries.length}/{totalInd} indikator</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'VALIDATED' ? 'bg-green-500' :
                          status === 'SUBMITTED' ? 'bg-amber-400' : 'bg-sky-500'
                        }`}
                        style={{ width: `${(entries.length / totalInd) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {a.categories.length} kategori · {totalInd} indikator
                  </span>
                  <span className={`flex items-center gap-1 text-sm font-medium ${isLocked ? 'text-green-600' : 'text-sky-600'}`}>
                    {isLocked ? 'Lihat Detail' : status === 'BELUM_DIISI' ? 'Mulai Isi' : 'Lanjutkan'}
                    <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
