import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ManageKecamatanClient } from '@/components/admin/ManageKecamatanClient'
import { prisma } from '@/lib/prisma'

async function getKecamatanUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'USER' // Kecamatan users have role USER
      },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        kabupaten: { select: { nama: true, kode: true } },
        kecamatan: { select: { nama: true, kode: true } },
        _count: { select: { selfAssessments: true } },
      },
      orderBy: [
        { kabupaten: { nama: 'asc' } },
        { kecamatan: { nama: 'asc' } },
        { createdAt: 'desc' }
      ],
    })
    return users.map((u) => ({
      ...u,
      kabupaten: u.kabupaten?.nama ?? null,
      kecamatan: u.kecamatan?.nama ?? null,
      kabupatenKode: u.kabupaten?.kode ?? null,
      kecamatanKode: u.kecamatan?.kode ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
  } catch (err) {
    console.error('[ManageKecamatanPage] getKecamatanUsers error:', err)
    return []
  }
}

export default async function ManageKecamatanPage() {
  const session = await auth()
  
  // Only SUPER_ADMIN can access this page
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin')
  }

  const kecamatanUsers = await getKecamatanUsers()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manajemen User Kecamatan</h2>
        <p className="text-gray-600 mt-1">
          Kelola akun pengguna kecamatan dan akses mereka ke sistem
        </p>
      </div>
      <ManageKecamatanClient initialUsers={kecamatanUsers} />
    </div>
  )
}