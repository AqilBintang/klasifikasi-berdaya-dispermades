'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface KecamatanHeaderProps {
  userName: string
  kabupaten: string
  kecamatan: string
  onMenuToggle: () => void
  pageTitle?: string
}

export function KecamatanHeader({
  userName,
  kabupaten,
  kecamatan,
  onMenuToggle,
  pageTitle = 'Dashboard',
}: KecamatanHeaderProps) {
  const location = [kecamatan, kabupaten].filter(Boolean).join(', ')
  const initials = userName.trim().charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-white shadow-sm shrink-0">
      <div className="flex h-full items-center justify-between px-4">

        {/* Kiri */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu navigasi"
            onClick={onMenuToggle}
          >
            <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{pageTitle}</h1>
        </div>

        {/* Kanan */}
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sky-500 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium text-gray-800">{userName}</span>
            <span className="text-xs text-gray-500 truncate max-w-[180px]">{location || 'Kecamatan'}</span>
          </div>
        </div>

      </div>
    </header>
  )
}
