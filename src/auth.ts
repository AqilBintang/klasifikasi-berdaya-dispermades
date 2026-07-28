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
          kabupaten: user.kabupaten ?? undefined,
          kecamatan: user.kecamatan ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id        = user.id
        token.role      = user.role
        token.kabupaten = user.kabupaten
        token.kecamatan = user.kecamatan
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
  pages: { signIn: '/login' },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,       // waktu session (1 jam)
    updateAge: 60 * 60,    // perpanjang session setiap 1 jam jika aktif
  },
  secret: process.env.NEXTAUTH_SECRET,
})
