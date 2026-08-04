import { prisma } from '@/lib/prisma'
import { getStatusAkhir, type KlasifikasiLevel } from '@/lib/scoring'
import type { KlasifikasiBerdayaChartRow } from '@/components/admin/KlasifikasiBerdayaChart'

type RekapGroup = {
  userId: number
  assessmentId: number
  periode: string
  totalScore: number
  maxPossibleTotal: number
  statusAkhir: KlasifikasiLevel | null
}

export type KlasifikasiAggFilter = {
  kabupatenId?: number
  kecamatanId?: number
  // string fallback untuk backward compat (dikonversi ke id sebelum query)
  kabupaten?: string
  kecamatan?: string
}

export type KlasifikasiAggResult = {
  totalRegistered: number
  totalWithData: number
  years: string[]
  chartData: KlasifikasiBerdayaChartRow[]
  // Hanya diisi saat filter ke satu kecamatan
  skorPerTahun?: { year: string; totalScore: number; maxPossibleTotal: number; statusAkhir: KlasifikasiLevel | null }[]
  latest?: {
    status: KlasifikasiLevel | null
    periode: string | null
    year: string | null
  }
}

function getPeriodeYear(periode: string): number | null {
  const years = periode.match(/\d{4}/g)
  if (!years || years.length === 0) return null
  const year = Number.parseInt(years[years.length - 1] ?? '', 10)
  return Number.isNaN(year) ? null : year
}

function isNewerPeriode(a: RekapGroup, b: RekapGroup) {
  const ya = getPeriodeYear(a.periode) ?? -1
  const yb = getPeriodeYear(b.periode) ?? -1
  if (ya !== yb) return ya > yb
  if (a.periode !== b.periode) return a.periode.localeCompare(b.periode, 'id') > 0
  return a.assessmentId > b.assessmentId
}

export async function getKlasifikasiKecamatanAggPerYear(filter: KlasifikasiAggFilter = {}): Promise<KlasifikasiAggResult> {
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      isActive: true,
      kecamatanId: { not: null },
      ...(filter.kecamatanId ? { kecamatanId: filter.kecamatanId } : {}),
      ...(filter.kabupatenId ? { kabupatenId: filter.kabupatenId } : {}),
    },
    select: { id: true, kecamatan: { select: { nama: true } } },
    orderBy: { kecamatan: { nama: 'asc' } },
  })

  const userIds = users.map((u) => u.id)
  if (userIds.length === 0) {
    return {
      totalRegistered: 0,
      totalWithData: 0,
      years: [],
      chartData: [],
    }
  }

  const entries = await prisma.selfAssessment.findMany({
    where: {
      status: 'VALIDATED',
      submittedById: { in: userIds },
    },
    include: {
      indicator: { select: { maxScore: true, category: { select: { assessmentId: true } } } },
      validations: { orderBy: { validatedAt: 'desc' }, take: 1, select: { validatedScore: true } },
    },
    orderBy: [
      { submittedById: 'asc' },
      { periode: 'asc' },
      { indicator: { category: { assessmentId: 'asc' } } },
    ],
  })

  const groupsMap: Record<string, Omit<RekapGroup, 'statusAkhir'>> = {}
  for (const e of entries) {
    const assessmentId = e.indicator.category.assessmentId
    const key = `${e.submittedById}_${assessmentId}_${e.periode}`
    const effScore = e.validations[0]?.validatedScore ?? e.score

    if (!groupsMap[key]) {
      groupsMap[key] = {
        userId: e.submittedById,
        assessmentId,
        periode: e.periode,
        totalScore: 0,
        maxPossibleTotal: 0,
      }
    }

    groupsMap[key].totalScore += effScore
    groupsMap[key].maxPossibleTotal += e.indicator.maxScore
  }

  const groups: RekapGroup[] = Object.values(groupsMap).map((g) => ({
    ...g,
    statusAkhir: getStatusAkhir(g.totalScore, g.maxPossibleTotal),
  }))

  const latestOverallByUser = new Map<number, RekapGroup>()
  for (const g of groups) {
    const current = latestOverallByUser.get(g.userId)
    if (!current || isNewerPeriode(g, current)) latestOverallByUser.set(g.userId, g)
  }

  const latestByUserYear = new Map<string, RekapGroup>()
  for (const g of groups) {
    const year = getPeriodeYear(g.periode)
    if (!year) continue

    const key = `${g.userId}_${year}`
    const current = latestByUserYear.get(key)
    if (!current || isNewerPeriode(g, current)) latestByUserYear.set(key, g)
  }

  const years = Array.from(
    new Set(
      groups
        .map((g) => getPeriodeYear(g.periode))
        .filter((y): y is number => typeof y === 'number')
    )
  )
    .sort((a, b) => a - b)
    .map((y) => y.toString())

  const chartData: KlasifikasiBerdayaChartRow[] = years.map((year) => {
    const y = Number.parseInt(year, 10)

    let belumBerdaya = 0
    let rintisan = 0
    let berkembang = 0
    let maju = 0

    for (const u of users) {
      const g = latestByUserYear.get(`${u.id}_${y}`)
      // Hanya hitung user yang punya data di tahun ini
      if (!g) continue
      const status = g.statusAkhir
      if (status === 'Belum Berdaya') belumBerdaya += 1
      else if (status === 'Rintisan') rintisan += 1
      else if (status === 'Berkembang') berkembang += 1
      else if (status === 'Maju') maju += 1
    }

    return { year, belumBerdaya, rintisan, berkembang, maju }
  })

  const uniqueUsersWithAnyData = new Set<number>()
  for (const key of latestByUserYear.keys()) {
    const userId = Number.parseInt(key.split('_')[0] ?? '', 10)
    if (!Number.isNaN(userId)) uniqueUsersWithAnyData.add(userId)
  }

  // Skor per tahun — hanya relevan saat filter ke satu kecamatan (satu user)
  const skorPerTahun =
    users.length === 1
      ? years.map((year) => {
          const y = Number.parseInt(year, 10)
          const u = users[0]!
          const g = latestByUserYear.get(`${u.id}_${y}`) ?? null
          return {
            year,
            totalScore: g?.totalScore ?? 0,
            maxPossibleTotal: g?.maxPossibleTotal ?? 0,
            statusAkhir: g?.statusAkhir ?? null,
          }
        })
      : undefined

  return {
    totalRegistered: users.length,
    totalWithData: uniqueUsersWithAnyData.size,
    years,
    chartData,
    skorPerTahun,
    latest:
      users.length === 1
        ? (() => {
            const u = users[0]
            if (!u) return { status: null, periode: null, year: null }
            const latest = latestOverallByUser.get(u.id) ?? null
            return {
              status: latest?.statusAkhir ?? null,
              periode: latest?.periode ?? null,
              year: latest?.periode ? (getPeriodeYear(latest.periode)?.toString() ?? null) : null,
            }
          })()
        : undefined,
  }
}
