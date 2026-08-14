import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { auditLog } from '@/lib/audit'

const updateSchema = z.object({
  description:   z.string().min(1).max(5000).trim().optional(),
  score:         z.number().int().min(1).max(4).optional(),
  supportingDoc: z.string().url().max(500).optional().nullable(),
  status:        z.enum(['DRAFT', 'SUBMITTED']).optional(),
})

// PATCH /api/assessment/self-assessment/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const numericId = parseInt(id, 10)

    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Cek record ada
    const existing = await prisma.selfAssessment.findUnique({
      where: { id: numericId },
      include: { indicator: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Self assessment tidak ditemukan.' }, { status: 404 })
    }

    // Ownership check: USER hanya boleh edit miliknya sendiri; ADMIN boleh edit semua
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && existing.submittedById !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    // Cegah edit jika sudah VALIDATED
    if (existing.status === 'VALIDATED') {
      return NextResponse.json(
        { error: 'Self assessment yang sudah divalidasi tidak dapat diubah.' },
        { status: 403 }
      )
    }

    // Validasi skor jika diupdate
    if (parsed.data.score !== undefined && parsed.data.score > existing.indicator.maxScore) {
      return NextResponse.json(
        { error: `Skor maksimal adalah ${existing.indicator.maxScore}.` },
        { status: 400 }
      )
    }

    const updated = await prisma.selfAssessment.update({
      where: { id: numericId },
      data: {
        ...parsed.data,
        ...(parsed.data.status === 'SUBMITTED' && { submittedAt: new Date() }),
      },
    })

    // Audit log jika status berubah ke SUBMITTED
    if (parsed.data.status === 'SUBMITTED' && existing.status !== 'SUBMITTED') {
      try {
        await auditLog.assessmentSubmitted(
          Number(session.user.id),
          existing.indicator.categoryId, // Use category ID as assessment reference
          req
        )
      } catch (err) {
        console.error('Failed to log assessment submission:', err)
      }
    }

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json(
      { error: 'Gagal memperbarui self assessment.' },
      { status: 500 }
    )
  }
}

// DELETE /api/assessment/self-assessment/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const numericId = parseInt(id, 10)

    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const existing = await prisma.selfAssessment.findUnique({
      where: { id: numericId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Self assessment tidak ditemukan.' }, { status: 404 })
    }

    // Ownership check: USER hanya boleh hapus miliknya sendiri; ADMIN boleh hapus semua
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && existing.submittedById !== parseInt(session.user.id, 10)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Hanya self assessment berstatus DRAFT yang dapat dihapus.' },
        { status: 403 }
      )
    }

    await prisma.selfAssessment.delete({ where: { id: numericId } })
    return NextResponse.json({ message: 'Self assessment berhasil dihapus.' })
  } catch {
    return NextResponse.json(
      { error: 'Gagal menghapus self assessment.' },
      { status: 500 }
    )
  }
}
