'use client'

import { useEffect } from 'react'

/**
 * Tampilkan warning saat user coba menutup/refresh tab dengan perubahan yang belum disimpan.
 * Untuk navigasi antar halaman Next.js, gunakan bersama router.events atau konfirmasi manual.
 */
export function useUnsavedWarning(hasUnsaved: boolean) {
  useEffect(() => {
    if (!hasUnsaved) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''  // Chrome memerlukan ini
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsaved])
}
