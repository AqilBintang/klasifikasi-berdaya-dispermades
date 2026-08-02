import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faLink, faCheckCircle, faClockRotateLeft, faTimesCircle } from '@fortawesome/free-solid-svg-icons'
import { getKlasifikasi, getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'

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

const STATUS_LABEL: Record<string, { label: string; icon: typeof faCheckCircle; cls: string }> = {
  VALIDATED: { label: 'Divalidasi', icon: faCheckCircle,     cls: 'text-green-600' },
  SUBMITTED: { label: 'Menunggu',   icon: faClockRotateLeft, cls: 'text-amber-500' },
  REJECTED:  { label: 'Ditolak',    icon: faTimesCircle,     cls: 'text-red-500' },
  DRAFT:     { label: 'Draft',      icon: faClockRotateLeft, cls: 'text-gray-400' },
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
      validations: { orderBy: { validatedAt: 'desc' }, take: 1 },
    },
    orderBy: [
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  // Group by category
  type EntryT = typeof entries[0]
  const catMap: Record<string, {
    id: number; code: string; name: string
    totalScore: number; maxScore: number; maxPossible: number
    klasifikasi: KlasifikasiLevel | null
    items: EntryT[]
  }> = {}

  let totalScore = 0, maxScore = 0, maxPossible = 0

  for (const e of entries) {
    const catId      = e.indicator.categoryId.toString()
    const effScore   = e.validations[0]?.validatedScore ?? e.score

    if (!catMap[catId]) {
      catMap[catId] = {
        id: e.indicator.categoryId,
        code: e.indicator.category.code,
        name: e.indicator.category.name,
        totalScore: 0, maxScore: 0,
        maxPossible: e.indicator.category._count.indicators * 4,
        klasifikasi: null,
        items: [],
      }
    }
    catMap[catId].totalScore  += effScore
    catMap[catId].maxScore    += e.indicator.maxScore
    catMap[catId].items.push(e)

    totalScore  += effScore
    maxScore    += e.indicator.maxScore
    maxPossible += e.indicator.maxScore
  }

  for (const cat of Object.values(catMap)) {
    cat.klasifikasi = getKlasifikasi(cat.totalScore, cat.maxPossible)
  }

  return {
    user,
    assessment: { ...assessment, periode },
    categories: Object.values(catMap),
    totalScore, maxScore,
    statusAkhir: getStatusAkhir(totalScore, maxPossible),
  }
}

export default async function ResultDetailPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string; assessmentId: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const { userId, assessmentId } = await params
  const { periode: periodeParam }= await searchParams
  const periode = periodeParam ?? ''

  const data = await getDetail(parseInt(userId, 10), parseInt(assessmentId, 10), periode)
  if (!data) notFound()

  const pct = data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'

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
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 px-6 py-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="text-sky-200 text-xs font-medium uppercase tracking-wider mb-1">
              {data.assessment.title} · Periode {data.assessment.periode}
            </p>
            <h3 className="text-2xl font-bold">{data.user.kecamatan ?? data.user.name}</h3>
            {data.user.kabupaten && <p className="text-sky-200 text-sm">{data.user.kabupaten}</p>}
          </div>
          <div className="text-right">
            <p className="text-sky-200 text-xs mb-1">Total Skor</p>
            <p className="text-4xl font-black">
              {data.totalScore}<span className="text-xl font-normal text-sky-300">/{data.maxScore}</span>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-sky-200 mb-1">
            <span>Progress</span><span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className={`h-full rounded-full bg-white`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Per category */}
      {data.categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                {cat.code}
              </span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-500">{cat.items.length} indikator · {cat.totalScore}/{cat.maxScore} poin</p>
              </div>
            </div>
            <KlasifikasiBadge level={cat.klasifikasi} />
          </div>

          {/* Score bar */}
          <div className="px-5 py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${cat.maxScore > 0 ? (cat.totalScore / cat.maxScore) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-600 shrink-0">
                {cat.maxScore > 0 ? Math.round((cat.totalScore / cat.maxScore) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Indicators */}
          <div className="divide-y divide-gray-100">
            {cat.items.map((item) => {
              const cfg       = STATUS_LABEL[item.status] ?? STATUS_LABEL.DRAFT
              const validated = item.validations[0]
              const effScore  = validated?.validatedScore ?? item.score
              return (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-5 shrink-0 mt-0.5">{item.indicator.number}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 mb-2">{item.indicator.indicator}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-gray-500 mb-1">Deskripsi</p>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {item.description && item.description !== '-' ? item.description : <span className="text-gray-300 italic">Tidak diisi</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-500 mb-1">Skor</p>
                          <p className="text-2xl font-black text-gray-900">
                            {effScore}<span className="text-sm font-normal text-gray-400">/{item.indicator.maxScore}</span>
                          </p>
                          {validated?.validatedScore != null && validated.validatedScore !== item.score && (
                            <p className="text-gray-400 line-through text-xs">Diajukan: {item.score}</p>
                          )}
                          <span className={cn('flex items-center gap-1 mt-1', cfg.cls)}>
                            <FontAwesomeIcon icon={cfg.icon} className="w-3 h-3" /> {cfg.label}
                          </span>
                          {validated?.notes && (
                            <p className="text-amber-600 mt-1">💬 {validated.notes}</p>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-500 mb-1">Dokumen Pendukung</p>
                          {item.supportingDoc ? (
                            <a href={item.supportingDoc} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sky-600 hover:underline">
                              <FontAwesomeIcon icon={faLink} className="w-3 h-3" /> Buka Dokumen
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Tidak ada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Summary table */}
      <div className="rounded-xl border-2 border-sky-200 bg-sky-50 px-6 py-5">
        <h3 className="font-bold text-sky-900 mb-4">Rekapitulasi Nilai</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sky-200 text-xs font-semibold text-sky-700">
              <th className="pb-2 text-left">Kategori</th>
              <th className="pb-2 text-center">Skor</th>
              <th className="pb-2 text-center">Maks</th>
              <th className="pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100">
            {data.categories.map((cat) => (
              <tr key={cat.id}>
                <td className="py-2.5 font-medium text-gray-800">{cat.code}. {cat.name}</td>
                <td className="py-2.5 text-center font-bold text-gray-900">{cat.totalScore}</td>
                <td className="py-2.5 text-center text-gray-500">{cat.maxScore}</td>
                <td className="py-2.5 text-right"><KlasifikasiBadge level={cat.klasifikasi} /></td>
              </tr>
            ))}
            <tr className="border-t-2 border-sky-300 font-bold">
              <td className="pt-3 text-sky-900">TOTAL KESELURUHAN</td>
              <td className="pt-3 text-center text-sky-900 text-lg">{data.totalScore}</td>
              <td className="pt-3 text-center text-sky-700">{data.maxScore}</td>
              <td className="pt-3 text-right"><KlasifikasiBadge level={data.statusAkhir} size="lg" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
