import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const session = await auth()
  const { pathname } = req.nextUrl

  // Proteksi route kecamatan — harus login
  if (pathname.startsWith('/kecamatan')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Halaman login — redirect ke dashboard jika sudah login
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/kecamatan/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/kecamatan/:path*', '/login'],
}
