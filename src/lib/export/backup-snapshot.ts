import { prisma } from '@/lib/prisma'
import { getKlasifikasi, getStatusAkhir } from '@/lib/scoring'

type SnapshotIndicator = {
  number: number
  indicator: string
  maxScore: number
  description: string
  supportingDoc: string | null
  score: number
  validatedScore: number | null
  effectiveScore: number
}

type SnapshotCategory = {
  code: string
  name: string
  order: number
  totalScore: number
  maxScore: number
  klasifikasi: string | null
  indicators: SnapshotIndicator[]
}

type BackupSnapshot = {
  assessmentTitle: string
  periode: string
  tahun: number | null
  kabupaten: string | null
  kecamatan: string | null
  categories: SnapshotCategory[]
  totalScore: number
  maxPossibleTotal: number
  statusAkhir: string | null
}

function toYearFromPeriode(periode: string): number | null {
  const years = periode.match(/\d{4}/g)
  if (!years || years.length === 0) return null
  const year = Number.parseInt(years[years.length - 1] ?? '', 10)
  return Number.isNaN(year) ? null : year
}

export async function upsertBackupIfComplete(input: { submittedById: number; periode: string; assessmentId: number }) {
  const totalIndicators = await prisma.assessmentIndicator.count({
    where: { category: { assessmentId: input.assessmentId } },
  })

  const validatedIndicators = await prisma.selfAssessment.count({
    where: {
      submittedById: input.submittedById,
      periode: input.periode,
      status: 'VALIDATED',
      indicator: { category: { assessmentId: input.assessmentId } },
    },
  })

  if (totalIndicators === 0 || validatedIndicators !== totalIndicators) return { ok: false as const }

  const entries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: input.submittedById,
      periode: input.periode,
      status: 'VALIDATED',
      indicator: { category: { assessmentId: input.assessmentId } },
    },
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
          category: { include: { assessment: { select: { id: true, title: true } } } },
        },
      },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
    orderBy: [
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  const first = entries[0]
  if (!first) return { ok: false as const }

  const assessmentTitle = first.indicator.category.assessment.title
  const kecamatan = first.submittedBy.kecamatan?.nama ?? null
  const kabupaten = first.submittedBy.kabupaten?.nama ?? null
  if (!kecamatan) return { ok: false as const }

  const categoryMap = new Map<number, SnapshotCategory>()
  let totalScore = 0
  let maxPossibleTotal = 0

  for (const e of entries) {
    const cat = e.indicator.category
    const validatedScore = e.validations[0]?.validatedScore ?? null
    const effectiveScore = validatedScore ?? e.score

    totalScore += effectiveScore
    maxPossibleTotal += e.indicator.maxScore

    if (!categoryMap.has(cat.id)) {
      categoryMap.set(cat.id, {
        code: cat.code,
        name: cat.name,
        order: cat.order,
        totalScore: 0,
        maxScore: 0,
        klasifikasi: null,
        indicators: [],
      })
    }

    const g = categoryMap.get(cat.id)!
    g.totalScore += effectiveScore
    g.maxScore += e.indicator.maxScore
    g.indicators.push({
      number: e.indicator.number,
      indicator: e.indicator.indicator,
      maxScore: e.indicator.maxScore,
      description: e.description,
      supportingDoc: e.supportingDoc ?? null,
      score: e.score,
      validatedScore,
      effectiveScore,
    })
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => a.order - b.order)
  for (const c of categories) {
    c.klasifikasi = getKlasifikasi(c.totalScore, c.maxScore)
  }

  const statusAkhir = getStatusAkhir(totalScore, maxPossibleTotal)

  const snapshot: BackupSnapshot = {
    assessmentTitle,
    periode: input.periode,
    tahun: toYearFromPeriode(input.periode),
    kabupaten,
    kecamatan,
    categories,
    totalScore,
    maxPossibleTotal,
    statusAkhir,
  }

  await prisma.assessmentBackup.upsert({
    where: { assessmentTitle_periode_kecamatan: { assessmentTitle, periode: input.periode, kecamatan } },
    create: {
      assessmentTitle,
      periode: input.periode,
      tahun: snapshot.tahun,
      kabupaten,
      kecamatan,
      totalScore,
      maxPossibleTotal,
      statusAkhir,
      snapshot: snapshot as any,
    },
    update: {
      tahun: snapshot.tahun,
      kabupaten,
      totalScore,
      maxPossibleTotal,
      statusAkhir,
      snapshot: snapshot as any,
    },
  })

  return { ok: true as const }
}

export async function upsertBackupsForSelfAssessmentIds(selfAssessmentIds: number[]) {
  const submissions = await prisma.selfAssessment.findMany({
    where: { id: { in: selfAssessmentIds } },
    select: {
      submittedById: true,
      periode: true,
      indicator: { select: { category: { select: { assessmentId: true } } } },
    },
  })

  const keys = new Map<string, { submittedById: number; periode: string; assessmentId: number }>()
  for (const s of submissions) {
    const assessmentId = s.indicator.category.assessmentId
    const k = `${s.submittedById}_${assessmentId}_${s.periode}`
    if (!keys.has(k)) keys.set(k, { submittedById: s.submittedById, periode: s.periode, assessmentId })
  }

  const results: Array<{ submittedById: number; periode: string; assessmentId: number; ok: boolean }> = []
  for (const key of keys.values()) {
    const r = await upsertBackupIfComplete(key)
    results.push({ ...key, ok: r.ok })
  }
  return results
}

export async function deleteBackupForGroup(input: { submittedById: number; periode: string; assessmentId: number }) {
  const [user, assessment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.submittedById },
      select: { kecamatan: { select: { nama: true } } },
    }),
    prisma.assessment.findUnique({ where: { id: input.assessmentId }, select: { title: true } }),
  ])

  const kecamatan = user?.kecamatan?.nama ?? null
  const assessmentTitle = assessment?.title ?? null
  if (!kecamatan || !assessmentTitle) return

  await prisma.assessmentBackup.deleteMany({
    where: { assessmentTitle, periode: input.periode, kecamatan },
  })
}

export async function deleteBackupsForSelfAssessmentIds(selfAssessmentIds: number[]) {
  const submissions = await prisma.selfAssessment.findMany({
    where: { id: { in: selfAssessmentIds } },
    select: {
      submittedById: true,
      periode: true,
      indicator: { select: { category: { select: { assessmentId: true } } } },
    },
  })

  const keys = new Map<string, { submittedById: number; periode: string; assessmentId: number }>()
  for (const s of submissions) {
    const assessmentId = s.indicator.category.assessmentId
    const k = `${s.submittedById}_${assessmentId}_${s.periode}`
    if (!keys.has(k)) keys.set(k, { submittedById: s.submittedById, periode: s.periode, assessmentId })
  }

  for (const key of keys.values()) {
    await deleteBackupForGroup(key)
  }
}
