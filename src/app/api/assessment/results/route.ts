import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getKlasifikasi } from '@/lib/scoring'

// GET /api/assessment/results?assessmentId=1&periode=2025&page=1&limit=50
//
// Pagination di endpoint ini adalah per GROUP (kecamatan+assessment+periode),
// bukan per row. Karena grouping dilakukan di application layer (Prisma tidak
// mendukung GROUP BY + aggregasi dengan relasi kompleks tanpa raw SQL), kita
// fetch semua rows untuk filter yang diberikan, lalu paginate groups di server.
//
// ponytail: ceiling — jika satu assessmentId bisa memiliki ribuan kecamatan,
// fetch semua rows bisa berat. Upgrade path: raw SQL groupBy atau materialized
// view. Untuk skala saat ini (puluhan kecamatan per assessment), ini acceptable.
//
// Wajib: assessmentId ATAU periode harus diberikan untuk membatasi query.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assessmentId = searchParams.get('assessmentId')
    const periode      = searchParams.get('periode')
    const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit        = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    // Wajib ada setidaknya satu filter untuk mencegah dump seluruh tabel
    if (!assessmentId && !periode) {
      return NextResponse.json(
        { error: 'Filter assessmentId atau periode diperlukan.' },
        { status: 400 }
      )
    }

    const where = {
      status: { in: ['VALIDATED', 'SUBMITTED', 'REJECTED'] as ('VALIDATED' | 'SUBMITTED' | 'REJECTED')[] },
      ...(periode && { periode }),
      ...(assessmentId && {
        indicator: {
          category: { assessmentId: parseInt(assessmentId, 10) },
        },
      }),
    }

    // Fetch semua rows yang cocok — grouping di app layer
    const rows = await prisma.selfAssessment.findMany({
      where,
      include: {
        submittedBy: {
          select: {
            id: true, name: true,
            kabupaten: { select: { nama: true } },
            kecamatan: { select: { nama: true } },
          },
        },
        indicator: {
          include: {
            category: {
              include: {
                assessment: { select: { id: true, title: true } },
              },
            },
          },
        },
        validations: {
          orderBy: { validatedAt: 'desc' },
          take: 1,
          select: { validatedScore: true, status: true, notes: true, validatedAt: true },
        },
      },
      orderBy: [
        { indicator: { category: { order: 'asc' } } },
        { indicator: { number: 'asc' } },
      ],
    })

    // Group by (submittedById, assessmentId, periode)
    type GroupKey = string
    const grouped: Record<GroupKey, {
      user: { id: number; name: string; kecamatan: string | null; kabupaten: string | null }
      assessment: { id: number; title: string }
      periode: string
      categories: Record<string, {
        categoryId: number
        code: string
        name: string
        totalScore: number
        maxScore: number
        klasifikasi: string | null
        entries: typeof rows
      }>
      totalScore: number
      maxTotalScore: number
    }> = {}

    for (const r of rows) {
      const key = `${r.submittedById}_${r.indicator.category.assessmentId}_${r.periode}`

      if (!grouped[key]) {
        grouped[key] = {
          user: {
            ...r.submittedBy,
            kabupaten: r.submittedBy.kabupaten?.nama ?? null,
            kecamatan: r.submittedBy.kecamatan?.nama ?? null,
          },
          assessment: r.indicator.category.assessment,
          periode: r.periode,
          categories: {},
          totalScore: 0,
          maxTotalScore: 0,
        }
      }

      const catKey = r.indicator.categoryId.toString()
      if (!grouped[key].categories[catKey]) {
        grouped[key].categories[catKey] = {
          categoryId: r.indicator.categoryId,
          code:       r.indicator.category.code,
          name:       r.indicator.category.name,
          totalScore: 0,
          maxScore:   0,
          klasifikasi: null,
          entries:    [],
        }
      }

      const effectiveScore = r.validations[0]?.validatedScore ?? r.score
      grouped[key].categories[catKey].totalScore  += effectiveScore
      grouped[key].categories[catKey].maxScore    += r.indicator.maxScore
      grouped[key].categories[catKey].entries.push(r)
      grouped[key].totalScore    += effectiveScore
      grouped[key].maxTotalScore += r.indicator.maxScore
    }

    // Hitung klasifikasi per kategori
    for (const group of Object.values(grouped)) {
      for (const cat of Object.values(group.categories)) {
        cat.klasifikasi = getKlasifikasi(cat.totalScore, cat.maxScore) ?? null
      }
    }

    // Paginate groups (bukan rows)
    const allGroups = Object.values(grouped).map((g) => ({
      ...g,
      categories: Object.values(g.categories),
    }))

    const totalGroups = allGroups.length
    const skip        = (page - 1) * limit
    const data        = allGroups.slice(skip, skip + limit)

    return NextResponse.json({
      data,
      pagination: {
        total:      totalGroups,
        page,
        limit,
        totalPages: Math.ceil(totalGroups / limit),
      },
    })
  } catch (err) {
    console.error('[GET /api/assessment/results]', err)
    return NextResponse.json({ error: 'Gagal mengambil hasil.' }, { status: 500 })
  }
}
