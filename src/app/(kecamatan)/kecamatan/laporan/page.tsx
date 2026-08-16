import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LaporanClient } from './LaporanClient'

// Ambil tahun yang tersedia dari periode self-assessment user
async function getAvailableYears(userId: number): Promise<number[]> {
  const entries = await prisma.selfAssessment.findMany({
    where: { submittedById: userId },
    select: { periode: true },
    distinct: ['periode'],
  })

  const yearSet = new Set<number>()
  for (const { periode } of entries) {
    // periode bisa berformat "2025", "2025-1", "Semester 1 2025", dsb.
    const match = periode.match(/\b(20\d{2})\b/)
    if (match) yearSet.add(parseInt(match[1], 10))
  }

  return Array.from(yearSet).sort((a, b) => b - a) // descending
}

export default async function LaporanPage() {
  const session = await auth()
  if (!session?.user) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')

  const userId = parseInt(session.user.id ?? '0', 10)
  const availableYears = await getAvailableYears(userId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Laporan Tahunan</h2>
        <p className="text-gray-600 mt-1">
          Download rekap seluruh assessment dalam satu tahun dalam format Excel.
        </p>
      </div>
      <LaporanClient availableYears={availableYears} />
    </div>
  )
}
