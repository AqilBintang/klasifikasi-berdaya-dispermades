'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook auto-save dengan debounce.
 * Memanggil saveFn setelah delay ms sejak terakhir kali data berubah.
 */
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 2000
) {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef  = useRef(saveFn)
  const isFirst    = useRef(true)

  // Selalu pakai versi terbaru saveFn tanpa trigger re-render
  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  useEffect(() => {
    // Skip save pertama kali (saat mount)
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveFnRef.current(data)
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, delay])

  // Flush save segera (untuk cleanup saat unmount)
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    saveFnRef.current(data)
  }, [data])

  return { flush }
}
