import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getUserPendingChanges, completeUserResubmission } from '@/lib/assessment-versioning'

// GET /api/assessment/[id]/user-changes - Get user's pending changes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    // Get user's assessment status
    const userStatus = await prisma.userAssessmentStatus.findUnique({
      where: {
        userId_assessmentId: { userId: parseInt(session.user.id, 10), assessmentId: numId }
      },
      select: {
        status: true,
        currentVersion: true,
        latestVersion: true,
        lastActivityAt: true
      }
    })

    if (!userStatus) {
      return NextResponse.json({ error: 'User assessment status tidak ditemukan.' }, { status: 404 })
    }

    // Get pending changes for this user
    const pendingChanges = await getUserPendingChanges(parseInt(session.user.id, 10), numId)

    // Get assessment info
    const assessment = await prisma.assessment.findUnique({
      where: { id: numId },
      select: {
        id: true,
        title: true,
        status: true,
        currentVersion: true
      }
    })

    // Get indicators user perlu isi ulang (NEEDS_REVISION: dari IndicatorChange; HAS_UPDATE: cari indicator baru/berubah di latestVersion)
    let indicatorsToResubmit: Array<{
      id: number
      number: number
      indicator: string
      maxScore: number
      category: { code: string; name: string }
    }> = []
    if (userStatus.status === 'NEEDS_REVISION' && pendingChanges.length > 0) {
      const indicatorIds = pendingChanges
        .filter(change => change.indicatorId)
        .map(change => change.indicatorId!)

      indicatorsToResubmit = await prisma.assessmentIndicator.findMany({
        where: { id: { in: indicatorIds } },
        include: {
          category: {
            select: { code: true, name: true }
          }
        },
        orderBy: [
          { category: { order: 'asc' } },
          { number: 'asc' }
        ]
      })
    } else if (userStatus.status === 'HAS_UPDATE' && userStatus.latestVersion > userStatus.currentVersion) {
      // Untuk HAS_UPDATE: cari indicator baru di latestVersion yang belum punya jawaban dari user
      const latestVersionRecord = await prisma.assessmentVersion.findFirst({
        where: { assessmentId: numId, versionNumber: userStatus.latestVersion },
        select: { id: true }
      })
      if (latestVersionRecord) {
        // Ambil semua indicator di latest version
        const latestIndicators = await prisma.assessmentIndicator.findMany({
          where: { assessmentId: numId, versionId: latestVersionRecord.id, isActive: true },
          include: {
            category: { select: { code: true, name: true } }
          },
          orderBy: [{ category: { order: 'asc' } }, { number: 'asc' }]
        })

        // Ambil jawaban existing user berdasarkan logical key
        const existingAnswers = await prisma.selfAssessment.findMany({
          where: {
            submittedById: parseInt(session.user.id, 10),
            indicator: { category: { assessmentId: numId } }
          },
          include: {
            indicator: {
              select: {
                number: true,
                category: { select: { code: true } }
              }
            }
          }
        })

        const answerKeys = new Set(existingAnswers.map(a =>
          `${a.indicator.category.code}:${a.indicator.number}`
        ))

        // Indicator yang belum ada jawabannya = indicator baru
        indicatorsToResubmit = latestIndicators.filter(ind => {
          const key = `${ind.category.code}:${ind.number}`
          return !answerKeys.has(key)
        })
      }
    }

    return NextResponse.json({
      data: {
        assessment,
        userStatus,
        pendingChanges,
        indicatorsToResubmit,
        hasUpdates: userStatus.status === 'NEEDS_REVISION' || userStatus.status === 'HAS_UPDATE',
        needsAction: userStatus.status === 'NEEDS_REVISION',
        message: getStatusMessage(userStatus.status, pendingChanges.length)
      }
    })

  } catch (err) {
    console.error('[GET /api/assessment/[id]/user-changes]', err)
    return NextResponse.json({ error: 'Gagal mengambil perubahan assessment.' }, { status: 500 })
  }
}

// POST /api/assessment/[id]/user-changes - Mark user as completed resubmission
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    // Check if user actually needs to resubmit
    const userStatus = await prisma.userAssessmentStatus.findUnique({
      where: {
        userId_assessmentId: { userId: parseInt(session.user.id, 10), assessmentId: numId }
      }
    })

    if (!userStatus || (userStatus.status !== 'NEEDS_REVISION' && userStatus.status !== 'HAS_UPDATE')) {
      return NextResponse.json({ 
        error: 'User tidak dalam status yang memerlukan update.' 
      }, { status: 400 })
    }

    // A completed update is a submission against the latest immutable
    // structure.  The form copies unchanged answers into V+1 and requires
    // user input only for new/changed rows; this guard prevents a status move
    // to V+1 when that V+1 submission is incomplete.
    const userId = parseInt(session.user.id, 10)
    const latestVersionRecord = await prisma.assessmentVersion.findFirst({
      where: { assessmentId: numId, versionNumber: userStatus.latestVersion },
      select: { id: true },
    })
    if (!latestVersionRecord) {
      return NextResponse.json({ error: 'Versi assessment terbaru tidak ditemukan.' }, { status: 404 })
    }
    const latestIndicators = await prisma.assessmentIndicator.findMany({
      where: { assessmentId: numId, versionId: latestVersionRecord.id },
      select: { id: true },
    })
    const submittedAnswers = await prisma.selfAssessment.count({
      where: {
        indicatorId: { in: latestIndicators.map(indicator => indicator.id) },
        submittedById: userId,
        status: 'SUBMITTED',
      },
    })
    if (submittedAnswers < latestIndicators.length) {
      return NextResponse.json({
        error: `Masih ada ${latestIndicators.length - submittedAnswers} indikator versi baru yang belum disubmit.`,
      }, { status: 400 })
    }

    // Complete resubmission
    await completeUserResubmission(userId, numId)

    return NextResponse.json({ 
      message: 'Resubmission berhasil diselesaikan.',
      status: 'RESUBMITTED'
    })

  } catch (err) {
    console.error('[POST /api/assessment/[id]/user-changes]', err)
    return NextResponse.json({ error: 'Gagal menyelesaikan resubmission.' }, { status: 500 })
  }
}

function getStatusMessage(status: string, changesCount: number): string {
  switch (status) {
    case 'NEEDS_REVISION':
      return `Ada ${changesCount} perubahan yang memerlukan pengisian ulang.`
    case 'HAS_UPDATE':
      return 'Assessment telah diperbarui, tetapi tidak memerlukan pengisian ulang.'
    case 'RESUBMITTED':
      return 'Anda telah menyelesaikan pengisian ulang.'
    case 'SUBMITTED':
      return 'Assessment Anda telah disubmit.'
    case 'IN_PROGRESS':
      return 'Assessment sedang dalam pengisian.'
    case 'NOT_STARTED':
      return 'Assessment belum dimulai.'
    default:
      return 'Status tidak dikenali.'
  }
}
