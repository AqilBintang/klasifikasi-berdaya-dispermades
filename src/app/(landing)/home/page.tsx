import { MapPin, CheckCircle, CalendarDays, TrendingUp } from 'lucide-react'
import { InfoBanner } from '@/components/shared/ui/InfoBanner'
import { LandingDataSection } from '@/components/landing/LandingDataSection'
import { StatCard } from '@/components/landing/StatCard'
import { getKabKotaJateng, getKecamatanMapJateng } from '@/lib/wilayah/jateng'
import { getKlasifikasiKecamatanAggPerYear } from '@/lib/klasifikasi/aggregation'
import type { BannerSlide } from '@/components/shared/ui/InfoBanner'
import { promises as fs } from 'fs'
import path from 'path'

async function getLandingContent() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), 'src/data/landing-page.json'),
      'utf-8'
    )
    return JSON.parse(raw) as {
      banner: { slides: BannerSlide[] }
      tentangPlatform: { heading: string; description: string; points: string[] }
    }
  } catch {
    // fallback ke default bila file belum ada
    return {
      banner: {
        slides: [
          { id: 'banner-1', imageUrl: '', alt: '' },
          { id: 'banner-2', imageUrl: '', alt: '' },
          { id: 'banner-3', imageUrl: '', alt: '' },
        ],
      },
      tentangPlatform: {
        heading: 'Apa itu Klasifikasi Berdaya?',
        description:
          'Klasifikasi Kecamatan Berdaya adalah sistem penilaian mandiri berbasis indikator yang mengukur kapasitas dan kinerja kecamatan dalam menjalankan program pemberdayaan masyarakat di Jawa Tengah.',
        points: [
          'Penilaian dilakukan oleh kecamatan secara mandiri melalui self-assessment',
          'Setiap indikator divalidasi oleh tim admin untuk menjamin akurasi data',
          'Hasil klasifikasi dipublikasikan secara transparan kepada masyarakat',
          'Data digunakan sebagai dasar pengambilan kebijakan pemberdayaan wilayah',
        ],
      },
    }
  }
}

