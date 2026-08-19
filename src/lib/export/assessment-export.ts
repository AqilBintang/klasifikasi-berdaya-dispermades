import { prisma } from '@/lib/prisma'
import { getStatusAkhir, type KlasifikasiLevel } from '@/lib/scoring'

export type CategoryScore = {
  code: string
  name: string
  order: number
  score: number
  maxScore: number
}

export type RekapStatusAkhirRow = {
  userId: number
  userName: string
  kabupaten: string | null
  kecamatan: string | null
  assessmentId: number
  assessmentTitle: string
  periode: string
  tahun: number | null
  totalScore: number
  maxPossibleTotal: number
  categoryScores: CategoryScore[]
  statusAkhir: KlasifikasiLevel | null
}

export type KecamatanDetailRow = {
  kabupaten: string | null
  kecamatan: string | null
  userId: number
  userName: string
  assessmentId: number
  assessmentTitle: string
  periode: string
  tahun: number | null
  categoryCode: string
  categoryName: string
  categoryOrder: number
  indicatorNumber: number
  indicatorText: string
  indicatorMaxScore: number
  description: string
  supportingDoc: string | null
  score: number
  validatedScore: number | null
  effectiveScore: number
  status: string
  validationStatus: string | null
  validationNotes: string | null
  validatedAt: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

function toYearFromPeriode(periode: string): number | null {
  const years = periode.match(/\d{4}/g)
  if (!years || years.length === 0) return null
  const year = Number.parseInt(years[years.length - 1] ?? '', 10)
  return Number.isNaN(year) ? null : year
}

export async function buildRekapStatusAkhir(filters?: {
  assessmentId?: number
  periode?: string
  kecamatanId?: number
  kabupatenId?: number
}) {
  const entries = await prisma.selfAssessment.findMany({
    where: {
      status: 'VALIDATED',
      ...(filters?.periode ? { periode: filters.periode } : {}),
      ...(filters?.assessmentId
        ? { indicator: { category: { assessmentId: filters.assessmentId } } }
        : {}),
      ...(filters?.kecamatanId ? { submittedBy: { kecamatanId: filters.kecamatanId } } : {}),
      ...(filters?.kabupatenId ? { submittedBy: { kabupatenId: filters.kabupatenId } } : {}),
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
        select: {
          maxScore: true,
          versionId: true,
          version: { select: { versionNumber: true } },
          category: {
            select: {
              code: true,
              name: true,
              order: true,
              assessmentId: true,
              assessment: { select: { title: true } },
            },
          },
        },
      },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
    orderBy: [
      { submittedById: 'asc' },
      { periode: 'asc' },
      { indicator: { category: { assessmentId: 'asc' } } },
    ],
  })

  const indicatorCountsByVersion = new Map(
    (await prisma.assessmentVersion.findMany({
      where: { id: { in: [...new Set(entries.map((entry) => entry.indicator.versionId))] } },
      select: { id: true, indicators: { select: { id: true } } },
    })).map((version) => [version.id, version.indicators.length])
  )

  type RekapGroup = Omit<RekapStatusAkhirRow, 'statusAkhir' | 'categoryScores'> & {
    versionId: number
    versionNumber: number
    indicatorCount: number
    catMap: Record<string, CategoryScore>
  }
  const map: Record<string, RekapGroup> = {}

  for (const e of entries) {
    const cat = e.indicator.category
    const assessmentId = cat.assessmentId
    const key = `${e.submittedById}_${assessmentId}_${e.periode}_${e.indicator.versionId}`
    const effScore = e.validations[0]?.validatedScore ?? e.score

    if (!map[key]) {
      map[key] = {
        userId: e.submittedById,
        userName: e.submittedBy.name,
        kabupaten: e.submittedBy.kabupaten?.nama ?? null,
        kecamatan: e.submittedBy.kecamatan?.nama ?? null,
        assessmentId,
        assessmentTitle: cat.assessment.title,
        periode: e.periode,
        tahun: toYearFromPeriode(e.periode),
        versionId: e.indicator.versionId,
        versionNumber: e.indicator.version.versionNumber,
        indicatorCount: 0,
        totalScore: 0,
        maxPossibleTotal: 0,
        catMap: {},
      }
    }

    const row = map[key]!
    row.indicatorCount += 1
    row.totalScore += effScore
    row.maxPossibleTotal += e.indicator.maxScore

    if (!row.catMap[cat.code]) {
      row.catMap[cat.code] = { code: cat.code, name: cat.name, order: cat.order, score: 0, maxScore: 0 }
    }
    row.catMap[cat.code]!.score += effScore
    row.catMap[cat.code]!.maxScore += e.indicator.maxScore
  }

  const latestValidated = new Map<string, RekapGroup>()
  for (const group of Object.values(map).filter((item) => item.indicatorCount === indicatorCountsByVersion.get(item.versionId))) {
    const key = `${group.userId}_${group.assessmentId}_${group.periode}`
    const current = latestValidated.get(key)
    if (!current || group.versionNumber > current.versionNumber) latestValidated.set(key, group)
  }

  return Array.from(latestValidated.values()).map((group) => ({
    userId: group.userId,
    userName: group.userName,
    kabupaten: group.kabupaten,
    kecamatan: group.kecamatan,
    assessmentId: group.assessmentId,
    assessmentTitle: group.assessmentTitle,
    periode: group.periode,
    tahun: group.tahun,
    totalScore: group.totalScore,
    maxPossibleTotal: group.maxPossibleTotal,
    categoryScores: Object.values(group.catMap).sort((a, b) => a.order - b.order),
    statusAkhir: getStatusAkhir(group.totalScore, group.maxPossibleTotal, Object.values(group.catMap)),
  }))
}

export async function buildKecamatanDetail(filters: { kecamatanId: number; assessmentId?: number; periode?: string }) {
  const entries = await prisma.selfAssessment.findMany({
    where: {
      ...(filters.periode ? { periode: filters.periode } : {}),
      ...(filters.assessmentId ? { indicator: { category: { assessmentId: filters.assessmentId } } } : {}),
      status: { in: ['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED'] },
      submittedBy: { kecamatanId: filters.kecamatanId },
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
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
        select: { validatedScore: true, status: true, notes: true, validatedAt: true },
      },
    },
    orderBy: [
      { periode: 'asc' },
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  const detailRows: KecamatanDetailRow[] = entries.map((e) => {
    const v = e.validations[0]
    const validatedScore = v?.validatedScore ?? null
    const effectiveScore = validatedScore ?? e.score
    return {
      kabupaten: e.submittedBy.kabupaten?.nama ?? null,
      kecamatan: e.submittedBy.kecamatan?.nama ?? null,
      userId: e.submittedById,
      userName: e.submittedBy.name,
      assessmentId: e.indicator.category.assessment.id,
      assessmentTitle: e.indicator.category.assessment.title,
      periode: e.periode,
      tahun: toYearFromPeriode(e.periode),
      categoryCode: e.indicator.category.code,
      categoryName: e.indicator.category.name,
      categoryOrder: e.indicator.category.order,
      indicatorNumber: e.indicator.number,
      indicatorText: e.indicator.indicator,
      indicatorMaxScore: e.indicator.maxScore,
      description: e.description,
      supportingDoc: e.supportingDoc ?? null,
      score: e.score,
      validatedScore,
      effectiveScore,
      status: e.status,
      validationStatus: v?.status ?? null,
      validationNotes: v?.notes ?? null,
      validatedAt: v?.validatedAt ? v.validatedAt.toISOString() : null,
      submittedAt: e.submittedAt ? e.submittedAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }
  })

  const rekapRows = await buildRekapStatusAkhir({
    assessmentId: filters.assessmentId,
    periode: filters.periode,
    kecamatanId: filters.kecamatanId,
  })

  return { detailRows, rekapRows }
}

