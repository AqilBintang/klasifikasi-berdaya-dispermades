import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faCheckCircle, faClockRotateLeft, faTimesCircle, faMedal } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import { getKlasifikasiPerKategori, getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'

// ─── Sub-components ───────────────────────────────────────────────────────

function KlasifikasiBadge({ level, size = 'sm' }: { level: KlasifikasiLevel | null; size?: 'sm' | 'lg' }) {
  if (!level) {
    return <span className={`text-slate-400 italic ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>Tidak berlaku</span>
  }
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

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-500 w-14 text-right shrink-0">{score}/{max}</span>
    </div>
  )
}

const STATUS_ENTRY: Record<string, { label: string; icon: typeof faCheckCircle; cls: string }> = {
  VALIDATED: { label: 'Divalidasi', icon: faCheckCircle,     cls: 'text-green-600' },
  SUBMITTED: { label: 'Menunggu',   icon: faClockRotateLeft, cls: 'text-amber-500' },
  REJECTED:  { label: 'Ditolak',    icon: faTimesCircle,     cls: 'text-red-500' },
  DRAFT:     { label: 'Draft',      icon: faClockRotateLeft, cls: 'text-slate-400' },
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function KecamatanHasilPage() {
  const session = await auth()
  if (!session?.user) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')

  const userId = parseInt(session.user.id ?? '0', 10)

  const entries = await prisma.selfAssessment.findMany({
    where: {
      submittedById: userId,
      status: { in: ['SUBMITTED', 'VALIDATED', 'REJECTED'] },
    },
    include: {
      indicator: {
        include: {
          category: {
            include: {
              assessment: { select: { id: true, title: true, periode: true } },
              _count: { select: { indicators: true } },
            },
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

  // ── Group by assessment ──
  type EntryType = typeof entries[0]
  type CatGroup = {
    id: number; code: string; name: string
    totalScore: number; maxScore: number; maxPossibleScore: number
    klasifikasi: KlasifikasiLevel | null
    items: EntryType[]
  }
  type AssessmentGroup = {
    assessment: { id: number; title: string; periode: string }
    categories: CatGroup[]
    totalScore: number; maxScore: number; maxPossibleTotal: number
    statusAkhir: KlasifikasiLevel | null
  }

  const assessmentMap: Record<string, AssessmentGroup> = {}

  for (const e of entries) {
    const key = `${e.indicator.category.assessmentId}_${e.periode}`
    if (!assessmentMap[key]) {
      assessmentMap[key] = {
        assessment: e.indicator.category.assessment,
        categories: [], totalScore: 0, maxScore: 0, maxPossibleTotal: 0,
        statusAkhir: null,
      }
    }

    const effectiveScore = e.validations[0]?.validatedScore ?? e.score
    const catId = e.indicator.categoryId
    let cat = assessmentMap[key].categories.find((c) => c.id === catId)

    if (!cat) {
      cat = {
        id: catId,
        code: e.indicator.category.code,
        name: e.indicator.category.name,
        totalScore: 0, maxScore: 0,
        maxPossibleScore: e.indicator.category._count.indicators * 4,
        klasifikasi: null,
        items: [],
      }
      assessmentMap[key].categories.push(cat)
    }

    cat.totalScore  += effectiveScore
    cat.maxScore    += e.indicator.maxScore
    cat.items.push(e)

    assessmentMap[key].totalScore       += effectiveScore
    assessmentMap[key].maxScore         += e.indicator.maxScore
    assessmentMap[key].maxPossibleTotal += e.indicator.maxScore
  }

  for (const ag of Object.values(assessmentMap)) {
    for (const cat of ag.categories) {
      cat.klasifikasi = getKlasifikasiPerKategori(cat.code, cat.totalScore)
    }
    // Konversi categories untuk weighted scoring
    const categoryScores = ag.categories.map(cat => ({
      code: cat.code,
      score: cat.totalScore,
      maxScore: cat.maxScore
    }))
    ag.statusAkhir = getStatusAkhir(ag.totalScore, ag.maxPossibleTotal, categoryScores)
  }

  const groups = Object.values(assessmentMap)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hasil Nilai Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">Rekap penilaian kecamatan Anda per periode</p>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faAward} className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-sm">Belum ada hasil assessment</p>
          <p className="text-xs text-slate-400 mt-1">Submit assessment dan tunggu validasi dari admin</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={`${g.assessment.id}_${g.assessment.periode}`} className="space-y-4">

            {/* Header assessment */}
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
              <p className="text-xs text-gray-400 mb-3">
                {g.assessment.title} · Periode {g.assessment.periode}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Total Skor</p>
                  <p className="text-4xl font-bold text-gray-900 tracking-tight">
                    {g.totalScore}
                    <span className="text-xl font-normal text-gray-400 ml-1">/ {g.maxScore}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Status Akhir</p>
                  <KlasifikasiBadge level={g.statusAkhir} size="lg" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress keseluruhan</span>
                  <span>{g.maxScore > 0 ? Math.round((g.totalScore / g.maxScore) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{ width: `${g.maxScore > 0 ? (g.totalScore / g.maxScore) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Per Kategori */}
            {g.categories.map((cat) => (
              <div key={cat.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* Category header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white shrink-0">
                      {cat.code}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cat.items.length} indikator · {cat.totalScore}/{cat.maxScore} poin
                      </p>
                    </div>
                  </div>
                  <KlasifikasiBadge level={cat.klasifikasi} />
                </div>

                {/* Score bar */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <ScoreBar score={cat.totalScore} max={cat.maxScore} />
                </div>

                {/* Indikator detail */}
                <div className="divide-y divide-slate-100">
                  {cat.items.map((item) => {
                    const cfg       = STATUS_ENTRY[item.status] ?? STATUS_ENTRY.DRAFT
                    const validated = item.validations[0]
                    const effScore  = validated?.validatedScore ?? item.score
                    return (
                      <div key={item.id} className="px-5 py-3 flex items-start gap-4">
                        <div className="w-5 text-center text-xs font-medium text-slate-400 mt-0.5 shrink-0">
                          {item.indicator.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-snug">{item.indicator.indicator}</p>
                          {item.description && item.description !== '-' && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                          )}
                          {validated?.notes && (
                            <p className="text-xs text-amber-600 mt-1">💬 {validated.notes}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-bold text-slate-900 leading-none">
                            {effScore}<span className="text-xs font-normal text-slate-400">/{item.indicator.maxScore}</span>
                          </p>
                          {validated?.validatedScore != null && validated.validatedScore !== item.score && (
                            <p className="text-xs text-slate-400 line-through">{item.score}</p>
                          )}
                          <span className={cn('flex items-center gap-1 text-xs mt-1 justify-end', cfg.cls)}>
                            <FontAwesomeIcon icon={cfg.icon} className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Rekapitulasi */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-5">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faMedal} className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Rekapitulasi Nilai</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="pb-2 text-left">Kategori</th>
                      <th className="pb-2 text-center">Skor</th>
                      <th className="pb-2 text-center">Maks</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.categories.map((cat) => (
                      <tr key={cat.id}>
                        <td className="py-2.5 text-slate-700 font-medium">{cat.code}. {cat.name}</td>
                        <td className="py-2.5 text-center font-bold text-slate-900">{cat.totalScore}</td>
                        <td className="py-2.5 text-center text-slate-500">{cat.maxScore}</td>
                        <td className="py-2.5 text-right">
                          <KlasifikasiBadge level={cat.klasifikasi} />
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 font-bold">
                      <td className="pt-3 text-slate-800">Total Keseluruhan</td>
                      <td className="pt-3 text-center text-slate-900 text-base">{g.totalScore}</td>
                      <td className="pt-3 text-center text-slate-600">{g.maxScore}</td>
                      <td className="pt-3 text-right">
                        <KlasifikasiBadge level={g.statusAkhir} size="lg" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ))
      )}
    </div>
  )
}
