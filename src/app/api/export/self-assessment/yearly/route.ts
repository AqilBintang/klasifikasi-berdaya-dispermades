import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildYearlyReportWorkbook } from '@/lib/export/self-assessment-export'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'USER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tahunParam = new URL(req.url).searchParams.get('tahun')
  const tahun = tahunParam ? parseInt(tahunParam, 10) : NaN
  if (isNaN(tahun) || tahun < 2000 || tahun > 2100) {
    return NextResponse.json({ error: 'Parameter tahun tidak valid' }, { status: 400 })
  }

  const userId = parseInt(session.user.id ?? '0', 10)
  if (!userId) return NextResponse.json({ error: 'User tidak valid' }, { status: 400 })

  try {
    const { buffer, filename } = await buildYearlyReportWorkbook(userId, tahun)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat laporan' }, { status: 500 })
  }
}
