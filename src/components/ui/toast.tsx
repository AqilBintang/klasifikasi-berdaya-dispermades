'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

// ─── Global state (singleton sederhana) ──────────────────────────────────────
// ponytail: global mutable ref, cukup untuk satu app tanpa context/provider

let _setToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null
let _idCounter = 0

function push(type: ToastType, message: string) {
  if (!_setToasts) return
  const id = ++_idCounter
  _setToasts((prev) => [...prev, { id, type, message }])
  setTimeout(() => {
    _setToasts?.((prev) => prev.filter((t) => t.id !== id))
  }, 4000)
}

export const toast = {
  success: (msg: string) => push('success', msg),
  error:   (msg: string) => push('error',   msg),
  warning: (msg: string) => push('warning', msg),
}

// ─── Toast item ───────────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: typeof faCheckCircle; bg: string; border: string; text: string }> = {
  success: { icon: faCheckCircle,        bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800' },
  error:   { icon: faTriangleExclamation, bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800'   },
  warning: { icon: faTriangleExclamation, bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-800' },
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const cfg = CONFIG[t.type]
  const [visible, setVisible] = useState(false)

  // Fade in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm max-w-sm w-full transition-all duration-300',
        cfg.bg, cfg.border, cfg.text,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <FontAwesomeIcon icon={cfg.icon} className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1 leading-snug">{t.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Tutup notifikasi"
      >
        <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── ToastContainer — letakkan sekali di layout ───────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const ref = useRef(setToasts)
  ref.current = setToasts

  useEffect(() => {
    _setToasts = ref.current
    return () => { _setToasts = null }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  )
}
