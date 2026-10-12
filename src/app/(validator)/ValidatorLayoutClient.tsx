'use client'

import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { ValidatorSidebar } from '@/components/validator/ValidatorSidebar'
import { ValidatorHeader } from '@/components/validator/ValidatorHeader'
import { ToastContainer } from '@/components/ui/toast'

interface Props {
  userName: string
  children: React.ReactNode
}

export default function ValidatorLayoutClient({ userName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100 overscroll-none">
        <ValidatorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Backdrop overlay untuk mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex flex-1 flex-col md:pl-64 min-w-0">
          <ValidatorHeader
            userName={userName}
            onMenuToggle={() => setSidebarOpen((p) => !p)}
          />
          <main className="flex-1 overflow-y-auto overscroll-none bg-gray-100 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <ToastContainer />
      </div>
    </SessionProvider>
  )
}
