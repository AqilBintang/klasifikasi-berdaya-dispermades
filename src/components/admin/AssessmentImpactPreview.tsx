'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { MigrationImpact } from '@/lib/assessment-migration'
import { IndicatorChangeType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface AssessmentImpactPreviewProps {
  assessmentId: number
  /** @deprecated not used, kept for API compatibility */
  currentVersion?: number
  changes: Array<{
    type: IndicatorChangeType
    indicatorId?: number
    oldValue?: unknown
    newValue?: unknown
    requiresResubmit?: boolean
  }>
  onConfirm?: (impact: MigrationImpact) => void
  onCancel?: () => void
  className?: string
}

export function AssessmentImpactPreview({
  assessmentId,
  changes,
  onConfirm,
  onCancel,
  className
}: AssessmentImpactPreviewProps) {
  const [impact, setImpact] = useState<MigrationImpact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const analyzeImpact = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/assessment/${assessmentId}/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Gagal menganalisis dampak')
      }

      const result: MigrationImpact = await res.json()
      setImpact(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis dampak')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    analyzeImpact()
  }, [assessmentId, changes])

  if (loading) {
    return (
      <div className={cn("rounded-xl border bg-white p-6 shadow-sm", className)}>
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          <span className="text-sm text-gray-600">Menganalisis dampak perubahan...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm", className)}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Gagal Menganalisis Dampak</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button 
              onClick={analyzeImpact}
              className="text-sm text-red-700 underline mt-2"
            >
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!impact) return null

  const hasBreakingChanges = impact.changes.some(c => c.requiresResubmit)
  const severity = impact.totalUsersInProgress === 0 ? 'safe' : 
                  hasBreakingChanges ? 'warning' : 'info'

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm", className)}>
      {/* Header */}
      <div className={cn(
        "px-6 py-4 border-b flex items-center gap-4",
        severity === 'safe' && "bg-green-50 border-green-200",
        severity === 'info' && "bg-blue-50 border-blue-200", 
        severity === 'warning' && "bg-amber-50 border-amber-200"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          severity === 'safe' && "bg-green-100 text-green-600",
          severity === 'info' && "bg-blue-100 text-blue-600",
          severity === 'warning' && "bg-amber-100 text-amber-600"
        )}>
          {severity === 'safe' ? <CheckCircle2 className="w-4 h-4" /> :
           severity === 'info' ? <Info className="w-4 h-4" /> :
           <AlertTriangle className="w-4 h-4" />}
        </div>
        
        <div className="flex-1">
          <h3 className={cn(
            "font-semibold",
            severity === 'safe' && "text-green-800",
            severity === 'info' && "text-blue-800",
            severity === 'warning' && "text-amber-800"
          )}>
            {severity === 'safe' && "Aman untuk Dipublish"}
            {severity === 'info' && "Perubahan Minor Terdeteksi"}  
            {severity === 'warning' && "Perhatian: Kecamatan Akan Terdampak"}
          </h3>
          
          <p className={cn(
            "text-sm mt-1",
            severity === 'safe' && "text-green-700",
            severity === 'info' && "text-blue-700", 
            severity === 'warning' && "text-amber-700"
          )}>
            {impact.totalUsersInProgress === 0 
              ? "Tidak ada kecamatan yang sedang mengisi assessment ini."
              : `${impact.totalUsersInProgress} kecamatan sedang mengisi dan akan terdampak perubahan.`
            }
          </p>
        </div>

        {impact.totalUsersInProgress > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Impact Summary */}
      {impact.totalUsersInProgress > 0 && (
        <div className="p-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <Users className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{impact.totalUsersInProgress}</p>
                <p className="text-xs text-gray-500">Kecamatan Terdampak</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">~{impact.estimatedMigrationTime} menit</p>
                <p className="text-xs text-gray-500">Estimasi Migrasi</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <AlertTriangle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {impact.changes.filter(c => c.requiresResubmit).length}
                </p>
                <p className="text-xs text-gray-500">Perubahan Signifikan</p>
              </div>
            </div>
          </div>

          {/* Changes Summary */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Ringkasan Perubahan</h4>
            <div className="space-y-2">
              {impact.changes.map((change, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg text-sm",
                    change.requiresResubmit ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    change.type === IndicatorChangeType.ADDED && "bg-green-100 text-green-600",
                    change.type === IndicatorChangeType.MODIFIED && (change.requiresResubmit ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"),
                    change.type === IndicatorChangeType.REMOVED && "bg-red-100 text-red-600"
                  )}>
                    {change.type === IndicatorChangeType.ADDED && "+"}
                    {change.type === IndicatorChangeType.MODIFIED && "~"}
                    {change.type === IndicatorChangeType.REMOVED && "-"}
                  </div>
                  
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      change.requiresResubmit ? "text-amber-800" : "text-blue-800"
                    )}>
                      {change.description}
                    </p>
                    {change.indicatorText && (
                      <p className={cn(
                        "mt-1 text-xs truncate",
                        change.requiresResubmit ? "text-amber-600" : "text-blue-600"
                      )}>
                        {change.indicatorText}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Users Details */}
          {showDetails && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Kecamatan yang Terdampak</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {impact.usersAffected.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{user.userName}</p>
                      <p className="text-xs text-gray-500">{user.kecamatanName || 'Kecamatan tidak diketahui'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user.currentProgress}/{user.totalIndicators}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-sky-600 h-1.5 rounded-full" 
                            style={{ width: `${user.progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{user.progressPercentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Batal
          </button>
        )}
        
        {onConfirm && (
          <button
            type="button"
            onClick={() => onConfirm(impact)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg",
              severity === 'safe' && "bg-green-600 text-white hover:bg-green-700",
              severity === 'info' && "bg-blue-600 text-white hover:bg-blue-700",
              severity === 'warning' && "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            {severity === 'warning' ? 'Lanjutkan dengan Migrasi' : 'Publish Perubahan'}
          </button>
        )}
      </div>
    </div>
  )
}