import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name:     z.string().min(1).max(100).trim().optional(),
  role:     z.enum(['ADMIN', 'VALIDATOR', 'USER']).optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: numId },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    return NextResponse.json({ data: user })
  } catch (err) {
    console.error('[PATCH /api/users/[id]]', err)
    return NextResponse.json({ error: 'Gagal memperbarui user.' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — soft delete (set isActive = false)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    await prisma.user.update({
      where: { id: numId },
      data: { isActive: false },
    })
    return NextResponse.json({ message: 'User dinonaktifkan.' })
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Gagal menonaktifkan user.' }, { status: 500 })
  }
}
