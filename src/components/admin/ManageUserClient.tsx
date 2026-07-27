'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faToggleOn,
  faToggleOff,
  faSpinner,
  faCheckCircle,
  faTriangleExclamation,
  faUser,
  faShield,
  faUserGear,
} from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface UserRow {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'VALIDATOR' | 'USER'
  kabupaten: string | null
  kecamatan: string | null
  isActive: boolean
  createdAt: string
  _count: { selfAssessments: number }
}

const ROLE_CONFIG = {
  ADMIN:     { label: 'Admin',     icon: faShield,   class: 'bg-red-100 text-red-700' },
  VALIDATOR: { label: 'Validator', icon: faUserGear, class: 'bg-purple-100 text-purple-700' },
  USER:      { label: 'User',      icon: faUser,     class: 'bg-blue-100 text-blue-700' },
}

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' as 'ADMIN' | 'VALIDATOR' | 'USER', kabupaten: '', kecamatan: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Nama, email, dan password wajib diisi.')
      return
    }
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    if (form.role === 'USER' && !form.kecamatan.trim()) {
      setError('Nama kecamatan wajib diisi untuk role User.')
      return
    }
    if (form.role === 'USER' && !form.kabupaten.trim()) {
      setError('Nama kabupaten/kota wajib diisi untuk role User.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kabupaten: form.role === 'USER' ? form.kabupaten.trim() : undefined,
          kecamatan: form.role === 'USER' ? form.kecamatan.trim() : undefined,
        }),
      })
      const json = await res.json()
      if (res.ok) { onSuccess(); onClose() }
      else setError(json.error ?? 'Gagal membuat user.')
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold text-gray-900">Tambah Akun Kecamatan</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          {[
            { label: 'Nama', key: 'name', type: 'text', placeholder: 'Nama operator' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'email@kecamatan.go.id' },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 8 karakter' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as 'ADMIN' | 'VALIDATOR' | 'USER' }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
            >
              <option value="USER">User (Kecamatan)</option>
              <option value="VALIDATOR">Validator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {form.role === 'USER' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kabupaten/Kota <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.kabupaten}
                  onChange={(e) => setForm((p) => ({ ...p, kabupaten: e.target.value }))}
                  placeholder="contoh: Kota Semarang"
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kecamatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.kecamatan}
                  onChange={(e) => setForm((p) => ({ ...p, kecamatan: e.target.value }))}
                  placeholder="contoh: Kecamatan Semarang Tengah"
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
            {saving && <FontAwesomeIcon icon={faSpinner} className="w-3.5 h-3.5 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

export function ManageUserClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const refresh = async () => {
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      setUsers(json.data ?? [])
    } catch { /* silent */ }
  }

  const toggleActive = async (user: UserRow) => {
    setToggling(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
        showToast('success', `User ${user.name} ${!user.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
      } else {
        showToast('error', 'Gagal mengubah status user.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan.')
    } finally {
      setToggling(null)
    }
  }

  return (
    <>
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { refresh(); showToast('success', 'User berhasil ditambahkan.') }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm',
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        )}>
          <FontAwesomeIcon icon={toast.type === 'success' ? faCheckCircle : faTriangleExclamation} className="w-4 h-4 shrink-0" />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} user terdaftar</p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          Tambah User
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Kabupaten/Kota</th>
              <th className="px-4 py-3">Kecamatan</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-center">Assessment</th>
              <th className="px-4 py-3">Bergabung</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Belum ada user.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const roleCfg = ROLE_CONFIG[u.role]
                return (
                  <tr key={u.id} className={cn('hover:bg-gray-50', !u.isActive && 'opacity-50')}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {u.kabupaten ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {u.kecamatan ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', roleCfg.class)}>
                        <FontAwesomeIcon icon={roleCfg.icon} className="w-3 h-3" />
                        {roleCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{u._count.selfAssessments}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        disabled={toggling === u.id}
                        title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      >
                        {toggling === u.id ? (
                          <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 animate-spin" />
                        ) : (
                          <FontAwesomeIcon
                            icon={u.isActive ? faToggleOn : faToggleOff}
                            className={cn('w-6 h-6', u.isActive ? 'text-green-500' : 'text-gray-300')}
                          />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
