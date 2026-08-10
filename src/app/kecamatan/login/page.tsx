'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [isAdminError, setIsAdminError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsAdminError(false)
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Email atau password salah. Silakan coba lagi.')
      } else {
        const session = await getSession()
        // Halaman ini khusus kecamatan — tolak jika role ADMIN atau VALIDATOR
        if (session?.user.role === 'ADMIN' || session?.user.role === 'VALIDATOR') {
          await signOut({ redirect: false })
          setIsAdminError(true)
          setError('Akun admin tidak dapat login di sini.')
          setLoading(false)
          return
        }
        const callbackUrl = searchParams.get('callbackUrl') ?? '/kecamatan/dashboard'
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@kecamatan.go.id"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p>{error}</p>
          {isAdminError && (
            <Link
              href="/admin/login"
              className="mt-1 inline-block font-medium underline hover:text-red-800"
            >
              Pergi ke halaman login admin →
            </Link>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-60"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Masuk...' : 'Masuk'}
      </button>
    </form>
  )
}

export default function KecamatanLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo/logo-kota.png" alt="Logo" width={48} height={48} className="h-12 w-auto object-contain" />
            <Image src="/logo/kecamatan-berdaya.png" alt="Klas Berdaya" width={48} height={48} className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Kecamatan Klas Berdaya</h1>
          <p className="mt-1 text-sm text-gray-500">Halaman kecamatan</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          Hubungi administrator jika mengalami kendala login
        </p>
      </div>
    </div>
  )
}
