import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ClipboardList,
  BarChart,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'

export default async function KecamatanDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')

  const userId    = parseInt(session.user.id ?? '0', 10)
  const kecamatan = session.user.kecamatan ?? ''
  const kabupaten = session.user.kabupaten ?? ''
  const location  = [kecamatan, kabupaten].filter(Boolean).join(', ')
  const tahunIni  = new Date().getFullYear().toString()

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
      include: { categories: { include: { indicators: true } } },
    }),
  ])

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div>
        <p className="text-xs text-gray-400">Portal Kecamatan · {tahunIni}</p>
        <h2 className="mt-0.5 text-2xl font-bold text-gray-900">{location || session.user?.name}</h2>
        <p className="mt-1 text-sm text-gray-500">Kelola self assessment dan pantau perkembangan kecamatan Anda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4">
          <div className="rounded-lg bg-amber-50 p-3 shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalSubmitted}</p>
            <p className="text-xs text-gray-500">Menunggu Validasi</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 shrink-0">
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalValidated}</p>
            <p className="text-xs text-gray-500">Sudah Divalidasi</p>
          </div>
        </div>
      </div>

      {/* Assessment tersedia */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-sky-500" />
            Assessment Tersedia
          </h3>
          <Link href="/kecamatan/assessment" className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium">
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {publishedAssessments.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-400">
            Belum ada assessment yang tersedia
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {publishedAssessments.map((a) => {
              const totalInd = a.categories.reduce((s, c) => s + c.indicators.length, 0)
              return (
                <Link
                  key={a.id}
                  href={`/kecamatan/assessment/${a.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 hover:border-sky-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                      Tersedia
                    </span>
                    <span className="text-xs text-gray-400">{a.periode}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm leading-snug group-hover:text-sky-600 transition-colors">
                    {a.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {a.categories.length} kategori · {totalInd} indikator
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Lihat hasil */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-gray-100 p-2.5 shrink-0">
            <BarChart className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Lihat Hasil Nilai</p>
            <p className="text-xs text-gray-400">Rekap lengkap hasil assessment per kategori</p>
          </div>
        </div>
        <Link
          href="/kecamatan/hasil"
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          Lihat <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  )
}
