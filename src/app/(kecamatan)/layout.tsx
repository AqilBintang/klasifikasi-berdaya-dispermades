import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import KecamatanLayoutClient from './KecamatanLayoutClient'

export default async function KecamatanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/kecamatan/login')
  if (session.user.role !== 'USER') redirect('/admin')

  return (
    <KecamatanLayoutClient
      userName={session.user?.name ?? ''}
      kabupaten={session.user?.kabupaten ?? ''}
      kecamatan={session.user?.kecamatan ?? ''}
    >
      {children}
    </KecamatanLayoutClient>
  )
}
