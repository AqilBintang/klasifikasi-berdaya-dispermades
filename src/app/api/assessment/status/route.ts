import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { userAssessmentStatusService } from '@/lib/user-assessment-status'

// GET /api/assessment/status - Get user's assessment statuses (version-aware)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assessmentId = searchParams.get('assessmentId')

    if (assessmentId) {
      // Single assessment status
      const status = await userAssessmentStatusService.getOrCreateUserAssessmentStatus(
        parseInt(session.user.id, 10),
        parseInt(assessmentId, 10)
      )
      return NextResponse.json({ data: status })
    }

    // All assessment statuses overview
    const overview = await userAssessmentStatusService.getUserAssessmentOverview(
      parseInt(session.user.id, 10)
    )
    
    return NextResponse.json({ data: overview })
  } catch (err) {
    console.error('[GET /api/assessment/status]', err)
    return NextResponse.json({ error: 'Gagal mengambil status assessment.' }, { status: 500 })
  }
}

// POST /api/assessment/status - Update status after submission
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { assessmentId, action } = await req.json()
    const userId = parseInt(session.user.id, 10)

    if (action === 'update_progress') {
      const status = await userAssessmentStatusService.updateStatusBasedOnProgress(userId, assessmentId)
      return NextResponse.json({ data: status })
    }

    if (action === 'mark_up_to_date') {
      const status = await userAssessmentStatusService.markUserUpToDate(userId, assessmentId)
      return NextResponse.json({ data: status, message: 'Status berhasil diperbarui' })
    }

    return NextResponse.json({ error: 'Action tidak valid.' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/assessment/status]', err)
    return NextResponse.json({ error: 'Gagal memperbarui status.' }, { status: 500 })
  }
}