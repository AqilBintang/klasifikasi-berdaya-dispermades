import { prisma } from '@/lib/prisma'
import { StatisticCard } from '@/components/shared/ui/StatisticCard'
import { ActivityLog } from '@/components/admin/ActivityLog'
import type { ActivityItem } from '@/components/admin/ActivityLog'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClipboardList, faHourglass, faCircleCheck } from '@fortawesome/free-solid-svg-icons'

const UsersIcon      = () => <FontAwesomeIcon icon={faUsers}         className="h-4 w-4" />
const AssessmentIcon = () => <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />
const WaitingIcon    = () => <FontAwesomeIcon icon={faHourglass}     className="h-4 w-4" />
const ValidatedIcon  = () => <FontAwesomeIcon icon={faCircleCheck}   className="h-4 w-4" />

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getActivityLog(): Promise<ActivityItem[]> {
  // Satu submission event per (submittedById, periode) — ambil submittedAt terbaru per group.
  // Prisma tidak support groupBy + take, jadi pakai raw yang ringkas.
  const subRows = await prisma.$queryRaw<{
    submittedAt: Date
    periode: string
    kecamatanName: string | null
    kabupatenName: string | null
    assessmentTitle: string
  }[]>`
    SELECT
      MAX(sa.submittedAt)  AS submittedAt,
      sa.periode,
      u.kecamatan          AS kecamatanName,
      u.kabupaten          AS kabupatenName,
      a.title              AS assessmentTitle
    FROM self_assessments sa
    JOIN users u  ON u.id  = sa.submittedById
    JOIN assessment_indicators ai ON ai.id = sa.indicatorId
    JOIN assessment_categories ac ON ac.id = ai.categoryId
    JOIN assessments a ON a.id = ac.assessmentId
    WHERE sa.submittedAt IS NOT NULL
    GROUP BY sa.submittedById, sa.periode, u.kecamatan, u.kabupaten, a.title
    ORDER BY MAX(sa.submittedAt) DESC
    LIMIT 50
  `

  // Satu validation event per (validatorId, submittedById, periode)
  const valRows = await prisma.$queryRaw<{
    validatedAt: Date
    status: string
    validatorName: string
    kecamatanName: string | null
  }[]>`
    SELECT
      MAX(av.validatedAt)  AS validatedAt,
      MAX(av.status)       AS status,
      MAX(u.name)          AS validatorName,
      MAX(su.kecamatan)    AS kecamatanName
    FROM assessment_validations av
    JOIN users u  ON u.id  = av.validatorId
    JOIN self_assessments sa ON sa.id = av.selfAssessmentId
    JOIN users su ON su.id = sa.submittedById
    GROUP BY av.validatorId, sa.submittedById, sa.periode
    ORDER BY MAX(av.validatedAt) DESC
    LIMIT 50
  `

  const submissions: ActivityItem[] = subRows.map((r) => ({
    type: 'submission',
    at: r.submittedAt.toISOString(),
    kecamatan: r.kecamatanName ?? 'Tidak diketahui',
    kabupaten: r.kabupatenName ?? null,
    periode: r.periode,
    assessmentTitle: r.assessmentTitle,
  }))

  const validations: ActivityItem[] = valRows.map((r) => ({
    type: 'validation',
    at: r.validatedAt.toISOString(),
    validator: r.validatorName,
    kecamatan: r.kecamatanName ?? 'Tidak diketahui',
    status: r.status as 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED',
  }))

  return [...submissions, ...validations]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const [
    totalKecamatan,
    totalAssessmentPublished,
    totalMenunggu,
    totalDivalidasi,
    assessmentTerbaru,
    activityLog,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', isActive: true } }),
    prisma.assessment.count({ where: { status: 'PUBLISHED' } }),
    prisma.selfAssessment.count({ where: { status: 'SUBMITTED' } }),
    prisma.selfAssessment.count({ where: { status: 'VALIDATED' } }),
    prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, periode: true, status: true,
        _count: { select: { categories: true } },
      },
    }),
    getActivityLog(),
  ])

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600'   },
    PUBLISHED: { label: 'Published', cls: 'bg-green-100 text-green-700' },
    ARCHIVED:  { label: 'Arsip',     cls: 'bg-slate-100 text-slate-600' },
  }

  return (
    <div className="space-y-8">

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="mt-1 text-sm text-gray-500">Ringkasan data platform klasifikasi kecamatan berdaya</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard title="Total Kecamatan"     value={totalKecamatan}          icon={UsersIcon} />
        <StatisticCard title="Assessment Published" value={totalAssessmentPublished} icon={AssessmentIcon} />
        <StatisticCard title="Menunggu Validasi"    value={totalMenunggu}            icon={WaitingIcon} />
        <StatisticCard title="Sudah Divalidasi"     value={totalDivalidasi}          icon={ValidatedIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Assessment terbaru */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Assessment Terbaru</h3>
          </div>
          {assessmentTerbaru.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">Belum ada assessment.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {assessmentTerbaru.map((a) => {
                const s = STATUS_LABEL[a.status] ?? STATUS_LABEL.DRAFT
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
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
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Log Aktivitas</h3>
          </div>
          <ActivityLog items={activityLog} />
        </div>

      </div>
    </div>
  )
}
