import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getKlasifikasi, calcCategoryScore } from '@/lib/scoring'

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
        submittedBy: { select: { id: true, name: true, kecamatan: true, kabupaten: true } },
        indicator: {
          include: {
            category: {
              include: {
                assessment: { select: { id: true, title: true } },
              },
            },
          },
        },
        validations: {
          orderBy: { validatedAt: 'desc' },
          take: 1,
          select: { validatedScore: true, status: true, notes: true, validatedAt: true },
        },
      },
      orderBy: [
        { indicator: { category: { order: 'asc' } } },
        { indicator: { number: 'asc' } },
      ],
    })

    // Group by kecamatan (submittedBy) + assessment + periode
    type GroupKey = string
    const grouped: Record<GroupKey, {
      user: { id: number; name: string; kecamatan: string | null; kabupaten: string | null }
      assessment: { id: number; title: string }
      periode: string
      categories: Record<string, {
        categoryId: number
        code: string
        name: string
        totalScore: number
        maxScore: number
        klasifikasi: string | null
        entries: typeof results
      }>
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
          categories: {},
          totalScore: 0,
          maxTotalScore: 0,
        }
      }

      const catKey = r.indicator.categoryId.toString()
      if (!grouped[key].categories[catKey]) {
        grouped[key].categories[catKey] = {
          categoryId: r.indicator.categoryId,
          code:       r.indicator.category.code,
          name:       r.indicator.category.name,
          totalScore: 0,
          maxScore:   0,
          klasifikasi: '',
          entries:    [],
        }
      }

      const effectiveScore = r.validations[0]?.validatedScore ?? r.score
      grouped[key].categories[catKey].totalScore  += effectiveScore
      grouped[key].categories[catKey].maxScore    += r.indicator.maxScore
      grouped[key].categories[catKey].entries.push(r)
      grouped[key].totalScore    += effectiveScore
      grouped[key].maxTotalScore += r.indicator.maxScore
    }

    // Hitung klasifikasi per kategori — hanya jika maxScore >= 64
    for (const group of Object.values(grouped)) {
      for (const cat of Object.values(group.categories)) {
        const klasifikasi = getKlasifikasi(cat.totalScore, cat.maxScore)
        cat.klasifikasi = klasifikasi ?? null  // null = tidak berlaku
      }
    }

    const data = Object.values(grouped).map((g) => ({
      ...g,
      categories: Object.values(g.categories),
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/assessment/results]', err)
    return NextResponse.json({ error: 'Gagal mengambil hasil.' }, { status: 500 })
  }
}
