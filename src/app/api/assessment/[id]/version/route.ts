import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { userAssessmentStatusService } from '@/lib/user-assessment-status'

// POST /api/assessment/[id]/version - Create new assessment version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const assessmentId = parseInt(id, 10)
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const { changesSummary, indicatorChanges } = await req.json()

    // Create new version
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { currentVersion: true }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    const newVersionNumber = assessment.currentVersion + 1

    const result = await prisma.$transaction(async (tx) => {
      // Create version record
      const version = await tx.assessmentVersion.create({
        data: {
          assessmentId,
          versionNumber: newVersionNumber,
          changesSummary,
          createdById: Number(session.user.id)
        }
      })

      // Create indicator changes
      if (indicatorChanges?.length) {
        await tx.indicatorChange.createMany({
          data: indicatorChanges.map((change: any) => ({
            versionId: version.id,
            indicatorId: change.indicatorId || null,
            changeType: change.changeType,
            oldValue: change.oldValue,
            newValue: change.newValue,
            requiresResubmit: change.requiresResubmit ?? true
          }))
        })
      }

      // Update assessment current version
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { 
          currentVersion: newVersionNumber,
          status: 'PUBLISHED' // Auto-publish after version creation
        }
      })

      return version
    })

    // Trigger user migration
    await userAssessmentStatusService.handleMigrationStatusUpdate(
      assessmentId, 
      newVersionNumber
    )

    return NextResponse.json({ 
      message: `Assessment V${newVersionNumber} berhasil dibuat dan dipublish`,
      data: result
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/assessment/[id]/version]', err)
    return NextResponse.json({ error: 'Gagal membuat versi baru.' }, { status: 500 })
  }
}