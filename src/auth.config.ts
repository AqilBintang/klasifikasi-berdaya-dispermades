import type { NextAuthConfig } from 'next-auth'

// Config ini tidak boleh mengimpor Prisma atau library Node.js lainnya
// karena digunakan di Edge Runtime (middleware).
export const authConfig = {
  providers: [],
  pages: { signIn: '/kecamatan/login' },
  session: {
    strategy: 'jwt' as const,
    maxAge: 60 * 60,
    updateAge: 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Diperlukan agar middleware bisa baca session.user.role dari JWT token
    jwt({ token }) {
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id        = token.id as string
        session.user.role      = token.role as 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR' | 'USER'
        session.user.kabupaten = token.kabupaten as string | undefined
        session.user.kecamatan = token.kecamatan as string | undefined
      }
      return session
    },
  },
} satisfies NextAuthConfig
