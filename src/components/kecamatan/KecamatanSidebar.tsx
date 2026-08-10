'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Gauge, ClipboardList, BarChart3, BookOpen, LogOut, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import Image from 'next/image'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/kecamatan/dashboard',  icon: Gauge },
  { label: 'Panduan',        href: '/kecamatan/panduan',    icon: BookOpen },
  { label: 'Isi Assessment', href: '/kecamatan/assessment', icon: ClipboardList },
  { label: 'Hasil Nilai',    href: '/kecamatan/hasil',      icon: BarChart3 },
  { label: 'Statistik',      href: '/kecamatan/statistik',  icon: TrendingUp },
]

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
        <Image src="/logo/logo-kota.png" alt="Logo" width={32} height={32} className="h-8 w-auto object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm text-white">Klas Berdaya</span>
          <span className="text-xs text-slate-400">Portal Kecamatan</span>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Navigasi Kecamatan" className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700/60">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/kecamatan/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  )
}

interface KecamatanSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function KecamatanSidebar({ isOpen, onClose }: KecamatanSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile drawer */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
          <SheetContent side="left" className="p-0 w-64" showCloseButton={false}>
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <SidebarContent onClose={onClose} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
