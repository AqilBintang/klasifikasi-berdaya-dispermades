import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildSelfAssessmentWorkbook } from '@/lib/export/self-assessment-export'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const assessmentId = parseInt(searchParams.get('assessmentId') ?? '0', 10)
  const periode      = searchParams.get('periode') ?? ''

  if (!assessmentId || !periode) {
    return NextResponse.json({ error: 'assessmentId dan periode wajib diisi' }, { status: 400 })
  }

  const userId = parseInt(session.user.id ?? '0', 10)
  if (!userId) return NextResponse.json({ error: 'User tidak valid' }, { status: 400 })

  try {
    const { buffer, filename } = await buildSelfAssessmentWorkbook(userId, assessmentId, periode)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal membuat export'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
