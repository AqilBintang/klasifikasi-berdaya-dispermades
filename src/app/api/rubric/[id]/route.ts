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

const updateRubricSchema = z.object({
  title:       z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  items:       z.array(rubricItemSchema).min(1).optional(),
})

// GET /api/rubric/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const rubric = await prisma.assessmentRubric.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        items: {
          include: {
            indicator: {
              include: { category: true },
            },
          },
          orderBy: { indicator: { number: 'asc' } },
        },
      },
    })
    if (!rubric) return NextResponse.json({ error: 'Rubrik tidak ditemukan.' }, { status: 404 })
    return NextResponse.json({ data: rubric })
  } catch (err) {
    console.error('[GET /api/rubric/[id]]', err)
    return NextResponse.json({ error: 'Gagal mengambil rubrik.' }, { status: 500 })
  }
}

// PATCH /api/rubric/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { id } = await params
    const numId = parseInt(id, 10)
    const body = await req.json()
    const parsed = updateRubricSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { title, description, items } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      await tx.assessmentRubric.update({
        where: { id: numId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
        },
      })

      if (items) {
        // Hapus semua items lama lalu buat ulang
        await tx.rubricItem.deleteMany({ where: { rubricId: numId } })
        await tx.rubricItem.createMany({
          data: items.map((item) => ({
            rubricId: numId,
            indicatorId: item.indicatorId,
            score1: item.score1,
            score2: item.score2,
            score3: item.score3,
            score4: item.score4,
          })),
        })
      }

      return tx.assessmentRubric.findUnique({
        where: { id: numId },
        include: { items: { include: { indicator: true } } },
      })
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/rubric/[id]]', err)
    return NextResponse.json({ error: 'Gagal memperbarui rubrik.' }, { status: 500 })
  }
}

// DELETE /api/rubric/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const { id } = await params
    await prisma.assessmentRubric.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Rubrik berhasil dihapus.' })
  } catch (err) {
    console.error('[DELETE /api/rubric/[id]]', err)
    return NextResponse.json({ error: 'Gagal menghapus rubrik.' }, { status: 500 })
  }
}
