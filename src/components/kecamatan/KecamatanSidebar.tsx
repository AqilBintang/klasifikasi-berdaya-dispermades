'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGauge,
  faClipboardList,
  faChartBar,
  faBook,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/kecamatan/dashboard',  icon: faGauge },
  { label: 'Panduan',        href: '/kecamatan/panduan',    icon: faBook },
  { label: 'Isi Assessment', href: '/kecamatan/assessment', icon: faClipboardList },
  { label: 'Hasil Nilai',    href: '/kecamatan/hasil',      icon: faChartBar },
]

export function KecamatanSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30">
      <div className="flex h-full flex-col bg-gray-900 text-gray-100">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo-kota.png" alt="Logo" className="h-8 w-auto" />
          <div>
            <p className="font-bold text-sm text-white">Klas Berdaya</p>
            <p className="text-xs text-gray-400">Portal Kecamatan</p>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Navigasi Kecamatan" className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1" role="list">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    )}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-700/60">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
