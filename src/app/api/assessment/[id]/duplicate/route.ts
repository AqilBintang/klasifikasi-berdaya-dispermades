import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const schema = z.object({
  periode: z.string().min(1).max(20).regex(/^[\w\-. ]+$/, 'Periode tidak valid').trim(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const sourceId = parseInt(id, 10)
  if (!sourceId) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', details: parsed.error.flatten() }, { status: 400 })
  }
  const { periode } = parsed.data

  // Ambil source assessment lengkap
  const source = await prisma.assessment.findUnique({
    where: { id: sourceId },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: {
          indicators: { orderBy: { number: 'asc' } },
        },
      },
    },
  })
  if (!source) return NextResponse.json({ error: 'Assessment tidak ditemukan' }, { status: 404 })

  // Duplikasi dalam satu transaksi
  const duplicated = await prisma.$transaction(async (tx) => {
    const newAssessment = await tx.assessment.create({
      data: {
        title:       source.title,
        description: source.description,
        periode,
        status:      'DRAFT',
      },
    })

    for (const cat of source.categories) {
      const newCat = await tx.assessmentCategory.create({
        data: {
          assessmentId: newAssessment.id,
          code:         cat.code,
          name:         cat.name,
          description:  cat.description,
          order:        cat.order,
        },
      })

      if (cat.indicators.length > 0) {
        await tx.assessmentIndicator.createMany({
          data: cat.indicators.map((ind) => ({
            categoryId: newCat.id,
            number:     ind.number,
            indicator:  ind.indicator,
            maxScore:   ind.maxScore,
          })),
        })
      }
    }

    return newAssessment
  })

  return NextResponse.json({ data: duplicated }, { status: 201 })
}
