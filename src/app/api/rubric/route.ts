import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const rubricItemSchema = z.object({
  indicatorId: z.number().int().positive(),
  score1: z.string().min(1).max(2000).trim(),
  score2: z.string().min(1).max(2000).trim(),
  score3: z.string().min(1).max(2000).trim(),
  score4: z.string().min(1).max(2000).trim(),
})

const createRubricSchema = z.object({
  assessmentId: z.number().int().positive(),
  title:        z.string().min(1).max(255).trim(),
  description:  z.string().max(2000).trim().optional(),
  items:        z.array(rubricItemSchema).min(1),
})

// GET /api/rubric?assessmentId=1
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const assessmentId = searchParams.get('assessmentId')

    const rubrics = await prisma.assessmentRubric.findMany({
      where: assessmentId ? { assessmentId: parseInt(assessmentId, 10) } : undefined,
      include: {
        items: {
          include: {
            indicator: {
              include: {
                category: { select: { id: true, code: true, name: true, order: true } },
              },
            },
          },
          orderBy: { indicator: { number: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: rubrics })
  } catch (err) {
    console.error('[GET /api/rubric]', err)
    return NextResponse.json({ error: 'Gagal mengambil data rubrik.' }, { status: 500 })
  }
}

// POST /api/rubric
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const parsed = createRubricSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { assessmentId, title, description, items } = parsed.data

    const rubric = await prisma.$transaction(async (tx) => {
      const created = await tx.assessmentRubric.create({
        data: { assessmentId, title, description },
      })
      await tx.rubricItem.createMany({
        data: items.map((item) => ({
          rubricId:    created.id,
          indicatorId: item.indicatorId,
          score1:      item.score1,
          score2:      item.score2,
          score3:      item.score3,
          score4:      item.score4,
        })),
      })
      return tx.assessmentRubric.findUnique({
        where: { id: created.id },
        include: { items: { include: { indicator: true } } },
      })
    })

    return NextResponse.json({ data: rubric }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rubric]', err)
    return NextResponse.json({ error: 'Gagal membuat rubrik.' }, { status: 500 })
  }
}
