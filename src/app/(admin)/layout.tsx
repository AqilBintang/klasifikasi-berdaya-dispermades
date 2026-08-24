import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AdminLayoutClient from './AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/admin/login')
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') redirect('/kecamatan/dashboard')

  return (
    <>
      {/* Override body background & scroll untuk halaman admin */}
      <style>{`body { background-color: #f3f4f6 !important; overflow: hidden !important; }`}</style>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  )
}
