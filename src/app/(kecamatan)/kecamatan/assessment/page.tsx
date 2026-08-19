import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList, faCalendarDays, faArrowRight,
  faCircleExclamation, faHourglass, faCircleCheck,
  faClock,
} from '@fortawesome/free-solid-svg-icons'

// ─── Status badge ──────────────────────────────────────────────────────────

type AssessmentStatus = 'BELUM_DIISI' | 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'PARTIAL' | 'NEEDS_REVISION' | 'HAS_UPDATE'

const STATUS_CONFIG: Record<AssessmentStatus, {
  label: string
  icon: typeof faCircleExclamation
  cls: string
}> = {
  BELUM_DIISI:    { label: 'Belum Diisi',      icon: faCircleExclamation, cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  DRAFT:          { label: 'Draft',             icon: faCircleExclamation, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  PARTIAL:        { label: 'Diisi Sebagian',    icon: faCircleExclamation, cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  SUBMITTED:      { label: 'Menunggu Validasi', icon: faHourglass,         cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  VALIDATED:      { label: 'Disetujui',         icon: faCircleCheck,       cls: 'bg-green-50 text-green-700 border-green-200' },
  NEEDS_REVISION: { label: 'Perlu Revisi',      icon: faCircleExclamation, cls: 'bg-red-50 text-red-700 border-red-200' },
  HAS_UPDATE:     { label: 'Ada Update',        icon: faClock,             cls: 'bg-blue-50 text-blue-700 border-blue-200' },
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

function deriveStatus(
  totalIndicators: number,
  entries: { status: string }[],
  needsRevision: boolean,
  hasUpdate: boolean
): AssessmentStatus {
  if (needsRevision) return 'NEEDS_REVISION'
  if (hasUpdate) return 'HAS_UPDATE'
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
  if (!session?.user) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')
  const userId = parseInt(session.user.id ?? '0', 10)

  // Ambil semua assessment termasuk REVISION (untuk ditampilkan sebagai "sedang diperbarui")
  const assessments = await prisma.assessment.findMany({
    where: { status: { in: ['PUBLISHED', 'REVISION'] } },
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
      indicator: {
        select: {
          version: { select: { versionNumber: true } },
          category: { select: { assessmentId: true } },
        },
      },
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
        select: { status: true },
      },
    },
  })

  const entriesByAssessment: Record<number, { status: string; versionNumber: number }[]> = {}
  for (const e of allEntries) {
    const aId = e.indicator.category.assessmentId
    if (!entriesByAssessment[aId]) entriesByAssessment[aId] = []
    entriesByAssessment[aId].push({ status: e.status, versionNumber: e.indicator.version.versionNumber })
  }

  // Cek NEEDS_REVISION dan HAS_UPDATE dari UserAssessmentStatus
  const userStatuses = await prisma.userAssessmentStatus.findMany({
    where: {
      userId,
      assessmentId: { in: assessments.map((a) => a.id) },
    },
    select: { assessmentId: true, status: true, currentVersion: true, latestVersion: true }
  })
  const needsRevisionSet = new Set(
    userStatuses
      .filter(s => s.status === 'NEEDS_REVISION')
      .map(s => s.assessmentId)
  )
  const hasUpdateSet = new Set(
    userStatuses
      .filter(s => s.status === 'HAS_UPDATE' || s.latestVersion > s.currentVersion)
      .map(s => s.assessmentId)
  )
  const currentVersionByAssessment = new Map(assessments.map((assessment) => [assessment.id, assessment.currentVersion]))
  for (const status of userStatuses) currentVersionByAssessment.set(status.assessmentId, status.currentVersion)
  const validatorFeedbackSet = new Set(
    allEntries
      .filter((entry) => {
        const decision = entry.validations[0]?.status
        return !hasUpdateSet.has(entry.indicator.category.assessmentId)
          && entry.indicator.version.versionNumber === currentVersionByAssessment.get(entry.indicator.category.assessmentId)
          && (decision === 'REJECTED' || decision === 'REVISION_NEEDED')
      })
      .map((entry) => entry.indicator.category.assessmentId)
  )

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
            const isUpdating = a.status === 'REVISION'
            const totalInd = a.categories.reduce((s, c) => s + c.indicators.length, 0)
            const entries = (entriesByAssessment[a.id] ?? []).filter(
              (entry) => entry.versionNumber === currentVersionByAssessment.get(a.id)
            )
            const hasValidatorFeedback = validatorFeedbackSet.has(a.id)
            const needsRevision = needsRevisionSet.has(a.id) || hasValidatorFeedback
            const hasUpdate = hasUpdateSet.has(a.id)
            const status = deriveStatus(totalInd, entries, needsRevision, hasUpdate)
            const isLocked = status === 'VALIDATED'

            // Assessment sedang diperbarui admin — tampilkan tapi disable link
            if (isUpdating) {
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 bg-white/60 p-5 opacity-75 cursor-not-allowed"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                      Sedang Diperbarui
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                      {a.periode}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-500 leading-snug">{a.title}</h3>
                  {a.description && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2">{a.description}</p>
                  )}
                  <p className="mt-3 text-xs text-amber-600">
                    Assessment ini sedang dalam proses pembaruan oleh admin. Silakan coba beberapa saat lagi.
                  </p>
                </div>
              )
            }

            return (
              <Link
                key={a.id}
                href={`/kecamatan/assessment/${a.id}`}
                className={`rounded-xl border bg-white p-5 transition-all group ${
                  needsRevision
                    ? 'border-red-300 hover:border-red-400 hover:shadow-sm'
                    : hasUpdate
                    ? 'border-blue-300 hover:border-blue-400 hover:shadow-sm'
                    : 'border-slate-200 hover:border-sky-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={status} />
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3" />
                    {a.periode}
                  </span>
                </div>

                <h3 className={`font-semibold leading-snug transition-colors ${
                  needsRevision
                    ? 'text-slate-900 group-hover:text-red-600'
                    : hasUpdate
                    ? 'text-slate-900 group-hover:text-blue-600'
                    : 'text-slate-900 group-hover:text-sky-600'
                }`}>
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.description}</p>
                )}

                {needsRevision && (
                  <p className="mt-2 text-xs text-red-600 font-medium">
                    ⚠️ {hasValidatorFeedback
                      ? 'Tim teknis meminta perbaikan. Buka assessment untuk mengisi ulang indikator yang ditandai.'
                      : 'Ada perubahan dari admin. Silakan lengkapi indikator yang baru/diperbarui.'}
                  </p>
                )}

                {hasUpdate && !needsRevision && (
                  <p className="mt-2 text-xs text-blue-600 font-medium">
                    📋 Assessment diperbarui admin. Silakan lengkapi indikator baru yang tersedia.
                  </p>
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
                          status === 'VALIDATED'    ? 'bg-green-500' :
                          status === 'SUBMITTED'    ? 'bg-amber-400' :
                          status === 'NEEDS_REVISION' ? 'bg-red-400'  :
                          status === 'HAS_UPDATE'   ? 'bg-blue-400'  : 'bg-sky-500'
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
                  <span className={`flex items-center gap-1 text-sm font-medium ${
                    isLocked        ? 'text-green-600' :
                    needsRevision   ? 'text-red-600'   :
                    hasUpdate       ? 'text-blue-600'  : 'text-sky-600'
                  }`}>
                    {isLocked        ? 'Lihat Detail'  :
                     needsRevision   ? 'Isi Revisi'    :
                     hasUpdate       ? 'Lihat Update'  :
                     status === 'BELUM_DIISI' ? 'Mulai Isi' : 'Lanjutkan'}
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
