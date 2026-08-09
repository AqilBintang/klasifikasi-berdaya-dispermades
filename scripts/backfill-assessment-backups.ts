import { PrismaClient } from '@prisma/client'
import { getKlasifikasi, getStatusAkhir } from '../src/lib/scoring'

const prisma = new PrismaClient()

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

async function upsertBackupIfComplete(input: { submittedById: number; periode: string; assessmentId: number }) {
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
      submittedBy: { select: { kabupatenName: true, kecamatanName: true } },
      indicator: {
        include: {
          category: { include: { assessment: { select: { title: true } } } },
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
  const kecamatan = first.submittedBy.kecamatanName ?? null
  const kabupaten = first.submittedBy.kabupatenName ?? null
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

async function main() {
  const entries = await prisma.selfAssessment.findMany({
    where: { status: 'VALIDATED' },
    select: {
      submittedById: true,
      periode: true,
      indicator: { select: { category: { select: { assessmentId: true } } } },
    },
  })

  const keys = new Map<string, { submittedById: number; periode: string; assessmentId: number }>()
  for (const e of entries) {
    const assessmentId = e.indicator.category.assessmentId
    const k = `${e.submittedById}_${assessmentId}_${e.periode}`
    if (!keys.has(k)) keys.set(k, { submittedById: e.submittedById, periode: e.periode, assessmentId })
  }

  let ok = 0
  let skipped = 0

  for (const key of keys.values()) {
    const r = await upsertBackupIfComplete(key)
    if (r.ok) ok += 1
    else skipped += 1
  }

  process.stdout.write(JSON.stringify({ groups: keys.size, ok, skipped }, null, 2) + '\n')
}

main()
  .catch((e) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
