'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Calendar, Megaphone, ArrowRight, Search } from 'lucide-react'

import { getRecentPrograms, mockPrograms } from '@/data/programs'
import { getUpcomingActivities, mockActivities } from '@/data/activities'
import { getRecentAnnouncements, mockAnnouncements } from '@/data/announcements'

import { StatisticCard, StatisticCardSkeleton } from '@/components/shared/ui/StatisticCard'
import { ProgramCard, ProgramCardSkeleton } from '@/components/shared/ui/ProgramCard'
import { ActivityCard, ActivityCardSkeleton } from '@/components/shared/ui/ActivityCard'
import { AnnouncementCard, AnnouncementCardSkeleton } from '@/components/shared/ui/AnnouncementCard'
import { SectionEmpty, SectionError } from '@/components/shared/ui/SectionStates'
import { InfoBanner } from '@/components/shared/ui/InfoBanner'
import type { BannerSlide } from '@/components/shared/ui/InfoBanner'
import { buttonVariants } from '@/components/ui/button'

import { cn } from '@/lib/utils'
import type { Program } from '@/types/program'
import type { Activity } from '@/types/activity'

import type { Announcement } from '@/types/announcement'

function SectionHeader({ title, href, id }: { title: string; href: string; id: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      <Link
        href={href}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        Lihat Semua <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Mandiri' | 'Maju' | 'Berkembang' | 'Tertinggal' | 'Sangat Tertinggal'>('Semua')

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Derived data
  const recentPrograms: Program[] = getRecentPrograms(3)
  const upcomingActivities: Activity[] = getUpcomingActivities(3)
  const recentAnnouncements: Announcement[] = getRecentAnnouncements(3)

  // Statistics
  const activePrograms = mockPrograms.filter((p) => p.status === 'active').length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingCount = mockActivities.filter((a) => new Date(a.date) >= today).length
  const announcementsCount = mockAnnouncements.length

  // Today's date in Indonesian format — tidak dipakai di hero, bisa untuk section lain nanti

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
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          {/* Kiri — Placeholder deskripsi */}
          <div className="flex flex-col gap-4">
            {/* Label */}
            <div className="h-4 w-24 rounded bg-gray-300/60 border border-dashed border-gray-400" />
            {/* Heading */}
            <div className="h-8 w-3/4 rounded bg-gray-300/60 border border-dashed border-gray-400" />
            <div className="h-8 w-1/2 rounded bg-gray-300/60 border border-dashed border-gray-400" />
            {/* Body text lines */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="h-3 w-full rounded bg-gray-200/80 border border-dashed border-gray-300" />
              <div className="h-3 w-full rounded bg-gray-200/80 border border-dashed border-gray-300" />
              <div className="h-3 w-5/6 rounded bg-gray-200/80 border border-dashed border-gray-300" />
              <div className="h-3 w-4/5 rounded bg-gray-200/80 border border-dashed border-gray-300" />
              <div className="h-3 w-full rounded bg-gray-200/80 border border-dashed border-gray-300" />
              <div className="h-3 w-3/4 rounded bg-gray-200/80 border border-dashed border-gray-300" />
            </div>
            {/* CTA button */}
            <div className="mt-4 h-10 w-36 rounded-full bg-gray-300/60 border border-dashed border-gray-400" />
          </div>

          {/* Kanan — Placeholder gambar */}
          <div className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-400 bg-gray-200/50 flex flex-col items-center justify-center gap-3">
            {/* Image icon placeholder */}
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
      </section>

      {/* ── Dashboard Content ── */}
      <div className="space-y-8 px-4 md:px-6 lg:px-8 py-12 max-w-7xl mx-auto bg-white/80 rounded-3xl mt-6 mb-8 shadow-sm">

      {/* ── Statistics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatisticCardSkeleton />
            <StatisticCardSkeleton />
            <StatisticCardSkeleton />
          </>
        ) : (
          <>
            <StatisticCard
              title="Program Aktif"
              value={activePrograms}
              icon={BookOpen}
            />
            <StatisticCard
              title="Kegiatan Mendatang"
              value={upcomingCount}
              icon={Calendar}
            />
            <StatisticCard
              title="Pengumuman"
              value={announcementsCount}
              icon={Megaphone}
            />
          </>
        )}
      </div>

      {/* ── Programs Section ── */}
      <section aria-labelledby="section-programs">
        <SectionHeader
          id="section-programs"
          title="Program Terbaru"
          href="/programs"
        />
        {hasError ? (
          <SectionError
            message="Gagal memuat data program."
            onRetry={() => setHasError(false)}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProgramCardSkeleton />
            <ProgramCardSkeleton />
            <ProgramCardSkeleton />
          </div>
        ) : recentPrograms.length === 0 ? (
          <SectionEmpty message="Belum ada program yang tersedia." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onClick={() => router.push('/programs/' + program.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Activities Section ── */}
      <section aria-labelledby="section-activities">
        <SectionHeader
          id="section-activities"
          title="Kegiatan Mendatang"
          href="/activities"
        />
        {hasError ? (
          <SectionError
            message="Gagal memuat data kegiatan."
            onRetry={() => setHasError(false)}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
            <ActivityCardSkeleton />
          </div>
        ) : upcomingActivities.length === 0 ? (
          <SectionEmpty message="Belum ada kegiatan mendatang." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onClick={() => router.push('/activities/' + activity.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Announcements Section ── */}
      <section aria-labelledby="section-announcements">
        <SectionHeader
          id="section-announcements"
          title="Pengumuman Terbaru"
          href="/announcements"
        />
        {hasError ? (
          <SectionError
            message="Gagal memuat data pengumuman."
            onRetry={() => setHasError(false)}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
          </div>
        ) : recentAnnouncements.length === 0 ? (
          <SectionEmpty message="Belum ada pengumuman." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onClick={() => router.push('/announcements/' + announcement.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
  )
}