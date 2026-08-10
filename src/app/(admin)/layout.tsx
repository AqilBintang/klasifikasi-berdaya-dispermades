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
  if (session.user.role !== 'ADMIN') redirect('/kecamatan/dashboard')

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
