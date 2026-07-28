'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Home',             href: '/home' },
  { label: 'About Programs',   href: '/programs' },
  { label: 'FAQ',              href: '/faq' },
  { label: 'Announcements',    href: '/announcements' },
  { label: 'Contact',          href: '/contact' },
]

export function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    if (!mobileOpen) return
    const id = window.requestAnimationFrame(() => setMobileOpen(false))
    return () => window.cancelAnimationFrame(id)
  }, [pathname, mobileOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <header className="fixed top-0 z-50 w-full">
      <nav
        aria-label="Navigasi Utama"
        className={cn(
          // Base styles
          'mx-auto flex items-center justify-between px-6 py-3',
          'transition-all duration-400 ease-in-out',
          // Scrolled state
          scrolled
            ? 'mt-2.5 w-[80%] rounded-2xl bg-white shadow-[0_5px_20px_rgba(0,0,0,0.15)]'
            : 'w-full bg-white border-b border-gray-100 shadow-sm'
        )}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center justify-center gap-1 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo-kota.png"
            alt="Logo Kota"
            className="h-10 w-auto object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/kecamatan-berdaya.png"
            alt="Klas Berdaya"
            className="h-11 w-auto object-contain translate-y-[1px]"
          />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-6" role="list">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative text-sm font-medium transition-colors duration-200 pb-1',
                    'after:absolute after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:transition-all after:duration-200',
                    active
                      ? 'text-sky-600 after:w-full after:bg-sky-500'
                      : 'text-gray-600 hover:text-gray-900 after:w-0 hover:after:w-full hover:after:bg-gray-400'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          className={cn(
            'md:hidden flex items-center justify-center rounded-md p-2 transition-colors duration-200',
            scrolled
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-700 hover:bg-gray-100'
          )}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-xl md:hidden',
          'transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <span className="font-bold text-gray-900">Menu</span>
          <button
            type="button"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav aria-label="Menu mobile">
          <ul className="flex flex-col px-3 py-4 gap-1" role="list">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sky-50 text-sky-700 font-semibold border-l-2 border-sky-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
