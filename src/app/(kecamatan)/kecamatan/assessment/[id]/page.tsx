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
    select: { id: true, title: true, periode: true, status: true, currentVersion: true }
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
            <span className="text-4xl mb-4">UPDATING</span>
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

  // Hanya PUBLISHED atau REVISION (dengan progress existing) yang bisa diakses
  if (assessment.status !== 'PUBLISHED' && assessment.status !== 'REVISION') notFound()

  // Cek UserAssessmentStatus untuk tahu version mana yang harus diambil
  let userStatus = await prisma.userAssessmentStatus.findUnique({
    where: {
      userId_assessmentId: { userId, assessmentId: assessment.id }
    },
    select: { status: true, currentVersion: true, latestVersion: true }
  })

  // Jika belum ada status, buat baru (NOT_STARTED, pakai currentVersion dari assessment)
  if (!userStatus) {
    userStatus = await prisma.userAssessmentStatus.create({
      data: {
        userId,
        assessmentId: assessment.id,
        status: 'NOT_STARTED',
        currentVersion: assessment.currentVersion,
        latestVersion: assessment.currentVersion,
      },
      select: { status: true, currentVersion: true, latestVersion: true }
    })
  }

  const needsRevision = userStatus.status === 'NEEDS_REVISION'
  const hasUpdate = userStatus.latestVersion > userStatus.currentVersion
  const templateNeedsRevision = needsRevision && hasUpdate
  
  console.log('[DEBUG] UserStatus:', {
    currentVersion: userStatus.currentVersion,
    latestVersion: userStatus.latestVersion,
    status: userStatus.status,
    hasUpdate,
    needsRevision
  })
  
  // Determine which version to load
  // If user has update available and needs revision, load LATEST structure
  // Otherwise load user's current version
  let versionToLoad = userStatus.currentVersion
  if (hasUpdate && (needsRevision || userStatus.status === 'HAS_UPDATE')) {
    versionToLoad = userStatus.latestVersion
  }
  
  console.log('[DEBUG] VersionToLoad:', versionToLoad, 'vs currentVersion:', userStatus.currentVersion)

  // Fetch version record
  const versionRecord = await prisma.assessmentVersion.findFirst({
    where: {
      assessmentId: assessment.id,
      versionNumber: versionToLoad
    },
    select: { id: true }
  })

  let versionId: number
  if (!versionRecord) {
    // Fallback jika version record tidak ditemukan (data lama sebelum versioning)
    const fallbackVersion = await prisma.assessmentVersion.findFirst({
      where: { assessmentId: assessment.id, versionNumber: 1 },
      select: { id: true }
    })
    if (!fallbackVersion) notFound()
    versionId = fallbackVersion.id
  } else {
    versionId = versionRecord.id
  }

  // Fetch categories+indicators for target version
  const categories = await prisma.assessmentCategory.findMany({
    where: {
      assessmentId: assessment.id,
      versionId,
    },
    orderBy: { order: 'asc' },
    include: {
      indicators: {
        orderBy: { number: 'asc' },
      },
    },
  })

  const assessmentWithCategories = {
    ...assessment,
    categories,
  }

  // Fetch ALL user's answers (from any version) WITH indicator info for logical mapping
  const existingEntries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      periode: assessment.periode,
      indicator: {
        category: { assessmentId: assessment.id },
      },
    },
    include: {
      indicator: {
        select: {
          id: true,
          versionId: true,
          number: true,
          category: {
            select: {
              code: true,
            }
          }
        },
      },
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
        select: { status: true },
      },
    },
    // Prefer an answer already saved against the target version over the
    // historical value used as its merge fallback.
    orderBy: { updatedAt: 'desc' },
  })

  // Calculate new indicators (for marking in UI)
  let newIndicatorIds: number[] = []
  if (hasUpdate) {
    // Build answer map by logical key to find which indicators are new
    const answerMap = new Map<string, (typeof existingEntries)[number]>()
    for (const entry of existingEntries) {
      const key = `${assessment.id}:${entry.indicator.category.code}:${entry.indicator.number}`
      answerMap.set(key, entry)
    }
    
    // Find indicators without answers (new indicators)
    for (const cat of categories) {
      for (const ind of cat.indicators) {
        const key = `${assessment.id}:${cat.code}:${ind.number}`
        if (!answerMap.has(key)) {
          newIndicatorIds.push(ind.id)
        }
      }
    }
  }

  // For NEEDS_REVISION: also get changed indicator IDs from IndicatorChange
  let changedIndicatorIds: number[] = []
  if (templateNeedsRevision) {
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
    
    // Merge with newIndicatorIds
    newIndicatorIds = [...new Set([...newIndicatorIds, ...changedIndicatorIds])]
  }

  // Keputusan validator selalu dibaca dari versi yang sedang dibuka. Riwayat
  // versi lain tidak boleh membuat user mengubah submission historis.
  const validatorRevisionIndicatorIds = existingEntries
    .filter((entry) => entry.indicator.versionId === versionId && entry.validations[0]?.status === 'REVISION_NEEDED')
    .map((entry) => entry.indicatorId)
  const validatorRejectedIndicatorIds = existingEntries
    .filter((entry) => entry.indicator.versionId === versionId && entry.validations[0]?.status === 'REJECTED')
    .map((entry) => entry.indicatorId)

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

      {/* Banner: Assessment diperbarui - ada update tersedia */}
      {hasUpdate && !needsRevision && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-lg">INFO</span>
            <div className="text-sm flex-1">
              <h4 className="font-medium text-blue-800 mb-1">Assessment Diperbarui</h4>
              <p className="text-blue-700">
                Admin telah memperbarui assessment ini. 
                Jawaban Anda sebelumnya tetap tersimpan. 
                {newIndicatorIds.length > 0 && ` Ada ${newIndicatorIds.length} indikator baru yang perlu Anda isi (ditandai dengan label "BARU").`}
                {newIndicatorIds.length === 0 && ' Silakan tinjau perubahan dan submit ulang jika diperlukan.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner peringatan jika assessment dalam status REVISION */}
      {assessment.status === 'REVISION' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">WARN</span>
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
        assessment={assessmentWithCategories}
        existingEntries={existingEntries}
        submittedById={userId}
        periode={periode}
        needsRevision={templateNeedsRevision}
        changedIndicatorIds={templateNeedsRevision ? newIndicatorIds : []}
        newIndicatorIds={newIndicatorIds}
        hasUpdate={hasUpdate}
        validatorRevisionIndicatorIds={validatorRevisionIndicatorIds}
        validatorRejectedIndicatorIds={validatorRejectedIndicatorIds}
      />
    </div>
  )
}
