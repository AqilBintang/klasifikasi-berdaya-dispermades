import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const session = await auth()
  const { pathname } = req.nextUrl

  // Proteksi route admin — harus login dan role ADMIN
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!session) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/kecamatan/dashboard', req.url))
    }
  }

  // Proteksi route kecamatan — harus login
  if (pathname.startsWith('/kecamatan')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (session.user.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  // Halaman login kecamatan — redirect jika sudah login
  if (pathname === '/login' && session) {
    const dest = session.user.role === 'ADMIN' ? '/admin' : '/kecamatan/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // Halaman login admin — redirect ke /admin jika sudah login sebagai ADMIN
  if (pathname === '/admin/login' && session?.user.role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/kecamatan/:path*', '/login'],
}
