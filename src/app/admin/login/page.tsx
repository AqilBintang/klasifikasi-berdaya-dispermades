'use client'

import { Suspense, useState } from 'react'
import { signIn, signOut, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faEye, faEyeSlash, faShield } from '@fortawesome/free-solid-svg-icons'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Email atau password salah.')
      } else {
        const session = await getSession()
        // Halaman ini khusus admin — tolak jika bukan ADMIN
        if (session?.user.role !== 'ADMIN') {
          await signOut({ redirect: false })
          setError('Akun ini tidak memiliki akses admin.')
          setLoading(false)
          return
        }
        const callbackUrl = searchParams.get('callbackUrl') ?? '/admin'
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@klasberdaya.id"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
        />
      </div>

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
            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
      >
        {loading && <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />}
        {loading ? 'Masuk...' : 'Masuk sebagai Admin'}
      </button>
    </form>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <FontAwesomeIcon icon={faShield} className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-500">
            Akses terbatas untuk administrator
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <Suspense>
            <AdminLoginForm />
          </Suspense>
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          Halaman ini hanya untuk administrator sistem
        </p>
      </div>
    </div>
  )
}
