import { prisma } from '@/lib/prisma'
import { StatisticCard } from '@/components/shared/ui/StatisticCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faClipboardList,
  faHourglass,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'

const UsersIcon      = () => <FontAwesomeIcon icon={faUsers}         className="h-4 w-4" />
const AssessmentIcon = () => <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />
const WaitingIcon    = () => <FontAwesomeIcon icon={faHourglass}     className="h-4 w-4" />
const ValidatedIcon  = () => <FontAwesomeIcon icon={faCircleCheck}   className="h-4 w-4" />

export default async function AdminDashboardPage() {
  const [
    totalKecamatan,
    totalAssessmentPublished,
    totalMenunggu,
    totalDivalidasi,
    assessmentTerbaru,
    submissionMenunggu,
  ] = await Promise.all([
    // Total user kecamatan aktif
    prisma.user.count({ where: { role: 'USER', isActive: true } }),
    // Assessment yang sudah published
    prisma.assessment.count({ where: { status: 'PUBLISHED' } }),
    // Self assessment menunggu validasi
    prisma.selfAssessment.count({ where: { status: 'SUBMITTED' } }),
    // Self assessment sudah divalidasi
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
    // 5 submission terbaru yang menunggu validasi
    prisma.selfAssessment.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      select: {
        id: true, periode: true, submittedAt: true,
        submittedBy: { select: { name: true, kabupatenName: true, kecamatanName: true } },
        indicator: {
          select: {
            category: {
              select: { assessment: { select: { title: true } } },
            },
          },
        },
      },
    }),
  ])

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

        {/* Submission menunggu validasi */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Menunggu Validasi</h3>
            {totalMenunggu > 5 && (
              <span className="text-xs text-gray-400">+{totalMenunggu - 5} lainnya</span>
            )}
          </div>
          {submissionMenunggu.length === 0 ? (
            <p className="text-sm text-gray-400">Tidak ada submission yang menunggu validasi.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {submissionMenunggu.map((s) => {
                const loc = [s.submittedBy.kecamatanName, s.submittedBy.kabupatenName]
                  .filter(Boolean).join(', ')
                const tgl = s.submittedAt
                  ? new Date(s.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'
                return (
                  <li key={s.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.submittedBy.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {loc || 'Kecamatan tidak diketahui'} · {s.periode}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400 mt-0.5">{tgl}</span>
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
