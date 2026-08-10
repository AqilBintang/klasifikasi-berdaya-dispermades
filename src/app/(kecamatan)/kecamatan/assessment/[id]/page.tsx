import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { KecamatanAssessmentForm } from '@/components/kecamatan/KecamatanAssessmentForm'
import { ExportAssessmentButton } from '@/components/kecamatan/ExportAssessmentButton'

export default async function KecamatanAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')

  const { id } = await params
  const userId = parseInt(session.user.id ?? '0', 10)
  const assessmentId = parseInt(id, 10)
  if (isNaN(assessmentId)) notFound()

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: {
          indicators: { orderBy: { number: 'asc' } },
        },
      },
    },
  })

  if (!assessment) notFound()

  // Skenario 3: assessment sedang diperbarui admin
  // User baru tidak bisa mulai, tapi user yang sudah mengisi bisa melanjutkan
  if (assessment.status === 'REVISION') {
    // Periksa apakah user sudah pernah mulai mengisi
    const hasExistingProgress = await prisma.selfAssessment.count({
      where: {
        submittedById: userId,
        periode: assessment.periode,
        indicator: {
          category: { assessmentId: assessment.id },
        },
      },
    })

    // Jika user belum pernah mulai, blokir akses
    if (hasExistingProgress === 0) {
      return (
        <div className="space-y-6">
          <div>
            <Link
              href="/kecamatan/assessment"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
              Kembali
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 py-20 text-center px-6">
            <span className="text-4xl mb-4">🔄</span>
            <h3 className="font-semibold text-amber-800 text-lg mb-2">Assessment Sedang Diperbarui</h3>
            <p className="text-amber-700 text-sm max-w-md">
              Admin sedang melakukan pembaruan pada assessment ini. Silakan kembali beberapa saat lagi setelah pembaruan selesai.
            </p>
            <Link
              href="/kecamatan/assessment"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Kembali ke Daftar Assessment
            </Link>
          </div>
        </div>
      )
    }
    
    // User yang sudah mulai mengisi dapat melanjutkan dengan peringatan
    // Tampilkan banner peringatan bahwa assessment sedang diupdate
  }

  // Hanya PUBLISHED yang bisa diakses
  if (assessment.status !== 'PUBLISHED') notFound()

  // Ambil self assessment yang sudah diisi user ini
  const existingEntries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      periode: assessment.periode,
      indicator: {
        category: { assessmentId: assessment.id },
      },
    },
  })

  // Cek apakah user perlu revisi (Skenario 1)
  const userStatus = await prisma.userAssessmentStatus.findUnique({
    where: {
      userId_assessmentId: { userId, assessmentId: assessment.id }
    },
    select: { status: true, latestVersion: true, currentVersion: true }
  })
  const needsRevision = userStatus?.status === 'NEEDS_REVISION'

  // Ambil indikator yang berubah di versi terbaru jika perlu revisi
  let changedIndicatorIds: number[] = []
  if (needsRevision && userStatus) {
    const latestVersion = await prisma.assessmentVersion.findFirst({
      where: {
        assessmentId: assessment.id,
        versionNumber: userStatus.latestVersion,
      },
      include: {
        indicatorChanges: {
          where: { requiresResubmit: true },
          select: { indicatorId: true, changeType: true }
        }
      }
    })
    changedIndicatorIds = latestVersion?.indicatorChanges
      .filter(c => c.indicatorId !== null)
      .map(c => c.indicatorId!) ?? []
  }

  const periode = assessment.periode

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kecamatan/assessment"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
            <p className="mt-1 text-sm text-gray-500">Periode: {periode}</p>
          </div>
          <ExportAssessmentButton assessmentId={assessment.id} periode={periode} />
        </div>
      </div>

      {/* Banner peringatan jika assessment dalam status REVISION */}
      {assessment.status === 'REVISION' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div className="text-sm">
              <h4 className="font-medium text-amber-800 mb-1">Assessment Sedang Diperbarui</h4>
              <p className="text-amber-700">
                Admin sedang melakukan pembaruan pada assessment ini. Anda dapat menyelesaikan pengisian versi saat ini, 
                dan setelah submit mungkin akan diminta mengisi ulang indikator yang berubah.
              </p>
            </div>
          </div>
        </div>
      )}

      <KecamatanAssessmentForm
        assessment={assessment}
        existingEntries={existingEntries}
        submittedById={userId}
        periode={periode}
        needsRevision={needsRevision}
        changedIndicatorIds={changedIndicatorIds}
      />
    </div>
  )
}
