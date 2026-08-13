import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faLink } from '@fortawesome/free-solid-svg-icons'
import { getKlasifikasi, getStatusAkhir, evaluateScoringRule, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'
import type { ScoringRule } from '@/types/assessment'

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

function KlasifikasiBadge({ level, size = 'sm' }: { level: KlasifikasiLevel | null; size?: 'sm' | 'lg' }) {
  if (!level) return <span className={`text-gray-400 italic ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>Tidak berlaku</span>
  const cfg = KLASIFIKASI_CONFIG[level]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold border',
      cfg.bg, cfg.color, cfg.border,
      size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'
    )}>
      {cfg.emoji} {level}
    </span>
  )
}

/** Badge untuk label kustom dari scoringRule (string bebas, bukan KlasifikasiLevel) */
function CustomLabelBadge({ label, size = 'sm' }: { label: string; size?: 'sm' | 'lg' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-semibold border border-amber-200 bg-amber-50 text-amber-800',
      size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'
    )}>
      {label}
    </span>
  )
}

async function getDetail(userId: number, assessmentId: number, periode: string) {
  const userRaw = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true,
      kabupaten: { select: { nama: true } },
      kecamatan: { select: { nama: true } },
    },
  })
  if (!userRaw) return null
  const user = {
    id: userRaw.id,
    name: userRaw.name,
    kabupaten: userRaw.kabupaten?.nama ?? null,
    kecamatan: userRaw.kecamatan?.nama ?? null,
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, title: true, periode: true },
  })
  if (!assessment) return null

  // Ambil scoringRule per kategori
  const categoryDefs = await prisma.assessmentCategory.findMany({
    where: { assessmentId },
    select: { id: true, scoringRule: true },
  })
  const scoringRuleById: Record<number, ScoringRule | null> = {}
  for (const c of categoryDefs) {
    scoringRuleById[c.id] = c.scoringRule as ScoringRule | null
  }

  const entries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      periode,
      indicator: { category: { assessmentId } },
    },
    include: {
      indicator: {
        include: {
          category: {
            include: { _count: { select: { indicators: true } } },
          },
        },
      },
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
        include: { validator: { select: { name: true } } },
      },
    },
    orderBy: [
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  type EntryT = typeof entries[0]
  const catMap: Record<string, {
    id: number; code: string; name: string
    totalScore: number; maxScore: number; maxPossible: number
    klasifikasi: KlasifikasiLevel | null
    customLabel: string | null
    scoringRule: ScoringRule | null
    items: EntryT[]
  }> = {}

  let totalScore = 0, maxScore = 0, maxPossible = 0

  for (const e of entries) {
    const catId    = e.indicator.categoryId.toString()
    const effScore = e.validations[0]?.validatedScore ?? e.score

    if (!catMap[catId]) {
      catMap[catId] = {
        id: e.indicator.categoryId,
        code: e.indicator.category.code,
        name: e.indicator.category.name,
        totalScore: 0, maxScore: 0,
        maxPossible: e.indicator.category._count.indicators * 4,
        klasifikasi: null,
        customLabel: null,
        scoringRule: scoringRuleById[e.indicator.categoryId] ?? null,
        items: [],
      }
    }
    catMap[catId].totalScore += effScore
    catMap[catId].maxScore   += e.indicator.maxScore
    catMap[catId].items.push(e)

    totalScore  += effScore
    maxScore    += e.indicator.maxScore
    maxPossible += e.indicator.maxScore
  }

  for (const cat of Object.values(catMap)) {
    cat.klasifikasi  = getKlasifikasi(cat.totalScore, cat.maxPossible)
    cat.customLabel  = cat.scoringRule ? evaluateScoringRule(cat.totalScore, cat.scoringRule) : null
  }

  const categoryScores = Object.values(catMap).map(cat => ({
    code: cat.code,
    score: cat.totalScore,
    maxScore: cat.maxPossible,
  }))

  return {
    user,
    assessment: { ...assessment, periode },
    categories: Object.values(catMap),
    totalScore, maxScore,
    statusAkhir: getStatusAkhir(totalScore, maxPossible, categoryScores),
  }
}

export default async function ResultDetailPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string; assessmentId: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const { userId, assessmentId } = await params
  const { periode: periodeParam } = await searchParams
  const periode = periodeParam ?? ''

  const data = await getDetail(parseInt(userId, 10), parseInt(assessmentId, 10), periode)
  if (!data) notFound()

  const pct = data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <Link href="/admin/assessment/results"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali ke Rekapitulasi
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Detail Assessment Kecamatan</h2>
      </div>

      {/* Header info */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              {data.assessment.title} · Periode {data.assessment.periode}
            </p>
            <h3 className="text-xl font-bold text-gray-900">{data.user.kecamatan ?? data.user.name}</h3>
            {data.user.kabupaten && <p className="text-sm text-gray-500 mt-0.5">{data.user.kabupaten}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400 mb-1">Total Skor</p>
            <p className="text-3xl font-black text-gray-900">
              {data.totalScore}<span className="text-base font-normal text-gray-400">/{data.maxScore}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{pct}%</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Per category */}
      {data.categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Category header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white shrink-0">
                {cat.code}
              </span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-400">{cat.items.length} indikator · {cat.totalScore}/{cat.maxScore} poin</p>
              </div>
            </div>
            {cat.customLabel
              ? <CustomLabelBadge label={cat.customLabel} />
              : <KlasifikasiBadge level={cat.klasifikasi} />
            }
          </div>

          {/* Indicators table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-5 py-2.5 text-left w-6">#</th>
                  <th className="px-3 py-2.5 text-left">Indikator</th>
                  <th className="px-3 py-2.5 text-left">Deskripsi Jawaban</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Skor Kecamatan</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Skor Validator</th>
                  <th className="px-3 py-2.5 text-left">Komentar Tim Teknis</th>
                  <th className="px-3 py-2.5 text-center">Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cat.items.map((item) => {
                  const validation    = item.validations[0]
                  const scoreChanged  = validation?.validatedScore != null && validation.validatedScore !== item.score
                  const effScore      = validation?.validatedScore ?? item.score
                  return (
                    <tr key={item.id} className="align-top hover:bg-gray-50/60">
                      <td className="px-5 py-3.5 text-xs text-gray-400 font-medium">{item.indicator.number}</td>
                      <td className="px-3 py-3.5 text-gray-700 max-w-[200px]">{item.indicator.indicator}</td>
                      <td className="px-3 py-3.5 text-gray-600 max-w-[220px]">
                        {item.description && item.description !== '-'
                          ? <span className="leading-relaxed">{item.description}</span>
                          : <span className="text-gray-300 italic">Tidak diisi</span>}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={cn(
                          'font-bold tabular-nums',
                          scoreChanged ? 'text-gray-400 line-through text-xs' : 'text-gray-900'
                        )}>
                          {item.score}
                        </span>
                        <span className="text-gray-300 text-xs">/{item.indicator.maxScore}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {validation?.validatedScore != null ? (
                          <span className={cn(
                            'font-bold tabular-nums',
                            scoreChanged ? 'text-sky-700' : 'text-gray-400'
                          )}>
                            {validation.validatedScore}
                            <span className="text-gray-300 text-xs font-normal">/{item.indicator.maxScore}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 max-w-[220px]">
                        {validation?.notes ? (
                          <span className="text-xs leading-relaxed">{validation.notes}</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {item.supportingDoc ? (
                          <a href={item.supportingDoc} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline whitespace-nowrap">
                            <FontAwesomeIcon icon={faLink} className="w-3 h-3" /> Buka
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Summary table */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Rekapitulasi Nilai</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500">
              <th className="pb-2 text-left">Kategori</th>
              <th className="pb-2 text-center">Skor</th>
              <th className="pb-2 text-center">Maks</th>
              <th className="pb-2 text-right">Klasifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.categories.map((cat) => (
              <tr key={cat.id}>
                <td className="py-2.5 text-gray-700">{cat.code}. {cat.name}</td>
                <td className="py-2.5 text-center font-bold text-gray-900">{cat.totalScore}</td>
                <td className="py-2.5 text-center text-gray-400">{cat.maxScore}</td>
                <td className="py-2.5 text-right">
                  {cat.customLabel
                    ? <CustomLabelBadge label={cat.customLabel} />
                    : <KlasifikasiBadge level={cat.klasifikasi} />
                  }
                </td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 font-bold">
              <td className="pt-3 text-gray-900">Total Keseluruhan</td>
              <td className="pt-3 text-center text-gray-900 text-base">{data.totalScore}</td>
              <td className="pt-3 text-center text-gray-500">{data.maxScore}</td>
              <td className="pt-3 text-right"><KlasifikasiBadge level={data.statusAkhir} size="lg" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
