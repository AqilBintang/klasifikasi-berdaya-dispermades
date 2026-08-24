'use client'

import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { ToastContainer } from '@/components/ui/toast'

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col md:pl-64 min-w-0">
          <AdminHeader
            onMenuToggle={() => setSidebarOpen((p) => !p)}
            isSidebarOpen={sidebarOpen}
          />
          <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <ToastContainer />
      </div>
    </SessionProvider>
  )
}