const LEVEL_CONFIG = [
  {
    level: 'Belum Berdaya',
    range: 'Skor ≤ 21',
    accent: 'bg-red-400',
    desc: 'Belum memiliki kapasitas dasar untuk menjalankan program pemberdayaan secara mandiri.',
  },
  {
    level: 'Rintisan',
    range: 'Skor 22–42',
    accent: 'bg-amber-400',
    desc: 'Mulai menunjukkan inisiatif pemberdayaan namun masih memerlukan pendampingan intensif.',
  },
  {
    level: 'Berkembang',
    range: 'Skor 43–63',
    accent: 'bg-blue-400',
    desc: 'Telah memiliki sistem dan program pemberdayaan yang berjalan dengan baik.',
  },
  {
    level: 'Maju',
    range: 'Skor ≥ 64',
    accent: 'bg-green-400',
    desc: 'Mencapai tingkat pemberdayaan optimal dan menjadi percontohan bagi wilayah lain.',
  },
] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const [kabKota, kecamatanByKabKota, stats, landingContent] = await Promise.all([
    getKabKotaJateng(),
    getKecamatanMapJateng(),
    getKlasifikasiKecamatanAggPerYear(),
    getLandingContent(),
  ])

  const latestYear = stats.years.at(-1) ?? '-'
  const latestChartRow = stats.chartData.at(-1)
  const majuCount = latestChartRow?.maju ?? 0

  const bannerSlides: BannerSlide[] = landingContent.banner.slides
  const tentang = landingContent.tentangPlatform

  return (
    <div>
      {/* ── ① HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative flex items-center justify-center"
        style={{
          minHeight: '100svh',
          backgroundImage: 'url(/hero/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-label="Hero section"
      >
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center gap-8">
          <div className="w-full">
            <InfoBanner slides={bannerSlides} />
          </div>

          <div className="w-full text-center text-white">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight drop-shadow-lg">
              Klasifikasi Indeks<br />Kecamatan Berdaya
            </h1>
            <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Platform penilaian mandiri kecamatan untuk mengukur kapasitas dan
              potensi pemberdayaan wilayah di Jawa Tengah.
            </p>
          </div>

          <a
            href="#data"
            className="inline-flex items-center gap-2 rounded-full bg-white/20 border border-white/30 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label="Lihat data klasifikasi"
          >
            Lihat Data Klasifikasi
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16 md:h-20 block">
            <path d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" fill="oklch(88.87% 0.0568 219.092)" />
          </svg>
        </div>
      </section>

      {/* ── ② STAT CARDS ──────────────────────────────────────────────────── */}
      <section aria-label="Statistik ringkas" style={{ backgroundColor: 'oklch(88.87% 0.0568 219.092)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              value={stats.totalRegistered}
              label="Kecamatan Terdaftar"
              sub="Seluruh Jawa Tengah"
            />
            <StatCard
              icon={<CheckCircle className="h-5 w-5" aria-hidden="true" />}
              value={stats.totalWithData}
              label="Sudah Dinilai"
              sub="Memiliki data tervalidasi"
            />
            <StatCard
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
              value={latestYear}
              label="Tahun Data Terbaru"
              sub={stats.years.length > 1 ? `Dari ${stats.years.at(0)} s.d. ${latestYear}` : undefined}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
              value={majuCount}
              label="Kecamatan Maju"
              sub={latestYear !== '-' ? `Per tahun ${latestYear}` : undefined}
            />
          </div>
        </div>
      </section>

      {/* ── ③ TENTANG KLASIFIKASI BERDAYA ─────────────────────────────────── */}
      <section aria-labelledby="tentang-heading" style={{ backgroundColor: 'oklch(88.87% 0.0568 219.092)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-20">
          <div className="w-full h-px bg-sky-200/60 mb-16" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-5">
              <div className="inline-flex w-fit items-center rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                Tentang Platform
              </div>
              <h2 id="tentang-heading" className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                {tentang.heading}
              </h2>
              <p className="text-sm md:text-base text-justify leading-relaxed text-gray-700">
                {tentang.description}
              </p>
              <ul className="flex flex-col gap-3 text-sm text-gray-700">
                {tentang.points.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-sky-300/60 bg-white/40 flex flex-col items-center justify-center gap-3">
              <svg className="w-16 h-16 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
                <path d="M21 15l-5-5L5 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-sky-400 font-medium">Gambar</span>
              <span className="text-xs text-sky-400">Rasio 4 : 3</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ④ 4 LEVEL KLASIFIKASI ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: 'oklch(88.87% 0.0568 219.092)' }} className="overflow-hidden leading-none -mb-1">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 block" aria-hidden="true">
          <path d="M0,0 C720,80 720,80 1440,0 L1440,60 L0,60 Z" fill="#e2e8f0" />
        </svg>
      </div>

      <section aria-labelledby="level-heading" className="bg-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 mb-3">
              Sistem Penilaian
            </div>
            <h2 id="level-heading" className="text-3xl md:text-4xl font-bold text-gray-900">
              4 Level Klasifikasi
            </h2>
            <p className="mt-3 text-sm md:text-base text-gray-600 max-w-xl mx-auto">
              Setiap kecamatan diklasifikasikan ke dalam salah satu dari empat tingkat
              berdasarkan total skor penilaian mandiri.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEVEL_CONFIG.map((item) => (
              <div key={item.level} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className={`w-1 shrink-0 rounded-full ${item.accent}`} aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-gray-900">{item.level}</p>
                  <p className="text-xs text-gray-400">{item.range}</p>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-slate-200 overflow-hidden leading-none -mb-1">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 block" aria-hidden="true">
          <path d="M0,60 C720,-20 720,-20 1440,60 L1440,60 L0,60 Z" fill="#ffffff" />
        </svg>
      </div>

      {/* ── ⑤ DATA KLASIFIKASI (peta + chart) ─────────────────────────────── */}
      <section id="data" aria-labelledby="data-heading" className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 mb-3">
              Data Publik
            </div>
            <h2 id="data-heading" className="text-3xl md:text-4xl font-bold text-gray-900">
              Data Klasifikasi Kecamatan
            </h2>
            <p className="mt-3 text-sm md:text-base text-gray-600 max-w-xl mx-auto">
              Pilih kabupaten/kota di peta untuk melihat distribusi klasifikasi kecamatan
              dari waktu ke waktu.
            </p>
          </div>

          <LandingDataSection
            kabKota={kabKota}
            kecamatanByKabKota={kecamatanByKabKota}
          />
        </div>
      </section>
    </div>
  )
}
