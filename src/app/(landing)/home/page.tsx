'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { InfoBanner } from '@/components/shared/ui/InfoBanner'
import type { BannerSlide } from '@/components/shared/ui/InfoBanner'


import { cn } from '@/lib/utils'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Mandiri' | 'Maju' | 'Berkembang' | 'Tertinggal' | 'Sangat Tertinggal'>('Semua')

  const bannerSlides: BannerSlide[] = [
    { id: 'banner-1' },
    { id: 'banner-2' },
    { id: 'banner-3' },
  ]

  return (
    <div>
      {/* ── Hero Section ── */}
      <section
        className="relative flex items-center justify-center"
        style={{
          height: '110vh',
          backgroundImage: 'url(/hero/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-label="Hero section"
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

        {/* Banner di tengah hero */}
        <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center gap-8">
          {/* Info Banner */}
          <div className="w-full">
            <InfoBanner slides={bannerSlides} />
          </div>

          {/* Judul + Search */}
          <div className="w-full text-center text-white">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight drop-shadow">
              Klasifikasi Desa Wilayah Semarang
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Cari dan temukan data klasifikasi indeks desa di wilayah Semarang
            </p>

            {/* Search bar */}
            <div className="mt-5 mx-auto max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Cari nama desa atau kecamatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border-0 bg-white/95 py-3.5 pl-12 pr-28 text-sm text-gray-900 shadow-lg outline-none transition-shadow focus:shadow-xl focus:ring-2 focus:ring-white placeholder:text-gray-400"
                  aria-label="Cari desa"
                />
                <button
                  type="button"
                  className="absolute right-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Cari
                </button>
              </div>

              {/* Filter chips */}
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {(['Semua', 'Mandiri', 'Maju', 'Berkembang', 'Tertinggal', 'Sangat Tertinggal'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                      filterStatus === status
                        ? 'bg-white text-gray-900 shadow'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider — warna sama dengan background section bawah */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 80"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="w-full h-16 md:h-20 block"
          >
            <path
              d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z"
              fill="oklch(88.87% 0.0568 219.092)"
            />
          </svg>
        </div>

      </section>

      {/* ── Wireframe Section ── */}
      <section
        className="w-full"
        style={{ backgroundColor: 'oklch(88.87% 0.0568 219.092)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

            <div className="flex flex-col gap-4">
              <div className="inline-flex w-fit items-center rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                Tentang Platform
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                Klasifikasi Berdaya
              </h2>
              <p className="text-sm md:text-base text-justify leading-relaxed text-gray-700">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Facere deleniti ex esse voluptas, facilis ipsum officiis vitae tempore neque ullam exercitationem perferendis quasi itaque autem explicabo totam dicta nisi rem inventore temporibus dolores? Optio quisquam fugit, possimus placeat similique eveniet beatae quibusdam sed, aliquam sequi iure aut repudiandae eum quas reiciendis delectus ipsa magnam earum tenetur ea id, odio libero maiores? Quasi nihil, dolor mollitia atque omnis consequuntur pariatur officia soluta libero autem quibusdam repellat, blanditiis beatae iste ea distinctio minima doloremque animi? Impedit voluptatem, labore harum accusamus ex quis, est eius repudiandae animi illo consequuntur aliquid totam maiores delectus itaque expedita eveniet ipsa quae eos? Autem illo voluptas nobis, praesentium ea architecto, dolores similique, velit adipisci obcaecati minus quisquam consequatur est beatae. Quia veritatis minima amet impedit at molestiae, recusandae harum voluptates dignissimos placeat dolore quisquam. Nobis soluta et velit eligendi sunt quae odio doloremque illo dolores, aperiam ipsam.
              </p>
            </div>

            <div className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-400 bg-white/35 flex flex-col items-center justify-center gap-3">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
                <path d="M21 15l-5-5L5 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-gray-400 font-medium">Gambar</span>
              <span className="text-xs text-gray-400">Rasio 4 : 3</span>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
