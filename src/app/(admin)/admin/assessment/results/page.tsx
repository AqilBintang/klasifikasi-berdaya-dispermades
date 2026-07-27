import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faTrophy, faChartBar } from '@fortawesome/free-solid-svg-icons'

interface ResultGroup {
  user: { id: number; name: string }
  assessment: { id: number; title: string }
  periode: string
  entries: {
    id: number
    score: number
    status: string
    indicator: { number: number; indicator: string; maxScore: number; category: { code: string; name: string } }
    validations: { validatedScore: number | null; status: string }[]
  }[]
  totalScore: number
  maxTotalScore: number
}

async function getResults(): Promise<ResultGroup[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/assessment/results`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

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

export default async function AssessmentResultsPage() {
  const groups = await getResults()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hasil Nilai Assessment</h2>
          <p className="mt-1 text-sm text-gray-500">Rekap hasil penilaian per kecamatan</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FontAwesomeIcon icon={faChartBar} className="w-4 h-4" />
          <span>{groups.length} kecamatan</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
          <FontAwesomeIcon icon={faAward} className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Belum ada hasil assessment</p>
          <p className="mt-1 text-sm text-gray-400">Hasil akan muncul setelah kecamatan mengisi dan admin memvalidasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groups
              .sort((a, b) => (b.totalScore / b.maxTotalScore) - (a.totalScore / a.maxTotalScore))
              .slice(0, 3)
              .map((g, i) => {
                const pct = g.maxTotalScore > 0
                  ? Math.round((g.totalScore / g.maxTotalScore) * 100)
                  : 0
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div key={`${g.user.id}_${g.assessment.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
                    <div className="text-3xl mb-2">{medals[i]}</div>
                    <h3 className="font-semibold text-gray-900">{g.user.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{g.assessment.title}</p>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-gray-900">{pct}%</span>
                      <p className="text-xs text-gray-400">{g.totalScore} / {g.maxTotalScore} poin</p>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Full table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b px-6 py-3 bg-gray-50">
              <FontAwesomeIcon icon={faTrophy} className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Rekap Semua Kecamatan</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold text-gray-600">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3">Kecamatan</th>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3 text-center">Total Skor</th>
                  <th className="px-4 py-3 w-48">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups
                  .sort((a, b) => (b.totalScore / b.maxTotalScore) - (a.totalScore / a.maxTotalScore))
                  .map((g, i) => (
                    <tr key={`${g.user.id}_${g.assessment.id}_${g.periode}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-center">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{g.user.name}</td>
                      <td className="px-4 py-3 text-gray-600 line-clamp-1">{g.assessment.title}</td>
                      <td className="px-4 py-3 text-gray-500">{g.periode}</td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {g.totalScore} <span className="font-normal text-gray-400">/ {g.maxTotalScore}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={g.totalScore} max={g.maxTotalScore} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
