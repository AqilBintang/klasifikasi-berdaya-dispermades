import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkSafeToUpdate } from '@/lib/assessment-update-simple'

// GET /api/assessment/[id]/active-users - Check active users before update
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const safetyCheck = await checkSafeToUpdate(numId)

    return NextResponse.json({
      data: safetyCheck
    })
  } catch (err) {
    console.error('[GET /api/assessment/[id]/active-users]', err)
    return NextResponse.json({ error: 'Gagal memeriksa status active users.' }, { status: 500 })
  }
}