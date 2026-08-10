import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getActiveUsers } from '@/lib/assessment-update-simple'

// PUT /api/assessment/[id]/revision - Set assessment ke REVISION (lock) atau kembali ke PUBLISHED (unlock)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const assessmentId = parseInt(id, 10)
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, status: true }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'lock') {
      // Hanya PUBLISHED yang bisa di-lock ke REVISION
      if (assessment.status !== 'PUBLISHED') {
        return NextResponse.json({
          error: `Assessment berstatus ${assessment.status}, tidak perlu di-lock.`
        }, { status: 400 })
      }

      // Info: siapa yang sedang aktif (bukan blocker, hanya informasi)
      const activeUsers = await getActiveUsers(assessmentId)

      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'REVISION' }
      })

      return NextResponse.json({
        message: 'Assessment dikunci untuk revision. User yang sedang mengisi dapat menyelesaikan pengisian, lalu akan diminta revisi.',
        activeUsers: activeUsers.length,
        activeUserNames: activeUsers.map(u => u.userName)
      })
    }

    if (action === 'unlock') {
      // Setelah admin selesai publish, buka kembali
      if (assessment.status !== 'REVISION') {
        return NextResponse.json({
          error: `Assessment tidak dalam status REVISION.`
        }, { status: 400 })
      }

      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: 'PUBLISHED' }
      })

      return NextResponse.json({
        message: 'Assessment dipublish kembali.'
      })
    }

    return NextResponse.json({ error: 'Action tidak valid. Gunakan "lock" atau "unlock".' }, { status: 400 })
  } catch (err) {
    console.error('[PUT /api/assessment/[id]/revision]', err)
    return NextResponse.json({ error: 'Gagal mengubah status revision.' }, { status: 500 })
  }
}
