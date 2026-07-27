import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/assessment/categories
// Ambil semua kategori beserta indikatornya
export async function GET() {
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
