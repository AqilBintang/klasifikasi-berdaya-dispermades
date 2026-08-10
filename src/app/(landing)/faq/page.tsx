'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQ_DATA } from '@/data/faq'
import { cn } from '@/lib/utils'

function AccordionItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={cn('text-sm font-medium leading-snug', open ? 'text-sky-700' : 'text-gray-800')}>
          {question}
        </span>
        <ChevronDown
          className={cn('mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          'overflow-hidden text-sm text-gray-600 leading-relaxed transition-all duration-200',
          open ? 'max-h-96 pb-4' : 'max-h-0'
        )}
      >
        {answer}
      </div>
    </div>
  )
}

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>('0-0')

  const toggle = (key: string) => setOpenKey((prev) => (prev === key ? null : key))

  return (
    <div className="min-h-screen bg-white" >
      {/* ── Hero ── */}
      <section className="pt-28 pb-12 px-4" >
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 mb-4">
            Pusat Bantuan
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Pertanyaan yang Sering Ditanyakan
          </h1>
          <p className="mt-3 text-sm md:text-base text-gray-500 leading-relaxed">
            Temukan jawaban atas pertanyaan umum seputar platform Klasifikasi Indeks Kecamatan Berdaya.
          </p>
        </div>
      </section>

      {/* ── Konten FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pb-20">
        <div className="space-y-6">
          {FAQ_DATA.map((cat, ci) => (
            <div key={cat.category}>
              {/* Label kategori */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">
                  {cat.category}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Card */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-5">
                {cat.items.map((item, ii) => (
                  <AccordionItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                    open={openKey === `${ci}-${ii}`}
                    onToggle={() => toggle(`${ci}-${ii}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA kontak ── */}
        <div className="mt-12 rounded-2xl bg-sky-50 border border-sky-100 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-gray-800">Tidak menemukan jawaban yang kamu cari?</p>
          <p className="mt-1 text-sm text-gray-500">Hubungi kami langsung dan tim kami akan segera membantu.</p>
          <a
            href="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
          >
            Hubungi Kami
          </a>
        </div>
      </section>
    </div>
  )
}
