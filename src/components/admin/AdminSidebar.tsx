'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  Gauge, ClipboardList, PlusCircle, Award,
  BarChart3, FileDown, Users, ChevronDown, ChevronRight,
  LogOut, BookOpen, Film, Shield, ScrollText, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import Image from 'next/image'

// ─── Nav config ───────────────────────────────────────────────────────────────

const ASSESSMENT_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Create Assessment',       href: '/admin/assessment/create',     icon: PlusCircle },
  { label: 'Rekapitulasi Assessment', href: '/admin/assessment/results',     icon: Award },
]

// ─── SidebarContent ───────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

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
        <Image
          src="/logo/logo-kota.png"
          alt="Logo"
          width={32}
          height={32}
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
              <Gauge className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </Link>
          </li>

          {/* ── Landing Page ── */}
          <li>
            <Link
              href="/admin/landing-page"
              onClick={onClose}
              aria-current={isActive('/admin/landing-page') ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive('/admin/landing-page')
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <Film className="w-4 h-4 shrink-0" />
              <span>Landing Page</span>
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
              <BookOpen className="w-4 h-4 shrink-0" />
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
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Assessment</span>
              {assessmentOpen
                ? <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                : <ChevronRight className="w-3 h-3 transition-transform duration-200" />
              }
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
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
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
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Klasifikasi Berdaya</span>
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
              <FileDown className="w-4 h-4 shrink-0" />
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
              <Users className="w-4 h-4 shrink-0" />
              <span>Manage User</span>
            </Link>
          </li>

          {/* ── Super Admin Menu ── */}
          {isSuperAdmin && (
            <>
              <li className="pt-2">
                <div className="flex items-center gap-2 px-3 pb-1">
                  <div className="h-px flex-1 bg-gray-700/60" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Super Admin</span>
                  <div className="h-px flex-1 bg-gray-700/60" />
                </div>
              </li>

              <li>
                <Link
                  href="/admin/manage-admin"
                  onClick={onClose}
                  aria-current={isActive('/admin/manage-admin') ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive('/admin/manage-admin')
                      ? 'bg-red-500/20 text-red-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  )}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Manajemen Admin</span>
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/audit-log"
                  onClick={onClose}
                  aria-current={isActive('/admin/audit-log') ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive('/admin/audit-log')
                      ? 'bg-red-500/20 text-red-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  )}
                >
                  <ScrollText className="w-4 h-4 shrink-0" />
                  <span>Audit Log</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700/60">
        <button
          type="button"
          aria-label="Keluar dari admin"
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
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
