import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkAssessmentUpdates, markAssessmentAsViewed } from '@/lib/assessment-update-simple'

// GET /api/assessment/[id]/status - Get assessment update status for current user
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

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: numId },
      select: {
        id: true,
        title: true,
        description: true,
        periode: true,
        status: true,
        updatedAt: true
      }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    if (assessment.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Assessment belum dipublikasikan.' }, { status: 403 })
    }

    // Check for updates using simple timestamp comparison
    const updateStatus = await checkAssessmentUpdates(parseInt(session.user.id, 10), numId)

    return NextResponse.json({
      data: {
        assessment,
        updateStatus
      }
    })
  } catch (err) {
    console.error('[GET /api/assessment/[id]/status]', err)
    return NextResponse.json({ error: 'Gagal mengambil status assessment.' }, { status: 500 })
  }
}

// POST /api/assessment/[id]/status - Mark updates as viewed
export async function POST(
  req: NextRequest,
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

    const body = await req.json()
    const action = body.action

    if (action === 'mark_viewed') {
      // Mark user as having viewed the updates
      await markAssessmentAsViewed(parseInt(session.user.id, 10), numId)
      
      return NextResponse.json({ 
        message: 'Status berhasil diperbarui. Update telah ditandai sebagai sudah dilihat.' 
      })
    }

    return NextResponse.json({ error: 'Action tidak valid.' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/assessment/[id]/status]', err)
    return NextResponse.json({ error: 'Gagal memperbarui status.' }, { status: 500 })
  }
}