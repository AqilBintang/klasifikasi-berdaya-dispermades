import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faCheckCircle, faClockRotateLeft, faTimesCircle, faMedal } from '@fortawesome/free-solid-svg-icons'
import { getKlasifikasi, getStatusAkhir, KLASIFIKASI_CONFIG, type KlasifikasiLevel } from '@/lib/scoring'

// ─── Sub-components ───────────────────────────────────────────────────────

function KlasifikasiBadge({ level, size = 'sm' }: { level: KlasifikasiLevel | null; size?: 'sm' | 'lg' }) {
  if (!level) {
    return <span className={`text-gray-400 italic ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>Tidak berlaku</span>
  }
  const cfg = KLASIFIKASI_CONFIG[level]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold border',
      cfg.bg, cfg.color, cfg.border,
      size === 'lg' ? 'px-4 py-1.5 text-base' : 'px-3 py-0.5 text-xs'
    )}>
      {cfg.emoji} {level}
    </span>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-12 text-right">{score}/{max}</span>
    </div>
  )
}

const STATUS_ENTRY: Record<string, { label: string; icon: typeof faCheckCircle; cls: string }> = {
  VALIDATED: { label: 'Divalidasi',  icon: faCheckCircle,    cls: 'text-green-600' },
  SUBMITTED: { label: 'Menunggu',    icon: faClockRotateLeft, cls: 'text-amber-500' },
  REJECTED:  { label: 'Ditolak',     icon: faTimesCircle,    cls: 'text-red-500' },
  DRAFT:     { label: 'Draft',       icon: faClockRotateLeft, cls: 'text-gray-400' },
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function KecamatanHasilPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

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

  // ── Group by assessment + periode ──
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
    const catId          = e.indicator.categoryId
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

    assessmentMap[key].totalScore      += effectiveScore
    assessmentMap[key].maxScore        += e.indicator.maxScore
    assessmentMap[key].maxPossibleTotal += e.indicator.maxScore
  }

  // Hitung klasifikasi per kategori + status akhir
  for (const ag of Object.values(assessmentMap)) {
    for (const cat of ag.categories) {
      cat.klasifikasi = getKlasifikasi(cat.totalScore, cat.maxPossibleScore)
    }
    ag.statusAkhir = getStatusAkhir(ag.totalScore, ag.maxPossibleTotal)
  }

  const groups = Object.values(assessmentMap)

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hasil Nilai Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">Rekap penilaian kecamatan Anda per periode</p>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faAward} className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada hasil assessment</p>
          <p className="text-sm text-gray-400 mt-1">Submit assessment dan tunggu validasi dari admin</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={`${g.assessment.id}_${g.assessment.periode}`} className="space-y-5">

            {/* ── Header assessment ── */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 px-6 py-6 text-white shadow-md">
              <p className="text-sky-200 text-xs font-medium uppercase tracking-wider mb-1">
                {g.assessment.title} · Periode {g.assessment.periode}
              </p>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-sky-100 text-sm mb-1">Total Skor Akhir</p>
                  <p className="text-5xl font-black tracking-tight">
                    {g.totalScore}
                    <span className="text-2xl font-normal text-sky-300">/{g.maxScore}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sky-100 text-sm mb-2">Status Akhir Kecamatan</p>
                  <KlasifikasiBadge level={g.statusAkhir} size="lg" />
                </div>
              </div>
              {/* Overall progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-sky-200 mb-1">
                  <span>Progress keseluruhan</span>
                  <span>{g.maxScore > 0 ? Math.round((g.totalScore / g.maxScore) * 100) : 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${g.maxScore > 0 ? (g.totalScore / g.maxScore) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* ── Per Kategori ── */}
            <div className="grid grid-cols-1 gap-4">
              {g.categories.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                        {cat.code}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cat.items.length} indikator · Skor {cat.totalScore}/{cat.maxScore}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <KlasifikasiBadge level={cat.klasifikasi} />
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="px-5 py-3 border-b bg-white">
                    <ScoreBar score={cat.totalScore} max={cat.maxScore} />
                  </div>

                  {/* Indikator detail */}
                  <div className="divide-y divide-gray-100">
                    {cat.items.map((item) => {
                      const cfg       = STATUS_ENTRY[item.status] ?? STATUS_ENTRY.DRAFT
                      const validated = item.validations[0]
                      const effScore  = validated?.validatedScore ?? item.score
                      return (
                        <div key={item.id} className="px-5 py-3 flex items-start gap-4">
                          <div className="w-6 text-center text-xs font-semibold text-gray-400 mt-0.5 shrink-0">
                            {item.indicator.number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 leading-snug">{item.indicator.indicator}</p>
                            {item.description && item.description !== '-' && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                            )}
                            {validated?.notes && (
                              <p className="text-xs text-amber-600 mt-1">💬 {validated.notes}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-bold text-gray-900 leading-none">
                              {effScore}<span className="text-xs font-normal text-gray-400">/{item.indicator.maxScore}</span>
                            </p>
                            {validated?.validatedScore != null && validated.validatedScore !== item.score && (
                              <p className="text-xs text-gray-400 line-through">{item.score}</p>
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
            </div>

            {/* ── Summary card ── */}
            <div className="rounded-xl border-2 border-sky-200 bg-sky-50 px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <FontAwesomeIcon icon={faMedal} className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-sky-900">Rekapitulasi Nilai</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sky-200 text-xs font-semibold text-sky-700">
                      <th className="pb-2 text-left">Kategori</th>
                      <th className="pb-2 text-center">Total Skor</th>
                      <th className="pb-2 text-center">Maks</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {g.categories.map((cat) => (
                      <tr key={cat.id}>
                        <td className="py-2.5 font-medium text-gray-800">{cat.code}. {cat.name}</td>
                        <td className="py-2.5 text-center font-bold text-gray-900">{cat.totalScore}</td>
                        <td className="py-2.5 text-center text-gray-500">{cat.maxScore}</td>
                        <td className="py-2.5 text-right">
                          <KlasifikasiBadge level={cat.klasifikasi} />
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="border-t-2 border-sky-300 font-bold">
                      <td className="pt-3 text-sky-900">TOTAL KESELURUHAN</td>
                      <td className="pt-3 text-center text-sky-900 text-lg">{g.totalScore}</td>
                      <td className="pt-3 text-center text-sky-700">{g.maxScore}</td>
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
