'use client'

import { useState } from 'react'
import { KecamatanSidebar } from '@/components/kecamatan/KecamatanSidebar'
import { KecamatanHeader } from '@/components/kecamatan/KecamatanHeader'

interface Props {
  userName: string
  kabupaten: string
  kecamatan: string
  children: React.ReactNode
}

export default function KecamatanLayoutClient({ userName, kabupaten, kecamatan, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <KecamatanSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        <KecamatanHeader
          userName={userName}
          kabupaten={kabupaten}
          kecamatan={kecamatan}
          onMenuToggle={() => setSidebarOpen((p) => !p)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
