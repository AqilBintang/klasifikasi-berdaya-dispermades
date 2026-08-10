import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const session = await auth()
  const { pathname } = req.nextUrl

  // ── /admin (kecuali login) ──────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!session) {
      const url = new URL('/admin/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (session.user.role === 'VALIDATOR') {
      return NextResponse.redirect(new URL('/validator/validasi', req.url))
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/kecamatan/dashboard', req.url))
    }
  }

  // ── /validator ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/validator')) {
    if (!session) {
      const url = new URL('/admin/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (session.user.role !== 'VALIDATOR') {
      const dest = session.user.role === 'ADMIN' ? '/admin' : '/kecamatan/dashboard'
      return NextResponse.redirect(new URL(dest, req.url))
    }
  }

  // ── /kecamatan (kecuali login) ─────────────────────────────────────────
  if (pathname.startsWith('/kecamatan') && pathname !== '/kecamatan/login') {
    if (!session) {
      const url = new URL('/kecamatan/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (session.user.role === 'ADMIN')     return NextResponse.redirect(new URL('/admin', req.url))
    if (session.user.role === 'VALIDATOR') return NextResponse.redirect(new URL('/validator/validasi', req.url))
  }

  // ── Halaman login kecamatan — redirect jika sudah login ───────────────
  if (pathname === '/kecamatan/login' && session) {
    if (session.user.role === 'ADMIN')     return NextResponse.redirect(new URL('/admin', req.url))
    if (session.user.role === 'VALIDATOR') return NextResponse.redirect(new URL('/validator/validasi', req.url))
    return NextResponse.redirect(new URL('/kecamatan/dashboard', req.url))
  }

  // ── Halaman login admin — redirect jika sudah login ───────────────────
  if (pathname === '/admin/login' && session) {
    if (session.user.role === 'ADMIN')     return NextResponse.redirect(new URL('/admin', req.url))
    if (session.user.role === 'VALIDATOR') return NextResponse.redirect(new URL('/validator/validasi', req.url))
    return NextResponse.redirect(new URL('/kecamatan/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/validator/:path*', '/kecamatan/:path*'],
}
