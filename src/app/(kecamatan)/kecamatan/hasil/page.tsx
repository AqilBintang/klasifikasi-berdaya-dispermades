import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faCheckCircle, faClockRotateLeft, faTimesCircle } from '@fortawesome/free-solid-svg-icons'

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-10 text-right">{pct}%</span>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof faCheckCircle; cls: string }> = {
  VALIDATED: { label: 'Divalidasi',      icon: faCheckCircle,    cls: 'text-green-600' },
  SUBMITTED: { label: 'Menunggu',        icon: faClockRotateLeft,cls: 'text-amber-500' },
  REJECTED:  { label: 'Ditolak',         icon: faTimesCircle,    cls: 'text-red-500' },
  DRAFT:     { label: 'Draft',           icon: faClockRotateLeft,cls: 'text-gray-400' },
}

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
            },
          },
        },
      },
      validations: {
        orderBy: { validatedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { indicator: { category: { order: 'asc' } } },
      { indicator: { number: 'asc' } },
    ],
  })

  // Group by assessment + periode
  type Group = {
    assessment: { id: number; title: string; periode: string }
    items: typeof entries
    totalScore: number
    maxScore: number
  }
  const grouped: Record<string, Group> = {}
  for (const e of entries) {
    const key = `${e.indicator.category.assessmentId}_${e.periode}`
    if (!grouped[key]) {
      grouped[key] = {
        assessment: e.indicator.category.assessment,
        items: [],
        totalScore: 0,
        maxScore: 0,
      }
    }
    grouped[key].items.push(e)
    grouped[key].totalScore += e.validations[0]?.validatedScore ?? e.score
    grouped[key].maxScore += e.indicator.maxScore
  }

  const groups = Object.values(grouped)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hasil Nilai Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rekap hasil penilaian kecamatan Anda per periode
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FontAwesomeIcon icon={faAward} className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada hasil assessment</p>
          <p className="text-sm text-gray-400 mt-1">Submit assessment terlebih dahulu</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={`${g.assessment.id}_${g.assessment.periode}`} className="space-y-4">
            {/* Header grup */}
            <div className="flex items-center justify-between rounded-xl bg-sky-600 px-6 py-4 text-white">
              <div>
                <h3 className="font-semibold">{g.assessment.title}</h3>
                <p className="text-sky-100 text-sm mt-0.5">Periode: {g.assessment.periode}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{g.totalScore}<span className="text-sky-200 text-base font-normal">/{g.maxScore}</span></p>
                <ScoreBar score={g.totalScore} max={g.maxScore} />
              </div>
            </div>

            {/* Tabel detail */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 text-left">
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Indikator</th>
                    <th className="px-4 py-3 text-center">Skor Anda</th>
                    <th className="px-4 py-3 text-center">Skor Validasi</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.items.map((item) => {
                    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DRAFT
                    const validated = item.validations[0]
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {item.indicator.category.code}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs">
                          <p className="line-clamp-2">{item.indicator.indicator}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {item.score}<span className="text-gray-400 font-normal">/{item.indicator.maxScore}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-sky-700">
                          {validated?.validatedScore != null
                            ? <>{validated.validatedScore}<span className="text-gray-400 font-normal">/{item.indicator.maxScore}</span></>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.cls}`}>
                            <FontAwesomeIcon icon={cfg.icon} className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                          {validated?.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{validated.notes}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
