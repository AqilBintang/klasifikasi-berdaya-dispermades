import { StatisticCard } from '@/components/shared/ui/StatisticCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMap,
  faBookOpen,
  faCalendarDays,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons'
import { mockPrograms } from '@/data/programs'
import { mockActivities } from '@/data/activities'

const totalDesa = 177
const totalAssessment = 42

const MapIcon = () => <FontAwesomeIcon icon={faMap} className="h-4 w-4" />
const ProgramIcon = () => <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" />
const ActivityIcon = () => <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
const AssessmentIcon = () => <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />

export default function AdminDashboardPage() {
  const activePrograms = mockPrograms.filter((p) => p.status === 'active').length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingActivities = mockActivities.filter((a) => new Date(a.date) >= today).length

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="mt-1 text-sm text-gray-500">Ringkasan Data Platform Klasifikasi Berdaya</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticCard title="Total Desa"          value={totalDesa}           icon={MapIcon} />
        <StatisticCard title="Program Aktif"       value={activePrograms}      icon={ProgramIcon} />
        <StatisticCard title="Kegiatan Mendatang"  value={upcomingActivities}  icon={ActivityIcon} />
        <StatisticCard title="Total Assessment"    value={totalAssessment}     icon={AssessmentIcon} />
      </div>

      {/* Placeholder tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Assessment Terbaru</h3>
          <p className="text-sm text-gray-400">Tabel assessment akan ditampilkan di sini.</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">User Terbaru</h3>
          <p className="text-sm text-gray-400">Tabel user akan ditampilkan di sini.</p>
        </div>
      </div>
    </div>
  )
}
