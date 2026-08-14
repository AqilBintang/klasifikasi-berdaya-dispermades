import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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

        const { prisma }  = await import('@/lib/prisma')
        const bcrypt      = await import('bcryptjs')

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
        token.id        = user.id
        token.role      = (user as any).role
        token.kabupaten = (user as any).kabupaten
        token.kecamatan = (user as any).kecamatan

        try {
          const { auditLog } = await import('@/lib/audit')
          await auditLog.userLogin(Number(user.id))
        } catch (err) {
          console.error('Failed to log user login:', err)
        }

        return token
      }

      // Re-validate isActive on subsequent requests
      if (token.id) {
        try {
          const { prisma } = await import('@/lib/prisma')
          const dbUser = await prisma.user.findUnique({
            where: { id: Number(token.id) },
            select: { isActive: true },
          })
          if (dbUser && !dbUser.isActive) return null
        } catch {
          // DB error — keep session
        }
      }

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
})
