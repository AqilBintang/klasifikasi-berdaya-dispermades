import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faCalendarDays, faArrowRight, faCircleExclamation, faHourglass, faCircleCheck } from '@fortawesome/free-solid-svg-icons'

// ─── Status badge config ───────────────────────────────────────────────────

type AssessmentStatus = 'BELUM_DIISI' | 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'PARTIAL'

const STATUS_CONFIG: Record<AssessmentStatus, {
  label: string; icon: typeof faCircleExclamation
  bg: string; text: string; border: string
}> = {
  BELUM_DIISI: { label: 'Belum Diisi',        icon: faCircleExclamation, bg: 'bg-gray-100',   text: 'text-gray-600',  border: 'border-gray-200' },
  DRAFT:       { label: 'Draft',               icon: faCircleExclamation, bg: 'bg-yellow-100', text: 'text-yellow-700',border: 'border-yellow-200' },
  PARTIAL:     { label: 'Diisi Sebagian',      icon: faCircleExclamation, bg: 'bg-orange-100', text: 'text-orange-700',border: 'border-orange-200' },
  SUBMITTED:   { label: 'Menunggu Validasi',   icon: faHourglass,         bg: 'bg-amber-100',  text: 'text-amber-700', border: 'border-amber-200' },
  VALIDATED:   { label: 'Disetujui',           icon: faCircleCheck,       bg: 'bg-green-100',  text: 'text-green-700', border: 'border-green-200' },
}

function StatusBadge({ status }: { status: AssessmentStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <FontAwesomeIcon icon={cfg.icon} className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ─── Derive status dari entries ────────────────────────────────────────────

function deriveStatus(
  totalIndicators: number,
  entries: { status: string }[]
): AssessmentStatus {
  if (entries.length === 0) return 'BELUM_DIISI'

  const allValidated = entries.every((e) => e.status === 'VALIDATED')
  if (allValidated) return 'VALIDATED'

  const anySubmitted = entries.some((e) => e.status === 'SUBMITTED' || e.status === 'VALIDATED')
  if (anySubmitted) {
    // Jika semua sudah submitted/validated
    const allDone = entries.every((e) => e.status === 'SUBMITTED' || e.status === 'VALIDATED')
    if (allDone) return 'SUBMITTED'
  }

  if (entries.length < totalIndicators) return 'PARTIAL'
  return 'DRAFT'
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function KecamatanAssessmentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = parseInt(session.user.id ?? '0', 10)

  const assessments = await prisma.assessment.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      categories: {
        include: { indicators: { select: { id: true } } },
      },
    },
  })

  // Ambil semua self assessment milik user ini untuk semua assessment yang published
  const allEntries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      indicator: {
        category: {
          assessmentId: { in: assessments.map((a) => a.id) },
        },
      },
    },
    select: {
      id: true,
      status: true,
      indicator: {
        select: { category: { select: { assessmentId: true } } },
      },
    },
  })

  // Map: assessmentId → entries[]
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
        <p className="mt-1 text-sm text-gray-500">
          Pilih assessment yang ingin Anda isi
        </p>
      </div>

      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faClipboardList} className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada assessment yang tersedia</p>
          <p className="text-sm text-gray-400 mt-1">Hubungi administrator untuk informasi lebih lanjut</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((a) => {
            const totalInd = a.categories.reduce((s, c) => s + c.indicators.length, 0)
            const entries  = entriesByAssessment[a.id] ?? []
            const status   = deriveStatus(totalInd, entries)
            const isLocked = status === 'VALIDATED'

            return (
              <Link
                key={a.id}
                href={`/kecamatan/assessment/${a.id}`}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow group"
              >
                {/* Top row: status badge + periode */}
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={status} />
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                    {a.periode}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-sky-600 transition-colors">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{a.description}</p>
                )}

                {/* Progress indicator */}
                {entries.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progres pengisian</span>
                      <span>{entries.length}/{totalInd} indikator</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
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

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
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
