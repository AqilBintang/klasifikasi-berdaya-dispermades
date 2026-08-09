import { prisma } from '@/lib/prisma'
import { StatisticCard } from '@/components/shared/ui/StatisticCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faClipboardList,
  faHourglass,
  faCircleCheck,
  faFileCircleCheck,
  faShieldHalved,
  faTimesCircle,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons'

const UsersIcon      = () => <FontAwesomeIcon icon={faUsers}         className="h-4 w-4" />
const AssessmentIcon = () => <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />
const WaitingIcon    = () => <FontAwesomeIcon icon={faHourglass}     className="h-4 w-4" />
const ValidatedIcon  = () => <FontAwesomeIcon icon={faCircleCheck}   className="h-4 w-4" />

type ActivityItem =
  | { type: 'submission'; at: Date; kecamatan: string; kabupaten: string | null; periode: string; assessmentTitle: string }
  | { type: 'validation'; at: Date; validator: string; kecamatan: string; status: 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED' }

const VALIDATION_CONFIG = {
  APPROVED:        { label: 'Disetujui',     icon: faCircleCheck,      cls: 'text-green-600' },
  REJECTED:        { label: 'Ditolak',       icon: faTimesCircle,      cls: 'text-red-500' },
  REVISION_NEEDED: { label: 'Perlu Revisi',  icon: faExclamationCircle, cls: 'text-amber-500' },
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1)   return 'Baru saja'
  if (minutes < 60)  return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7)      return `${days} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminDashboardPage() {
  const [
    totalKecamatan,
    totalAssessmentPublished,
    totalMenunggu,
    totalDivalidasi,
    assessmentTerbaru,
    recentSubmissions,
    recentValidations,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', isActive: true } }),
    prisma.assessment.count({ where: { status: 'PUBLISHED' } }),
    prisma.selfAssessment.count({ where: { status: 'SUBMITTED' } }),
    prisma.selfAssessment.count({ where: { status: 'VALIDATED' } }),
    // 5 assessment terbaru
    prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, periode: true, status: true, createdAt: true,
        _count: { select: { categories: true } },
      },
    }),
    // Submission terbaru — distinct per kecamatan+periode agar tidak duplikat per indikator
    prisma.selfAssessment.findMany({
      where: { submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: 30,
      select: {
        submittedAt: true, periode: true,
        submittedById: true,
        submittedBy: { select: { kecamatanName: true, kabupatenName: true } },
        indicator: {
          select: { category: { select: { assessment: { select: { title: true } } } } },
        },
      },
    }),
    // Validasi terbaru
    prisma.assessmentValidation.findMany({
      orderBy: { validatedAt: 'desc' },
      take: 15,
      select: {
        validatedAt: true,
        status: true,
        validator: { select: { name: true } },
        selfAssessment: {
          select: { submittedBy: { select: { kecamatanName: true } } },
        },
      },
    }),
  ])

  // Deduplicate submissions: satu entry per (submittedById, periode)
  const seenSubmission = new Set<string>()
  const submissionItems: ActivityItem[] = []
  for (const s of recentSubmissions) {
    const key = `${s.submittedById}_${s.periode}`
    if (seenSubmission.has(key)) continue
    seenSubmission.add(key)
    submissionItems.push({
      type: 'submission',
      at: s.submittedAt!,
      kecamatan: s.submittedBy.kecamatanName ?? 'Tidak diketahui',
      kabupaten: s.submittedBy.kabupatenName ?? null,
      periode: s.periode,
      assessmentTitle: s.indicator.category.assessment.title,
    })
  }

  const validationItems: ActivityItem[] = recentValidations.map((v) => ({
    type: 'validation',
    at: v.validatedAt,
    validator: v.validator.name,
    kecamatan: v.selfAssessment.submittedBy.kecamatanName ?? 'Tidak diketahui',
    status: v.status as 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED',
  }))

  // Gabung dan urutkan terbaru di atas, ambil 10
  const activityLog = [...submissionItems, ...validationItems]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10)

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
    PUBLISHED: { label: 'Published', cls: 'bg-green-100 text-green-700' },
    ARCHIVED:  { label: 'Arsip',     cls: 'bg-slate-100 text-slate-600' },
  }

  return (
    <div className="space-y-8">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="mt-1 text-sm text-gray-500">Ringkasan data platform klasifikasi kecamatan berdaya</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard title="Total Kecamatan"      value={totalKecamatan}           icon={UsersIcon} />
        <StatisticCard title="Assessment Published"  value={totalAssessmentPublished}  icon={AssessmentIcon} />
        <StatisticCard title="Menunggu Validasi"     value={totalMenunggu}             icon={WaitingIcon} />
        <StatisticCard title="Sudah Divalidasi"      value={totalDivalidasi}           icon={ValidatedIcon} />
      </div>

      {/* Tabel bawah */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Assessment terbaru */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Assessment Terbaru</h3>
          {assessmentTerbaru.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada assessment.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {assessmentTerbaru.map((a) => {
                const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.DRAFT
                return (
                  <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Periode {a.periode} · {a._count.categories} kategori
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Log Aktivitas */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Log Aktivitas</h3>
          {activityLog.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada aktivitas.</p>
          ) : (
            <ul className="space-y-3">
              {activityLog.map((item, i) => {
                if (item.type === 'submission') {
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100">
                        <FontAwesomeIcon icon={faFileCircleCheck} className="w-3.5 h-3.5 text-sky-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">{item.kecamatan}</span>
                          {item.kabupaten && <span className="text-gray-500"> · {item.kabupaten}</span>}
                          <span className="text-gray-600"> mengisi assessment</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {item.assessmentTitle} · Periode {item.periode}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                        {relativeTime(item.at)}
                      </span>
                    </li>
                  )
                }

                const cfg = VALIDATION_CONFIG[item.status]
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{item.validator}</span>
                        <span className="text-gray-600"> memvalidasi </span>
                        <span className="font-medium">{item.kecamatan}</span>
                      </p>
                      <p className="text-xs mt-0.5">
                        <FontAwesomeIcon icon={cfg.icon} className={`w-3 h-3 mr-1 ${cfg.cls}`} />
                        <span className={cfg.cls}>{cfg.label}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                      {relativeTime(item.at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
