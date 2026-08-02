import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const indicatorSchema = z.object({
  id:        z.number().int().positive().optional(),  // ada jika existing
  number:    z.number().int().positive(),
  indicator: z.string().min(1).max(2000).trim(),
  maxScore:  z.number().int().min(1).max(10).default(4),
})

const categorySchema = z.object({
  id:          z.number().int().positive().optional(),
  code:        z.string().min(1).max(10).trim().toUpperCase(),
  name:        z.string().min(1).max(255).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  order:       z.number().int().min(0).default(0),
  indicators:  z.array(indicatorSchema).min(1),
})

const updateSchema = z.object({
  title:       z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  periode:     z.string().min(4).max(20).regex(/^[\w-]+$/).optional(),
  status:      z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  categories:  z.array(categorySchema).min(1).optional(),
})

// GET /api/assessment/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    const assessment = await prisma.assessment.findUnique({
      where: { id: numId },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: { indicators: { orderBy: { number: 'asc' } } },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    // Cek apakah ada jawaban (locked)
    const answerCount = await prisma.selfAssessment.count({
      where: {
        indicator: { category: { assessmentId: numId } },
      },
    })

    return NextResponse.json({ data: { ...assessment, isLocked: answerCount > 0, answerCount } })
  } catch (err) {
    console.error('[GET /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 })
  }
}

// PATCH /api/assessment/[id] — update info dasar + rebuild categories
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    const existing = await prisma.assessment.findUnique({ where: { id: numId } })
    if (!existing) return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { title, description, periode, status, categories } = parsed.data

    // Cek apakah ada kecamatan yang sudah mengisi — jika ada, lock semua perubahan
    if (categories || title !== undefined || description !== undefined || periode !== undefined) {
      const answerCount = await prisma.selfAssessment.count({
        where: {
          indicator: {
            category: { assessmentId: numId },
          },
        },
      })
      if (answerCount > 0) {
        return NextResponse.json(
          {
            error: 'Assessment terkunci. Sudah ada kecamatan yang mengisi assessment ini sehingga tidak dapat diedit.',
            locked: true,
            answerCount,
          },
          { status: 423 } // 423 Locked
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update info dasar
      await tx.assessment.update({
        where: { id: numId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(periode !== undefined && { periode }),
          ...(status !== undefined && { status }),
        },
      })

      // Jika categories dikirim — hapus lama dan buat ulang
      if (categories) {
        await tx.assessmentCategory.deleteMany({ where: { assessmentId: numId } })
        await tx.assessmentCategory.createMany({
          data: categories.map((cat) => ({
            assessmentId: numId,
            code: cat.code,
            name: cat.name,
            description: cat.description ?? null,
            order: cat.order,
          })),
        })

        // Ambil ulang categories yang baru dibuat
        const newCats = await tx.assessmentCategory.findMany({
          where: { assessmentId: numId },
          orderBy: { order: 'asc' },
        })

        // Buat indicators per kategori
        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i]
          const dbCat = newCats[i]
          if (dbCat && cat.indicators.length > 0) {
            await tx.assessmentIndicator.createMany({
              data: cat.indicators.map((ind) => ({
                categoryId: dbCat.id,
                number: ind.number,
                indicator: ind.indicator,
                maxScore: ind.maxScore,
              })),
            })
          }
        }
      }

      return tx.assessment.findUnique({
        where: { id: numId },
        include: {
          categories: {
            orderBy: { order: 'asc' },
            include: { indicators: { orderBy: { number: 'asc' } } },
          },
        },
      })
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal memperbarui assessment.' }, { status: 500 })
  }
}

// DELETE /api/assessment/[id]
export async function DELETE(
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
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    // Cek lock sebelum hapus
    const answerCount = await prisma.selfAssessment.count({
      where: {
        indicator: { category: { assessmentId: numId } },
      },
    })
    if (answerCount > 0) {
      return NextResponse.json(
        {
          error: 'Assessment tidak dapat dihapus karena sudah ada kecamatan yang mengisi.',
          locked: true,
          answerCount,
        },
        { status: 423 }
      )
    }

    await prisma.assessment.delete({ where: { id: numId } })
    return NextResponse.json({ message: 'Assessment berhasil dihapus.' })  } catch (err) {
    console.error('[DELETE /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal menghapus assessment.' }, { status: 500 })
  }
}
