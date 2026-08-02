import { prisma } from '@/lib/prisma'
import { ManageUserClient } from '@/components/admin/ManageUserClient'

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        kabupaten: { select: { nama: true } },
        kecamatan: { select: { nama: true } },
        _count: { select: { selfAssessments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return users.map((u) => ({
      ...u,
      kabupaten: u.kabupaten?.nama ?? null,
      kecamatan: u.kecamatan?.nama ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
  } catch (err) {
    console.error('[ManageUsersPage] getUsers error:', err)
    return []
  }
}

export default async function ManageUsersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Management User</h2>
      </div>
      <ManageUserClient initialUsers={users} />
    </div>
  )
}
