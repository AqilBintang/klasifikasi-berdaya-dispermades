import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AuditLogClient } from '@/components/admin/AuditLogClient'

export default async function AuditLogPage() {
  const session = await auth()
  
  // Only SUPER_ADMIN can access this page
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
        <p className="text-gray-600 mt-1">
          Riwayat aktivitas penting dalam sistem
        </p>
      </div>
      <AuditLogClient />
    </div>
  )
}