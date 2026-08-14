import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR' | 'USER'
      kabupaten?: string
      kecamatan?: string
    }
  }

  interface User {
    id: string
    role: 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR' | 'USER'
    kabupaten?: string
    kecamatan?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR' | 'USER'
    kabupaten?: string
    kecamatan?: string
  }
}
