'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Filter, User, Activity, RefreshCw, 
  ChevronDown, Shield, UserCog, Crown, X,
  AlertCircle, FileText, UserPlus, UserX, UserCheck,
  ClipboardCheck, CheckCircle, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/shared/ui/Pagination'

interface AuditLogItem {
  id: number
  action: string
  targetId: string | null
  targetType: string | null  
  details: Record<string, any> | null
  metadata: Record<string, any> | null
  createdAt: string
  user: {
    id: number
    name: string
    email: string
    role: 'SUPER_ADMIN' | 'ADMIN' | 'VALIDATOR' | 'USER'
  } | null
}

interface FilterUser {
  id: number
  name: string
  email: string
  role: string
}

interface AuditLogResponse {
  data: AuditLogItem[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  filters: {
    availableActions: string[]
    activeUsers: FilterUser[]
  }
}

const ACTION_CONFIG = {
  USER_LOGIN: { 
    label: 'Login User', 
    icon: UserCheck, 
    class: 'bg-green-100 text-green-700',
    description: 'User berhasil login ke sistem'
  },
  USER_CREATED: { 
    label: 'User Dibuat', 
    icon: UserPlus, 
    class: 'bg-blue-100 text-blue-700',
    description: 'Akun user baru dibuat'
  },
  USER_UPDATED: { 
    label: 'User Diupdate', 
    icon: User, 
    class: 'bg-yellow-100 text-yellow-700',
    description: 'Data user diperbarui'
  },
  USER_DEACTIVATED: { 
    label: 'User Dinonaktifkan', 
    icon: UserX, 
    class: 'bg-red-100 text-red-700',
    description: 'User dinonaktifkan'
  },
  ROLE_CHANGED: { 
    label: 'Role Berubah', 
    icon: Shield, 
    class: 'bg-purple-100 text-purple-700',
    description: 'Role user diubah'
  },
  ASSESSMENT_SUBMITTED: { 
    label: 'Assessment Disubmit', 
    icon: ClipboardCheck, 
    class: 'bg-indigo-100 text-indigo-700',
    description: 'Assessment diserahkan untuk validasi'
  },
  ASSESSMENT_VALIDATED: { 
    label: 'Assessment Divalidasi', 
    icon: CheckCircle, 
    class: 'bg-emerald-100 text-emerald-700',
    description: 'Assessment telah divalidasi'
  },
}

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', icon: Crown,    class: 'bg-red-100 text-red-700' },
  ADMIN:       { label: 'Admin',       icon: Shield,   class: 'bg-orange-100 text-orange-700' },
  VALIDATOR:   { label: 'Validator',   icon: UserCog, class: 'bg-purple-100 text-purple-700' },
  USER:        { label: 'User',        icon: User,     class: 'bg-blue-100 text-blue-700' },
}

function FilterPanel({ 
  filters, 
  selectedAction, 
  selectedUserId, 
  startDate,
  endDate,
  onActionChange, 
  onUserChange,
  onDateChange,
  onClearFilters 
}: {
  filters: { availableActions: string[], activeUsers: FilterUser[] }
  selectedAction: string
  selectedUserId: string
  startDate: string
  endDate: string
  onActionChange: (action: string) => void
  onUserChange: (userId: string) => void
  onDateChange: (start: string, end: string) => void
  onClearFilters: () => void
}) {
  const hasActiveFilters = selectedAction || selectedUserId || startDate || endDate

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filter</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Action Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select
            value={selectedAction}
            onChange={(e) => onActionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Action</option>
            {filters.availableActions.map(action => (
              <option key={action} value={action}>
                {ACTION_CONFIG[action as keyof typeof ACTION_CONFIG]?.label || action}
              </option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            value={selectedUserId}
            onChange={(e) => onUserChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua User</option>
            {filters.activeUsers.map(user => (
              <option key={user.id} value={user.id.toString()}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function AuditLogTable({ auditLogs }: { auditLogs: AuditLogItem[] }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waktu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditLogs.map((log) => {
              const actionConfig = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]
              const ActionIcon = actionConfig?.icon || AlertCircle
              const userRoleConfig = log.user ? ROLE_CONFIG[log.user.role as keyof typeof ROLE_CONFIG] : null
              const UserRoleIcon = userRoleConfig?.icon || User

              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {log.user ? (
                      <div>
                        <div className="font-medium text-gray-900">{log.user.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            userRoleConfig?.class
                          )}>
                            <UserRoleIcon className="w-3 h-3" />
                            {userRoleConfig?.label}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">System</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                      actionConfig?.class || 'bg-gray-100 text-gray-700'
                    )}>
                      <ActionIcon className="w-3.5 h-3.5" />
                      {actionConfig?.label || log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.targetType && log.targetId ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.targetType}#{log.targetId}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    {log.details ? (
                      <details className="group">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 list-none flex items-center gap-1">
                          <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                          Lihat Detail
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {log.metadata?.ip || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {auditLogs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Tidak ada audit log yang ditemukan.</p>
        </div>
      )}
    </div>
  )
}

export function AuditLogClient() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<{ availableActions: string[], activeUsers: FilterUser[] }>({ availableActions: [], activeUsers: [] })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // Filter states
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchAuditLogs = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      
      if (selectedAction) params.set('action', selectedAction)
      if (selectedUserId) params.set('userId', selectedUserId)
      if (startDate) params.set('startDate', new Date(startDate).toISOString())
      if (endDate) params.set('endDate', new Date(endDate).toISOString())

      const res = await fetch(`/api/audit-log?${params}`)
      const json: AuditLogResponse = await res.json()
      
      if (!res.ok) throw new Error((json as any).error || 'Gagal memuat audit log')
      
      setAuditLogs(json.data)
      setPagination(json.pagination)
      setFilters(json.filters)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }, [selectedAction, selectedUserId, startDate, endDate])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const handlePageChange = (page: number) => {
    fetchAuditLogs(page)
  }

  const handleClearFilters = () => {
    setSelectedAction('')
    setSelectedUserId('')
    setStartDate('')
    setEndDate('')
  }

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Log</p>
              <p className="text-xl font-semibold text-gray-900">
                {pagination.totalItems.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Action Types</p>
              <p className="text-xl font-semibold text-gray-900">
                {filters.availableActions.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-xl font-semibold text-gray-900">
                {filters.activeUsers.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        selectedAction={selectedAction}
        selectedUserId={selectedUserId}
        startDate={startDate}
        endDate={endDate}
        onActionChange={setSelectedAction}
        onUserChange={setSelectedUserId}
        onDateChange={handleDateChange}
        onClearFilters={handleClearFilters}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={() => fetchAuditLogs()}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg border p-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-600">Memuat audit log...</span>
          </div>
        </div>
      ) : (
        <AuditLogTable auditLogs={auditLogs} />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}