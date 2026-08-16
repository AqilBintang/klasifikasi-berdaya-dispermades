import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { auditLog } from '@/lib/audit'

const updateSchema = z.object({
  name:           z.string().min(1).max(100).trim().optional(),
  role:           z.nativeEnum(UserRole).optional(),
  isActive:       z.boolean().optional(),
  password:       z.string().min(8).max(100).optional(),
  kabupatenKode:  z.string().max(13).trim().optional(),
  kecamatanKode:  z.string().max(13).trim().optional(),
})

// PATCH /api/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    // Get target user untuk authorization check — ambil semua field yang dibutuhkan sekaligus
    const targetUser = await prisma.user.findUnique({
      where: { id: numId },
      select: { role: true, name: true, email: true, isActive: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 })
    }

    // Self-modification protection: tidak boleh menonaktifkan atau mengubah role diri sendiri
    if (numId === Number(session.user.id)) {
      if (parsed.data.isActive === false) {
        return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, { status: 403 })
      }
      if (parsed.data.role && parsed.data.role !== targetUser.role) {
        return NextResponse.json({ error: 'Tidak dapat mengubah role akun sendiri.' }, { status: 403 })
      }
    }

    // Authorization: ADMIN tidak bisa update SUPER_ADMIN atau ADMIN
    if (session.user.role === 'ADMIN' && (targetUser.role === UserRole.SUPER_ADMIN || targetUser.role === UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk mengubah user ini.' }, { status: 403 })
    }

    // ADMIN tidak bisa set role ke SUPER_ADMIN atau ADMIN
    if (session.user.role === 'ADMIN' && parsed.data.role && (parsed.data.role === UserRole.SUPER_ADMIN || parsed.data.role === UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk mengubah ke role tersebut.' }, { status: 403 })
    }

    // SUPER_ADMIN tidak bisa mengubah akun SUPER_ADMIN lain
    if (session.user.role === 'SUPER_ADMIN' && targetUser.role === UserRole.SUPER_ADMIN && numId !== Number(session.user.id)) {
      return NextResponse.json({ error: 'Tidak dapat mengubah akun Super Admin lain.' }, { status: 403 })
    }

    // Handle wilayah updates
    let kabupatenId: number | null = null
    let kecamatanId: number | null = null
    let kabupatenName: string | null = null
    let kecamatanName: string | null = null

    if (parsed.data.kabupatenKode !== undefined) {
      if (parsed.data.kabupatenKode) {
        const kab = await prisma.wilayah.findUnique({
          where: { kode: parsed.data.kabupatenKode },
          select: { id: true, nama: true },
        })
        if (!kab) return NextResponse.json({ error: 'Kabupaten/kota tidak ditemukan.' }, { status: 400 })
        kabupatenId = kab.id
        kabupatenName = kab.nama
      } else {
        kabupatenId = null
        kabupatenName = null
      }
    }

    if (parsed.data.kecamatanKode !== undefined) {
      if (parsed.data.kecamatanKode) {
        const kec = await prisma.wilayah.findUnique({
          where: { kode: parsed.data.kecamatanKode },
          select: { id: true, nama: true },
        })
        if (!kec) return NextResponse.json({ error: 'Kecamatan tidak ditemukan.' }, { status: 400 })
        kecamatanId = kec.id
        kecamatanName = kec.nama
      } else {
        kecamatanId = null
        kecamatanName = null
      }
    }

    const user = await prisma.user.update({
      where: { id: numId },
      data: {
        ...(parsed.data.name     !== undefined && { name:     parsed.data.name }),
        ...(parsed.data.role     !== undefined && { role:     parsed.data.role }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        ...(parsed.data.password !== undefined && {
          passwordHash: await bcrypt.hash(parsed.data.password, 12),
        }),
        ...(parsed.data.kabupatenKode !== undefined && { 
          kabupatenId,
          kabupatenName,
        }),
        ...(parsed.data.kecamatanKode !== undefined && { 
          kecamatanId,
          kecamatanName,
        }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    // Audit log
    try {
      const changes: Record<string, { from: unknown; to: unknown }> = {}
      if (parsed.data.name && parsed.data.name !== targetUser.name) {
        changes.name = { from: targetUser.name, to: parsed.data.name }
      }
      if (parsed.data.role && parsed.data.role !== targetUser.role) {
        changes.role = { from: targetUser.role, to: parsed.data.role }
        await auditLog.roleChanged(
          Number(session.user.id),
          numId,
          { fromRole: targetUser.role, toRole: parsed.data.role },
          req
        )
      }
      if (parsed.data.isActive !== undefined) {
        changes.isActive = { from: targetUser.isActive, to: parsed.data.isActive }
        // Catat USER_DEACTIVATED jika status berubah dari aktif ke nonaktif
        if (parsed.data.isActive === false && targetUser.isActive === true) {
          await auditLog.userDeactivated(Number(session.user.id), numId, req)
        }
      }

      if (Object.keys(changes).length > 0) {
        await auditLog.userUpdated(Number(session.user.id), numId, changes, req)
      }
    } catch (err) {
      console.error('Failed to log user update:', err)
    }

    return NextResponse.json({ data: user })
  } catch (err) {
    console.error('[PATCH /api/users/[id]]', err)
    return NextResponse.json({ error: 'Gagal memperbarui user.' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — soft delete (set isActive = false)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    // Self-deactivation protection
    if (numId === Number(session.user.id)) {
      return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: numId },
      select: { role: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 })
    }

    // Authorization: ADMIN tidak bisa delete SUPER_ADMIN atau ADMIN
    if (session.user.role === 'ADMIN' && (targetUser.role === UserRole.SUPER_ADMIN || targetUser.role === UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk menonaktifkan user ini.' }, { status: 403 })
    }

    // SUPER_ADMIN tidak bisa menonaktifkan SUPER_ADMIN lain
    if (session.user.role === 'SUPER_ADMIN' && targetUser.role === UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun Super Admin lain.' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: numId },
      data: { isActive: false },
    })

    try {
      await auditLog.userDeactivated(Number(session.user.id), numId, req)
    } catch (err) {
      console.error('Failed to log user deactivation:', err)
    }

    return NextResponse.json({ message: 'User dinonaktifkan.' })
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Gagal menonaktifkan user.' }, { status: 500 })
  }
}
