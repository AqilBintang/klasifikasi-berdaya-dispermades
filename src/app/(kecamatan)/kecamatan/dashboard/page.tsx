import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList,
  faChartBar,
  faCircleCheck,
  faClockRotateLeft,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'

export default async function KecamatanDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId    = parseInt(session.user.id ?? '0', 10)
  const kecamatan = session.user.kecamatan ?? ''
  const kabupaten = session.user.kabupaten ?? ''
  const location  = [kecamatan, kabupaten].filter(Boolean).join(', ')

  // Ambil stats self assessment milik kecamatan ini
  const [totalSubmitted, totalValidated, publishedAssessments] = await Promise.all([
    prisma.selfAssessment.count({
      where: { submittedById: userId, status: 'SUBMITTED' },
    }),
    prisma.selfAssessment.count({
      where: { submittedById: userId, status: 'VALIDATED' },
    }),
    prisma.assessment.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        categories: {
          include: { indicators: true },
        },
      },
    }),
  ])

  const tahunIni = new Date().getFullYear().toString()

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-6 text-white">
        <p className="text-sky-100 text-sm mb-1">Portal Kecamatan · {tahunIni}</p>
        <h2 className="text-2xl font-bold">Selamat Datang, {location || session.user?.name}</h2>
        <p className="mt-1 text-sky-100 text-sm">
          Kelola self assessment dan lihat perkembangan kecamatan Anda
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-amber-100 p-3">
            <FontAwesomeIcon icon={faClockRotateLeft} className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalSubmitted}</p>
            <p className="text-sm text-gray-500">Menunggu Validasi</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-green-100 p-3">
            <FontAwesomeIcon icon={faCircleCheck} className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalValidated}</p>
            <p className="text-sm text-gray-500">Sudah Divalidasi</p>
          </div>
        </div>
      </div>

      {/* Assessment yang bisa diisi */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FontAwesomeIcon icon={faClipboardList} className="w-4 h-4 text-sky-500" />
            Assessment Tersedia
          </h3>
          <Link href="/kecamatan/assessment"
            className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
            Lihat Semua <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
          </Link>
        </div>

        {publishedAssessments.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
            Belum ada assessment yang tersedia
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {publishedAssessments.map((a) => {
              const totalInd = a.categories.reduce((s, c) => s + c.indicators.length, 0)
              return (
                <Link key={a.id} href={`/kecamatan/assessment/${a.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Published
                    </span>
                    <span className="text-xs text-gray-400">{a.periode}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-sky-600">
                    {a.title}
                  </h4>
                  <p className="mt-2 text-xs text-gray-400">
                    {a.categories.length} kategori · {totalInd} indikator
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Link hasil */}
      <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sky-100 p-2.5">
            <FontAwesomeIcon icon={faChartBar} className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Lihat Hasil Nilai</p>
            <p className="text-xs text-gray-400">Rekap hasil assessment kecamatan Anda</p>
          </div>
        </div>
        <Link href="/kecamatan/hasil"
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
          Lihat <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
