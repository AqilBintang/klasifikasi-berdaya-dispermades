'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, ToggleRight, ToggleLeft, Loader2, CheckCircle, AlertTriangle, 
  User, Edit, Trash2, X, Eye, EyeOff, MapPin, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/shared/ui/Pagination'
import type { KabKotaJateng, KecamatanJateng } from '@/types/wilayah'
import type { UserRole } from '@prisma/client'

interface KecamatanUserRow {
  id: number
  name: string
  email: string
  role: UserRole
  kabupaten: string | null
  kecamatan: string | null
  kabupatenKode: string | null
  kecamatanKode: string | null
  isActive: boolean
  createdAt: string
  _count: { selfAssessments: number }
}

const ITEMS_PER_PAGE = 10

interface ManageKecamatanClientProps {
  initialUsers: KecamatanUserRow[]
}

export function ManageKecamatanClient({ initialUsers }: ManageKecamatanClientProps) {
  const [users, setUsers] = useState<KecamatanUserRow[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<KecamatanUserRow | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [kabupatenFilter, setKabupatenFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const refreshUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/kecamatan')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || [])
      }
    } catch (err) {
      console.error('Failed to refresh users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get unique kabupaten for filter
  const availableKabupaten = useMemo(() => {
    const kabSet = new Set<string>()
    users.forEach(user => {
      if (user.kabupaten) kabSet.add(user.kabupaten)
    })
    return Array.from(kabSet).sort()
  }, [users])

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = !searchQuery || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.kabupaten?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.kecamatan?.toLowerCase().includes(searchQuery.toLowerCase())

      // Kabupaten filter
      const matchesKabupaten = kabupatenFilter === 'ALL' || user.kabupaten === kabupatenFilter

      // Status filter
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive)

      return matchesSearch && matchesKabupaten && matchesStatus
    })
  }, [users, searchQuery, kabupatenFilter, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, kabupatenFilter, statusFilter])

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, isActive: !currentStatus } : u
        ))
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <input
            type="text"
            placeholder="Cari nama, email, kabupaten, atau kecamatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          {/* Kabupaten Filter */}
          <select
            value={kabupatenFilter}
            onChange={(e) => setKabupatenFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Semua Kabupaten</option>
            {availableKabupaten.map(kab => (
              <option key={kab} value={kab}>{kab}</option>
            ))}
          </select>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah User Kecamatan
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
          <div className="text-sm text-gray-600">Total User</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{users.filter(u => u.isActive).length}</div>
          <div className="text-sm text-gray-600">Aktif</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{users.filter(u => !u.isActive).length}</div>
          <div className="text-sm text-gray-600">Nonaktif</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{availableKabupaten.length}</div>
          <div className="text-sm text-gray-600">Kabupaten</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Wilayah</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Assessment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Bergabung</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Memuat data...</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <User className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="text-gray-500 mt-2">
                      {filteredUsers.length === 0 
                        ? (searchQuery || kabupatenFilter !== 'ALL' || statusFilter !== 'ALL' 
                            ? 'Tidak ada user yang sesuai dengan filter' 
                            : 'Belum ada user kecamatan')
                        : 'Tidak ada data pada halaman ini'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    {/* User Info */}
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>

                    {/* Wilayah */}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="text-gray-900">{user.kabupaten || '-'}</div>
                          <div className="text-gray-500">{user.kecamatan || '-'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Assessment Count */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">{user._count.selfAssessments}</span>
                      <span className="text-xs text-gray-500 ml-1">assessment</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded"
                        title={user.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                      >
                        {user.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={cn(
                          'text-sm font-medium',
                          user.isActive ? 'text-green-700' : 'text-gray-500'
                        )}>
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddKecamatanUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={refreshUsers}
        />
      )}

      {editingUser && (
        <EditKecamatanUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={refreshUsers}
        />
      )}
    </div>
  )
}

function AddKecamatanUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    kabupatenKode: '',
    kecamatanKode: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [kabKotaList, setKabKotaList] = useState<KabKotaJateng[]>([])
  const [kecamatanList, setKecamatanList] = useState<KecamatanJateng[]>([])
  const [loadingKab, setLoadingKab] = useState(false)
  const [loadingKec, setLoadingKec] = useState(false)

  // Fetch kabupaten/kota saat modal dibuka
  useEffect(() => {
    setLoadingKab(true)
    fetch('/api/wilayah/jateng/kabkota')
      .then((r) => r.json())
      .then((json) => setKabKotaList(json.data ?? []))
      .catch(() => setError('Gagal memuat data kabupaten/kota.'))
      .finally(() => setLoadingKab(false))
  }, [])

  // Fetch kecamatan saat kabupaten dipilih
  useEffect(() => {
    if (!form.kabupatenKode) { 
      setKecamatanList([])
      setForm(prev => ({ ...prev, kecamatanKode: '' }))
      return 
    }
    setLoadingKec(true)
    fetch(`/api/wilayah/jateng/kabkota/${form.kabupatenKode}/kecamatan`)
      .then((r) => r.json())
      .then((json) => setKecamatanList(json.data ?? []))
      .catch(() => setError('Gagal memuat data kecamatan.'))
      .finally(() => setLoadingKec(false))
  }, [form.kabupatenKode])

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nama wajib diisi.'); return }
    if (!form.email.trim()) { setError('Email wajib diisi.'); return }
    if (!form.password) { setError('Password wajib diisi.'); return }
    if (form.password.length < 8) { setError('Password minimal 8 karakter.'); return }
    if (!form.kabupatenKode) { setError('Pilih kabupaten/kota.'); return }
    if (!form.kecamatanKode) { setError('Pilih kecamatan.'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'USER',
          kabupatenKode: form.kabupatenKode,
          kecamatanKode: form.kecamatanKode,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal membuat user.')
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedKabKota = kabKotaList.find(k => k.kode === form.kabupatenKode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tambah User Kecamatan</h3>
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
              placeholder="Nama operator kecamatan"
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
              placeholder="email@kecamatan.go.id"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota *</label>
            {loadingKab ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Memuat...</span>
              </div>
            ) : (
              <select
                value={form.kabupatenKode}
                onChange={(e) => setForm(prev => ({ ...prev, kabupatenKode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              >
                <option value="">Pilih Kabupaten/Kota</option>
                {kabKotaList.map((kab) => (
                  <option key={kab.kode} value={kab.kode}>
                    {kab.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan *</label>
            {loadingKec ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Memuat...</span>
              </div>
            ) : (
              <select
                value={form.kecamatanKode}
                onChange={(e) => setForm(prev => ({ ...prev, kecamatanKode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving || !form.kabupatenKode}
              >
                <option value="">
                  {!form.kabupatenKode ? 'Pilih kabupaten/kota dulu' : 'Pilih Kecamatan'}
                </option>
                {kecamatanList.map((kec) => (
                  <option key={kec.kode} value={kec.kode}>
                    {kec.nama}
                  </option>
                ))}
              </select>
            )}
            {selectedKabKota && (
              <p className="text-xs text-gray-500 mt-1">
                Di {selectedKabKota.nama}
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

function EditKecamatanUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: KecamatanUserRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    kabupatenKode: user.kabupatenKode || '',
    kecamatanKode: user.kecamatanKode || '',
    newPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [kabKotaList, setKabKotaList] = useState<KabKotaJateng[]>([])
  const [kecamatanList, setKecamatanList] = useState<KecamatanJateng[]>([])
  const [loadingKab, setLoadingKab] = useState(false)
  const [loadingKec, setLoadingKec] = useState(false)

  // Fetch kabupaten/kota saat modal dibuka
  useEffect(() => {
    setLoadingKab(true)
    fetch('/api/wilayah/jateng/kabkota')
      .then((r) => r.json())
      .then((json) => setKabKotaList(json.data ?? []))
      .catch(() => setError('Gagal memuat data kabupaten/kota.'))
      .finally(() => setLoadingKab(false))
  }, [])

  // Fetch kecamatan saat kabupaten dipilih atau modal dibuka
  useEffect(() => {
    if (!form.kabupatenKode) { 
      setKecamatanList([])
      if (form.kabupatenKode !== user.kabupatenKode) {
        setForm(prev => ({ ...prev, kecamatanKode: '' }))
      }
      return 
    }
    setLoadingKec(true)
    fetch(`/api/wilayah/jateng/kabkota/${form.kabupatenKode}/kecamatan`)
      .then((r) => r.json())
      .then((json) => setKecamatanList(json.data ?? []))
      .catch(() => setError('Gagal memuat data kecamatan.'))
      .finally(() => setLoadingKec(false))
  }, [form.kabupatenKode, user.kabupatenKode])

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nama wajib diisi.'); return }
    if (form.newPassword && form.newPassword.length < 8) {
      setError('Password minimal 8 karakter.'); return
    }
    if (!form.kabupatenKode) { setError('Pilih kabupaten/kota.'); return }
    if (!form.kecamatanKode) { setError('Pilih kecamatan.'); return }

    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        kabupatenKode: form.kabupatenKode,
        kecamatanKode: form.kecamatanKode,
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

  const selectedKabKota = kabKotaList.find(k => k.kode === form.kabupatenKode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit User Kecamatan</h3>
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
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Baru <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kosongkan jika tidak ingin mengubah"
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
            {form.newPassword && (
              <p className={cn('mt-1 text-xs', form.newPassword.length >= 8 ? 'text-green-600' : 'text-red-500')}>
                {form.newPassword.length >= 8 ? 'Password valid.' : `Minimal 8 karakter (${form.newPassword.length}/8).`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota *</label>
            {loadingKab ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Memuat...</span>
              </div>
            ) : (
              <select
                value={form.kabupatenKode}
                onChange={(e) => setForm(prev => ({ ...prev, kabupatenKode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              >
                <option value="">Pilih Kabupaten/Kota</option>
                {kabKotaList.map((kab) => (
                  <option key={kab.kode} value={kab.kode}>
                    {kab.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan *</label>
            {loadingKec ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Memuat...</span>
              </div>
            ) : (
              <select
                value={form.kecamatanKode}
                onChange={(e) => setForm(prev => ({ ...prev, kecamatanKode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving || !form.kabupatenKode}
              >
                <option value="">
                  {!form.kabupatenKode ? 'Pilih kabupaten/kota dulu' : 'Pilih Kecamatan'}
                </option>
                {kecamatanList.map((kec) => (
                  <option key={kec.kode} value={kec.kode}>
                    {kec.nama}
                  </option>
                ))}
              </select>
            )}
            {selectedKabKota && (
              <p className="text-xs text-gray-500 mt-1">
                Di {selectedKabKota.nama}
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
