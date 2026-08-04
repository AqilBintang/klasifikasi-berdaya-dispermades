import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// GET /api/assessment/categories
// Hanya untuk user yang sudah login
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const categories = await prisma.assessmentCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        indicators: {
          orderBy: { number: 'asc' },
        },
      },
    })
    return NextResponse.json({ data: categories })
  } catch {
    return NextResponse.json(
      { error: 'Gagal mengambil data kategori.' },
      { status: 500 }
    )
  }
}
