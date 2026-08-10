'use client'

import { signOut } from 'next-auth/react'
import {
  Menu,
  Bell,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AdminHeaderProps {
  onMenuToggle: () => void
  isSidebarOpen: boolean
  pageTitle?: string
}

export function AdminHeader({
  onMenuToggle,
  isSidebarOpen,
  pageTitle = 'Dashboard',
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-white shadow-sm shrink-0">
      <div className="flex h-full items-center justify-between px-4">
        {/* Kiri */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu navigasi"
            aria-expanded={isSidebarOpen}
            onClick={onMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{pageTitle}</h1>
        </div>

        {/* Kanan */}
        <div className="flex items-center gap-2">
          {/* Notifikasi */}
          <button
            type="button"
            className="relative flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              3
            </span>
          </button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
              <Avatar className="size-8">
                <AvatarFallback className="bg-sky-500 text-white text-xs font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium text-gray-800">Admin</span>
                <span className="text-xs text-gray-500">Administrator</span>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="text-red-500 focus:text-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
