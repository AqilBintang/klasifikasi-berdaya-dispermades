import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email    = String(credentials.email).toLowerCase().trim()
        const password = String(credentials.password)

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id:        String(user.id),
          name:      user.name,
          email:     user.email,
          role:      user.role,
          kabupaten: user.kabupatenName ?? undefined,
          kecamatan: user.kecamatanName ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: populate token from user object
        token.id        = user.id
        token.role      = user.role
        token.kabupaten = user.kabupaten
        token.kecamatan = user.kecamatan
        return token
      }

      // Subsequent requests: re-validate isActive against database.
      // If the DB query fails (transient error), keep the session alive rather
      // than logging out the user — a brief DB hiccup shouldn't kill a valid session.
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: Number(token.id) },
            select: { isActive: true },
          })
          // Only invalidate if we got a clear answer that the user is deactivated
          if (dbUser && !dbUser.isActive) return null
        } catch {
          // DB error — keep session, will be checked on next request
        }
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id        = token.id
        session.user.role      = token.role
        session.user.kabupaten = token.kabupaten
        session.user.kecamatan = token.kecamatan
      }
      return session
    },
  },
  pages: { signIn: '/kecamatan/login' },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,       // waktu session (1 jam)
    updateAge: 60 * 60,    // perpanjang session setiap 1 jam jika aktif
  },
  secret: process.env.NEXTAUTH_SECRET,
})
