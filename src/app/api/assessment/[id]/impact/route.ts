import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { assessmentMigrationService } from '@/lib/assessment-migration'
import { z } from 'zod'

const bodySchema = z.object({
  changes: z.array(z.object({
    type: z.enum(['ADDED', 'MODIFIED', 'REMOVED']),
    indicatorId: z.number().optional(),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    requiresResubmit: z.boolean().optional(),
  })),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const assessmentId = Number(id)
  if (isNaN(assessmentId)) {
    return NextResponse.json({ error: 'Invalid assessment ID' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const impact = await assessmentMigrationService.analyzeUpdateImpact(assessmentId, parsed.data.changes)
    return NextResponse.json(impact)
  } catch (err) {
    console.error('Failed to analyze impact:', err)
    return NextResponse.json({ error: 'Gagal menganalisis dampak' }, { status: 500 })
  }
}
