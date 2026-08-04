'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  icon: React.ReactNode
  value: number | string
  label: string
  sub?: string
}

function useCountUpOnVisible(target: number, duration = 1400) {
  const [count, setCount]     = useState(0)
  const [started, setStarted] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const rafRef  = useRef<number>(0)

  // IntersectionObserver — trigger sekali saat elemen masuk viewport
  useEffect(() => {
    if (target === 0 || started) return

    const el = nodeRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, started])

  // Animasi count-up, jalan hanya setelah started
  useEffect(() => {
    if (!started || target === 0) return

    const startTime = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, target, duration])

  return { count, nodeRef }
}

export function StatCard({ icon, value, label, sub }: Props) {
  const isNumeric = typeof value === 'number'
  const { count, nodeRef } = useCountUpOnVisible(isNumeric ? value : 0)

  return (
    <div
      ref={nodeRef}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 px-6 py-5 text-center shadow-sm backdrop-blur-sm"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600">
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">
        {isNumeric ? count.toLocaleString('id-ID') : value}
      </p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}
