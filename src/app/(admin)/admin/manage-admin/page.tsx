import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ManageAdminClient } from '@/components/admin/ManageAdminClient'
import { prisma } from '@/lib/prisma'

async function getAdminUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'VALIDATOR'] }
      },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        kabupatenName: true, kecamatanName: true,
        _count: { select: { selfAssessments: true } },
      },
      orderBy: [
        { role: 'asc' }, // SUPER_ADMIN first, then ADMIN, then VALIDATOR
        { createdAt: 'desc' }
      ],
    })
    return users.map((u) => ({
      ...u,
      kabupaten: u.kabupatenName ?? null,
      kecamatan: u.kecamatanName ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
  } catch (err) {
    console.error('[ManageAdminPage] getAdminUsers error:', err)
    return []
  }
}

export default async function ManageAdminPage() {
  const session = await auth()
  
  // Only SUPER_ADMIN can access this page
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin')
  }

  const adminUsers = await getAdminUsers()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manajemen Admin</h2>
        <p className="text-gray-600 mt-1">
          Kelola akun Admin, Validator, dan Super Admin
        </p>
      </div>
      <ManageAdminClient initialUsers={adminUsers} />
    </div>
  )
}