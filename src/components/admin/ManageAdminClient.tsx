'use client'

import { useState, useMemo } from 'react'
import {
  Plus, ToggleRight, ToggleLeft, Loader2,
  CheckCircle, AlertTriangle, User, Shield, UserCog, Crown,
  Edit, Trash2, X, Eye, EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/shared/ui/Pagination'

interface AdminUserRow {
  id: number
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR' | 'USER'  // Include USER even though we filter it out
  kabupaten: string | null
  kecamatan: string | null
  isActive: boolean
  createdAt: string
  _count: { selfAssessments: number }
}

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', icon: Crown,     class: 'bg-red-100 text-red-700 border border-red-300' },
  ADMIN:       { label: 'Admin',       icon: Shield,    class: 'bg-orange-100 text-orange-700' },
  VALIDATOR:   { label: 'Validator',   icon: UserCog,  class: 'bg-purple-100 text-purple-700' },
  USER:        { label: 'User',        icon: User,      class: 'bg-blue-100 text-blue-700' },
}

function AddAdminModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'ADMIN' as 'ADMIN' | 'VALIDATOR',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { 
      setError('Nama, email, dan password wajib diisi.'); return 
    }
    if (form.password.length < 8) { 
      setError('Password minimal 8 karakter.'); return 
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal membuat admin.')
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tambah Admin/Validator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nama lengkap"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="email@example.com"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Minimal 8 karakter"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'VALIDATOR' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              <option value="ADMIN">Admin</option>
              <option value="VALIDATOR">Validator</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditAdminModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role as 'ADMIN' | 'VALIDATOR',
    newPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nama wajib diisi.'); return }
    if (form.newPassword && form.newPassword.length < 8) {
      setError('Password minimal 8 karakter.'); return
    }

    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role,
      }
      if (form.newPassword) body.password = form.newPassword

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan perubahan.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Admin/Validator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 mr-2 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">Email tidak dapat diubah.</p>
          </div>

          {/* Role — hanya tampil jika bukan SUPER_ADMIN */}
          {user.role !== 'SUPER_ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as 'ADMIN' | 'VALIDATOR' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              >
                <option value="ADMIN">Admin</option>
                <option value="VALIDATOR">Validator</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Baru <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kosongkan jika tidak ingin mengubah"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.newPassword && (
              <p className={cn('mt-1 text-xs', form.newPassword.length >= 8 ? 'text-green-600' : 'text-red-500')}>
                {form.newPassword.length >= 8 ? 'Password valid.' : `Minimal 8 karakter (${form.newPassword.length}/8).`}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ManageAdminClientProps {
  initialUsers: AdminUserRow[]
}

export function ManageAdminClient({ initialUsers }: ManageAdminClientProps) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  // Filter and search
  const filteredUsers = useMemo(() => {
    let filtered = users

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      )
    }

    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    return filtered
  }, [users, searchQuery, roleFilter])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const refreshUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (res.ok) {
        const adminUsers = json.data.filter((user: AdminUserRow) => 
          ['SUPER_ADMIN', 'ADMIN', 'VALIDATOR'].includes(user.role)
        )
        setUsers(adminUsers)
      }
    } catch (err) {
      console.error('Failed to refresh users:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      const json = await res.json()
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
        )
        showToast('success', `User berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}.`)
      } else {
        showToast('error', json.error || 'Gagal mengubah status user.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        setDeleteUser(null)
        await refreshUsers()
        showToast('success', `User ${deleteUser.name} dinonaktifkan.`)
      } else {
        showToast('error', json.error || 'Gagal menonaktifkan user.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan jaringan.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 pl-4 pr-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Semua Role</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="VALIDATOR">Validator</option>
          </select>
        </div>
        
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Admin/Validator</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dibuat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => {
                const roleInfo = ROLE_CONFIG[user.role]
                const RoleIcon = roleInfo.icon
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                        roleInfo.class
                      )}>
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                        user.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      )}>
                        {user.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            Nonaktif
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Toggle active */}
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                            user.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          )}
                        >
                          {user.isActive ? (
                            <><ToggleLeft className="w-4 h-4" />Nonaktifkan</>
                          ) : (
                            <><ToggleRight className="w-4 h-4" />Aktifkan</>
                          )}
                        </button>

                        {/* Edit — tidak bisa edit SUPER_ADMIN lain */}
                        {user.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setEditUser(user)}
                            title="Edit"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery || roleFilter !== 'ALL' 
                ? 'Tidak ada admin yang sesuai dengan filter.'
                : 'Belum ada admin yang ditambahkan.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal */}
      {showModal && (
        <AddAdminModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { refreshUsers(); showToast('success', 'Admin/Validator berhasil ditambahkan.') }}
        />
      )}

      {/* Edit Modal */}
      {editUser && (
        <EditAdminModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { refreshUsers(); showToast('success', 'Data admin berhasil diperbarui.') }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-full shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Nonaktifkan User?</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Akun <span className="font-medium">{deleteUser.name}</span> akan dinonaktifkan. User tidak akan bisa login. Aksi ini dapat dibatalkan dengan mengaktifkan kembali.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteUser(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm',
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        )}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Memuat...</span>
          </div>
        </div>
      )}
    </div>
  )
}