import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const indicatorSchema = z.object({
  number:    z.number().int().positive(),
  indicator: z.string().min(1).max(2000).trim(),
  maxScore:  z.number().int().min(1).max(10).default(4),
})

const categorySchema = z.object({
  code:        z.string().min(1).max(10).trim().toUpperCase(),
  name:        z.string().min(1).max(255).trim(),
  description: z.string().max(2000).trim().optional(),
  order:       z.number().int().min(0).default(0),
  indicators:  z.array(indicatorSchema).min(1),
})

const createAssessmentSchema = z.object({
  title:       z.string().min(1).max(255).trim(),
  description: z.string().max(2000).trim().optional(),
  periode:     z.string().min(4).max(20).regex(/^[\w-]+$/),
  status:      z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  categories:  z.array(categorySchema).min(1),
})

// GET /api/assessment
export async function GET() {
  try {
    const assessments = await prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            indicators: { orderBy: { number: 'asc' } },
          },
        },
      },
    })
    return NextResponse.json({ data: assessments })
  } catch (err) {
    console.error('[GET /api/assessment]', err)
    return NextResponse.json({ error: 'Gagal mengambil data assessment.' }, { status: 500 })
  }
}

// POST /api/assessment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createAssessmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { title, description, periode, status, categories } = parsed.data

    const assessment = await prisma.$transaction(async (tx) => {
      return tx.assessment.create({
        data: {
          title,
          description,
          periode,
          status,
          categories: {
            create: categories.map((cat) => ({
              code: cat.code,
              name: cat.name,
              description: cat.description,
              order: cat.order,
              indicators: {
                create: cat.indicators.map((ind) => ({
                  number: ind.number,
                  indicator: ind.indicator,
                  maxScore: ind.maxScore,
                })),
              },
            })),
          },
        },
        include: {
          categories: {
            include: { indicators: true },
          },
        },
      })
    })

    return NextResponse.json({ data: assessment }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/assessment] Error:', err)
    return NextResponse.json({ error: 'Gagal membuat assessment.' }, { status: 500 })
  }
}
