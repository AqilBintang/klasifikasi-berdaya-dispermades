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

    // If user needs revision, get specific indicators they need to fill
    let indicatorsToResubmit: any[] = []
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

    if (!userStatus || userStatus.status !== 'NEEDS_REVISION') {
      return NextResponse.json({ 
        error: 'User tidak dalam status NEEDS_REVISION.' 
      }, { status: 400 })
    }

    // Verify that user has actually filled the required indicators
    const pendingChanges = await getUserPendingChanges(parseInt(session.user.id, 10), numId)
    const indicatorIds = pendingChanges
      .filter(change => change.indicatorId && change.requiresResubmit)
      .map(change => change.indicatorId!)

    if (indicatorIds.length > 0) {
      const submittedAnswers = await prisma.selfAssessment.count({
        where: {
          indicatorId: { in: indicatorIds },
          submittedById: parseInt(session.user.id, 10),
          status: 'SUBMITTED'
        }
      })

      if (submittedAnswers < indicatorIds.length) {
        return NextResponse.json({ 
          error: `Masih ada ${indicatorIds.length - submittedAnswers} indikator yang perlu diisi ulang.` 
        }, { status: 400 })
      }
    }

    // Complete resubmission
    await completeUserResubmission(parseInt(session.user.id, 10), numId)

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