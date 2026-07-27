import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assessment/results?assessmentId=1&periode=2025
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const assessmentId = searchParams.get('assessmentId')
    const periode      = searchParams.get('periode')

    const results = await prisma.selfAssessment.findMany({
      where: {
        status: { in: ['VALIDATED', 'SUBMITTED', 'REJECTED'] },
        ...(periode && { periode }),
        ...(assessmentId && {
          indicator: {
            category: { assessmentId: parseInt(assessmentId, 10) },
          },
        }),
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
        indicator: {
          include: {
            category: {
              include: { assessment: { select: { id: true, title: true } } },
            },
          },
        },
        validations: {
          orderBy: { validatedAt: 'desc' },
          take: 1,
          include: { validator: { select: { id: true, name: true } } },
        },
      },
      orderBy: [
        { indicator: { category: { order: 'asc' } } },
        { indicator: { number: 'asc' } },
      ],
    })

    // Group by submittedBy + assessment
    const grouped: Record<string, {
      user: { id: number; name: string }
      assessment: { id: number; title: string }
      periode: string
      entries: typeof results
      totalScore: number
      maxTotalScore: number
    }> = {}

    for (const r of results) {
      const key = `${r.submittedById}_${r.indicator.category.assessmentId}_${r.periode}`
      if (!grouped[key]) {
        grouped[key] = {
          user: r.submittedBy,
          assessment: r.indicator.category.assessment,
          periode: r.periode,
          entries: [],
          totalScore: 0,
          maxTotalScore: 0,
        }
      }
      grouped[key].entries.push(r)
      grouped[key].totalScore += r.validations[0]?.validatedScore ?? r.score
      grouped[key].maxTotalScore += r.indicator.maxScore
    }

    return NextResponse.json({ data: Object.values(grouped) })
  } catch (err) {
    console.error('[GET /api/assessment/results]', err)
    return NextResponse.json({ error: 'Gagal mengambil hasil.' }, { status: 500 })
  }
}
