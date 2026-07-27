import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { KecamatanSidebar } from '@/components/kecamatan/KecamatanSidebar'
import { KecamatanHeader } from '@/components/kecamatan/KecamatanHeader'

export default async function KecamatanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <KecamatanSidebar />
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        <KecamatanHeader
          userName={session.user?.name ?? ''}
          kabupaten={session.user?.kabupaten ?? ''}
          kecamatan={session.user?.kecamatan ?? ''}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
