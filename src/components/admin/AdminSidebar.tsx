'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGauge,
  faClipboardList,
  faCirclePlus,
  faCheckDouble,
  faAward,
  faChartBar,
  faMapLocationDot,
  faFileArrowDown,
  faUsers,
  faChevronDown,
  faChevronRight,
  faRightFromBracket,
  faBook
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

// ─── Nav config ───────────────────────────────────────────────────────────────

const ASSESSMENT_ITEMS = [
  { label: 'Create Assessment',       href: '/admin/assessment/create',     icon: faCirclePlus },
  { label: 'Validation Assessment',   href: '/admin/assessment/validation',  icon: faCheckDouble },
  { label: 'Rekapitulasi Assessment', href: '/admin/assessment/results',     icon: faAward },]

// ─── SidebarContent ───────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()

  // Assessment group open jika salah satu child aktif
  const assessmentActive = ASSESSMENT_ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + '/')
  )
  const [assessmentOpen, setAssessmentOpen] = useState(assessmentActive)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-full flex-col bg-gray-900 text-gray-100">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/logo-kota.png"
          alt="Logo"
          className="h-8 w-auto object-contain"
        />
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm text-white">Klas Berdaya</span>
          <span className="text-xs text-gray-400">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Admin Navigasi" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1" role="list">

          {/* ── Dashboard ── */}
          <li>
            <Link
              href="/admin"
              onClick={onClose}
              aria-current={pathname === '/admin' ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                pathname === '/admin'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <FontAwesomeIcon icon={faGauge} className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </Link>
          </li>

          {/* ── Panduan ── */}
          <li>
            <Link
              href="/admin/panduan"
              onClick={onClose}
              aria-current={isActive('/admin/panduan') ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive('/admin/panduan')
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <FontAwesomeIcon icon={faBook} className="w-4 h-4 shrink-0" />
              <span>Panduan Rubrik</span>
            </Link>
          </li>
          
          {/* ── Assessment group ── */}
          <li>
            <button
              type="button"
              onClick={() => setAssessmentOpen((p) => !p)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                assessmentActive
                  ? 'bg-sky-500/10 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
              aria-expanded={assessmentOpen}
            >
              <FontAwesomeIcon icon={faClipboardList} className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Assessment</span>
              <FontAwesomeIcon
                icon={assessmentOpen ? faChevronDown : faChevronRight}
                className="w-3 h-3 transition-transform duration-200"
              />
            </button>

            {/* Sub-items */}
            {assessmentOpen && (
              <ul className="mt-1 ml-7 flex flex-col gap-0.5 border-l border-gray-700/60 pl-3">
                {ASSESSMENT_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                        isActive(item.href)
                          ? 'text-sky-300 font-medium'
                          : 'text-gray-400 hover:text-gray-100'
                      )}
                    >
                      <FontAwesomeIcon icon={item.icon} className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* ── Klasifikasi Berdaya ── */}
          <li>
            <Link
              href="/admin/klasifikasi-berdaya"
              onClick={onClose}
              aria-current={isActive('/admin/klasifikasi-berdaya') ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive('/admin/klasifikasi-berdaya')
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <FontAwesomeIcon icon={faChartBar} className="w-4 h-4 shrink-0" />
              <span>Klasifikasi Berdaya</span>
            </Link>
          </li>

          <li>
            <Link
              href="/admin/wilayah"
              onClick={onClose}
              aria-current={isActive('/admin/wilayah') ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive('/admin/wilayah')
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <FontAwesomeIcon icon={faMapLocationDot} className="w-4 h-4 shrink-0" />
              <span>Wilayah</span>
            </Link>
          </li>

          <li>
            <Link
              href="/admin/backup"
              onClick={onClose}
              aria-current={isActive('/admin/backup') ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive('/admin/backup')
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <FontAwesomeIcon icon={faFileArrowDown} className="w-4 h-4 shrink-0" />
              <span>Backup & Export</span>
            </Link>
          </li>
          
          {/* ── Manage User ── */}
          <li>
            <Link
              href="/admin/users"
              onClick={onClose}
              aria-current={isActive('/admin/users') ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive('/admin/users')
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <FontAwesomeIcon icon={faUsers} className="w-4 h-4 shrink-0" />
              <span>Manage User</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700/60">
        <button
          type="button"
          aria-label="Keluar dari admin"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

// ─── Sidebar wrapper ──────────────────────────────────────────────────────────

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
          <SheetContent side="left" className="p-0 w-64" showCloseButton={false}>
            <SheetTitle className="sr-only">Admin Menu</SheetTitle>
            <SidebarContent onClose={onClose} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
