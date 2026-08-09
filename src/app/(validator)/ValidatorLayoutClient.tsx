'use client'

import { signOut } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { ToastContainer } from '@/components/ui/toast'

interface Props {
  userName: string
  children: React.ReactNode
}

export default function ValidatorLayoutClient({ userName, children }: Props) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <header className="sticky top-0 z-40 h-16 border-b bg-white shadow-sm shrink-0">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
              <FontAwesomeIcon icon={faShieldHalved} className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Tim Teknis</p>
              <p className="text-xs text-gray-500">{userName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>

      <ToastContainer />
    </div>
  )
}
