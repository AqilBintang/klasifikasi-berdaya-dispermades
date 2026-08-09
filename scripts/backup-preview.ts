import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { getStatusAkhir, type KlasifikasiLevel } from '@/lib/scoring'

type RekapRow = {
  userId: number
  kecamatan: string | null
  assessmentId: number
  periode: string
  tahun: number | null
  totalScore: number
  maxPossibleTotal: number
  statusAkhir: KlasifikasiLevel | null
}

function toYearFromPeriode(periode: string): number | null {
  const years = periode.match(/\d{4}/g)
  if (!years || years.length === 0) return null
  const year = Number.parseInt(years[years.length - 1] ?? '', 10)
  return Number.isNaN(year) ? null : year
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

function jsonSheet<T extends object>(rows: T[]) {
  if (rows.length === 0) return XLSX.utils.json_to_sheet([{}])
  return XLSX.utils.json_to_sheet(rows)
}

async function buildRekapStatusAkhir(): Promise<RekapRow[]> {
  const entries = await prisma.selfAssessment.findMany({
    where: { status: { in: ['VALIDATED', 'SUBMITTED'] } },
    include: {
      submittedBy: { select: { id: true, kecamatanName: true } },
      indicator: { select: { maxScore: true, category: { select: { assessmentId: true } } } },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
    orderBy: [
      { submittedById: 'asc' },
      { periode: 'asc' },
      { indicator: { category: { assessmentId: 'asc' } } },
    ],
  })

  const map: Record<string, Omit<RekapRow, 'statusAkhir' | 'kecamatan'>> & Record<string, { kecamatan: string | null }> = {}

  for (const e of entries) {
    const assessmentId = e.indicator.category.assessmentId
    const key = `${e.submittedById}_${assessmentId}_${e.periode}`
    const effScore = e.validations[0]?.validatedScore ?? e.score

    if (!map[key]) {
      map[key] = {
        userId: e.submittedById,
        kecamatan: e.submittedBy.kecamatanName ?? null,
        assessmentId,
        periode: e.periode,
        tahun: toYearFromPeriode(e.periode),
        totalScore: 0,
        maxPossibleTotal: 0,
      }
    }

    map[key].totalScore += effScore
    map[key].maxPossibleTotal += e.indicator.maxScore
  }

  return Object.values(map).map((g) => ({
    ...g,
    statusAkhir: getStatusAkhir(g.totalScore, g.maxPossibleTotal),
  }))
}

async function main() {
  const outDir = path.join(process.cwd(), 'exports')
  ensureDir(outDir)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.join(outDir, `backup-preview-${stamp}.xlsx`)

  let users: any[] = []
  let assessments: any[] = []
  let categories: any[] = []
  let indicators: any[] = []
  let rubrics: any[] = []
  let rubricItems: any[] = []
  let selfAssessments: any[] = []
  let validations: any[] = []
  let rekapStatusAkhir: RekapRow[] = []

  try {
    users = await prisma.user.findMany()
    assessments = await prisma.assessment.findMany()
    categories = await prisma.assessmentCategory.findMany()
    indicators = await prisma.assessmentIndicator.findMany()
    rubrics = await prisma.assessmentRubric.findMany()
    rubricItems = await prisma.rubricItem.findMany()
    selfAssessments = await prisma.selfAssessment.findMany()
    validations = await prisma.assessmentValidation.findMany()
    rekapStatusAkhir = await buildRekapStatusAkhir()
  } catch {
    users = [
      { id: 1, name: 'Contoh User', email: 'user@contoh.id', role: 'USER', kabupaten: 'Semarang', kecamatan: 'Tembalang', isActive: true },
    ]
    assessments = [{ id: 1, title: 'Template Assessment', periode: '2026', status: 'PUBLISHED' }]
    categories = [{ id: 1, assessmentId: 1, code: 'A', name: 'Kategori A', order: 1 }]
    indicators = [{ id: 1, categoryId: 1, number: 1, indicator: 'Contoh indikator', maxScore: 4 }]
    rubrics = [{ id: 1, assessmentId: 1, title: 'Rubrik', description: 'Contoh rubrik' }]
    rubricItems = [{ id: 1, rubricId: 1, indicatorId: 1, score1: '...', score2: '...', score3: '...', score4: '...' }]
    selfAssessments = [{ id: 1, indicatorId: 1, submittedById: 1, periode: '2026', description: 'Contoh isian', score: 3, status: 'SUBMITTED' }]
    validations = [{ id: 1, selfAssessmentId: 1, validatorId: 2, status: 'APPROVED', validatedScore: 3 }]
    rekapStatusAkhir = [
      { userId: 1, kecamatan: 'Tembalang', assessmentId: 1, periode: '2026', tahun: 2026, totalScore: 60, maxPossibleTotal: 80, statusAkhir: 'Berkembang' },
    ]
  } finally {
    await prisma.$disconnect().catch(() => {})
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, jsonSheet(users), 'users')
  XLSX.utils.book_append_sheet(wb, jsonSheet(assessments), 'assessments')
  XLSX.utils.book_append_sheet(wb, jsonSheet(categories), 'categories')
  XLSX.utils.book_append_sheet(wb, jsonSheet(indicators), 'indicators')
  XLSX.utils.book_append_sheet(wb, jsonSheet(rubrics), 'rubrics')
  XLSX.utils.book_append_sheet(wb, jsonSheet(rubricItems), 'rubric_items')
  XLSX.utils.book_append_sheet(wb, jsonSheet(selfAssessments), 'self_assessments')
  XLSX.utils.book_append_sheet(wb, jsonSheet(validations), 'validations')
  XLSX.utils.book_append_sheet(wb, jsonSheet(rekapStatusAkhir), 'rekap_status_akhir')

  XLSX.writeFile(wb, outPath)

  const preview = {
    file: outPath,
    sheets: wb.SheetNames,
    sampleRows: {
      users: users.slice(0, 3),
      self_assessments: selfAssessments.slice(0, 3),
      validations: validations.slice(0, 3),
      rekap_status_akhir: rekapStatusAkhir.slice(0, 3),
    },
  }

  process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`)
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})

