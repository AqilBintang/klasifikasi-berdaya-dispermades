import { prisma } from '@/lib/prisma'
import { getStatusAkhir, type KlasifikasiLevel } from '@/lib/scoring'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KlasifikasiBerdayaChart, type KlasifikasiBerdayaChartRow } from '@/components/admin/KlasifikasiBerdayaChart'

type RekapGroup = {
  userId: number
  assessmentId: number
  periode: string
  totalScore: number
  maxPossibleTotal: number
  statusAkhir: KlasifikasiLevel | null
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

async function getKlasifikasiKecamatanAggPerYear() {
  const users = await prisma.user.findMany({
    where: { role: 'USER', isActive: true, kecamatan: { not: null } },
    select: { id: true, kecamatan: true },
    orderBy: { kecamatan: 'asc' },
  })

  const userIds = users.map((u) => u.id)
  if (userIds.length === 0) {
    return {
      totalRegistered: 0,
      totalWithData: 0,
      years: [] as string[],
      chartData: [] as KlasifikasiBerdayaChartRow[],
    }
  }

  const entries = await prisma.selfAssessment.findMany({
    where: {
      status: { in: ['VALIDATED', 'SUBMITTED'] },
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
      const status = latestByUserYear.get(`${u.id}_${y}`)?.statusAkhir ?? 'Belum Berdaya'
      if (status === 'Belum Berdaya') belumBerdaya += 1
      else if (status === 'Rintisan') rintisan += 1
      else if (status === 'Berkembang') berkembang += 1
      else maju += 1
    }

    return { year, belumBerdaya, rintisan, berkembang, maju }
  })

  const uniqueUsersWithAnyData = new Set<number>()
  for (const key of latestByUserYear.keys()) {
    const userId = Number.parseInt(key.split('_')[0] ?? '', 10)
    if (!Number.isNaN(userId)) uniqueUsersWithAnyData.add(userId)
  }

  return {
    totalRegistered: users.length,
    totalWithData: uniqueUsersWithAnyData.size,
    years,
    chartData,
  }
}

export default async function KlasifikasiBerdayaPage() {
  const agg = await getKlasifikasiKecamatanAggPerYear()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Klasifikasi Berdaya</h2>
        <p className="mt-1 text-sm text-gray-500">
          Bar chart jumlah kecamatan per klasifikasi di setiap tahun (sumbu X: tahun, sumbu Y: jumlah kecamatan).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Kecamatan</CardTitle>
            <CardDescription>Kecamatan yang terdaftar di sistem</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="text-3xl font-bold text-gray-900">
              {agg.totalRegistered.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kecamatan Dengan Data</CardTitle>
            <CardDescription>Memiliki assessment SUBMITTED/VALIDATED</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="text-3xl font-bold text-gray-900">
              {agg.totalWithData.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Tahun</CardTitle>
            <CardDescription>Tahun yang terdeteksi dari data periode</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="text-3xl font-bold text-gray-900">
              {agg.years.length.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Distribusi Status Akhir</CardTitle>
          <CardDescription>
            Untuk setiap tahun, dihitung 1 status akhir terbaru per kecamatan pada tahun tersebut; kecamatan tanpa data pada tahun itu dihitung sebagai Belum Berdaya.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-6">
          {agg.totalRegistered === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada kecamatan yang terdaftar.
            </div>
          ) : agg.chartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada data periode assessment untuk ditampilkan.
            </div>
          ) : (
            <div className="mt-2">
              <KlasifikasiBerdayaChart data={agg.chartData} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
