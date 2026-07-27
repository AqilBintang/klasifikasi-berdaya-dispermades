'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BannerSlide {
  id: string
  imageUrl?: string   // path ke gambar, contoh: "/banners/banner-1.jpg"
  alt?: string        // alt text untuk aksesibilitas
}

interface InfoBannerProps {
  slides: BannerSlide[]
  autoPlayInterval?: number  // ms, default 4000
  className?: string
}

export function InfoBanner({
  slides,
  autoPlayInterval = 4000,
  className,
}: InfoBannerProps) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1))
  }, [slides.length])

  const next = useCallback(() => {
    setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1))
  }, [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const timer = setInterval(next, autoPlayInterval)
    return () => clearInterval(timer)
  }, [paused, next, autoPlayInterval, slides.length])

  if (slides.length === 0) return null

  const slide = slides[current]

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-2xl shadow-md', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Banner informatif"
    >
      {/* Slide area */}
      <div className="relative w-full h-[180px] md:h-[220px] bg-gray-200">
        {slide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.imageUrl}
            alt={slide.alt ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Placeholder saat gambar belum diisi */
          <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
            <span className="text-sm text-gray-400 select-none">
              Banner {current + 1} — tambahkan gambar via prop imageUrl
            </span>
          </div>
        )}
      </div>

      {/* Prev / Next */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            aria-label="Slide berikutnya"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Pergi ke slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
