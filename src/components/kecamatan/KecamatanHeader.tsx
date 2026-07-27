'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons'

interface KecamatanHeaderProps {
  userName: string
  kabupaten: string
  kecamatan: string
}

export function KecamatanHeader({ userName, kabupaten, kecamatan }: KecamatanHeaderProps) {
  const location = [kecamatan, kabupaten].filter(Boolean).join(', ')

  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-white shadow-sm shrink-0">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-sky-500" />
          <span className="font-semibold text-gray-800">
            {location || 'Kecamatan'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Halo, <span className="font-medium text-gray-800">{userName}</span>
        </div>
      </div>
    </header>
  )
}
