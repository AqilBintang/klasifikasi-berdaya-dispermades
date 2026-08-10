'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, FileText, X } from 'lucide-react'

interface AssessmentUpdateStatus {
  hasUpdates: boolean
  assessmentUpdatedAt: string
  userLastActivity: string | null
  updateType: 'none' | 'minor' | 'major'
  message?: string
}

interface SimpleAssessmentUpdateNotificationProps {
  updateStatus: AssessmentUpdateStatus
  onMarkViewed: () => Promise<void>
  onContinue: () => void
}

export function SimpleAssessmentUpdateNotification({
  updateStatus,
  onMarkViewed,
  onContinue
}: SimpleAssessmentUpdateNotificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (!updateStatus.hasUpdates || isDismissed) {
    return null
  }

  const handleMarkViewed = async () => {
    setIsLoading(true)
    try {
      await onMarkViewed()
      setIsDismissed(true)
    } catch (error) {
      console.error('Failed to mark as viewed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-amber-900">
              Assessment Telah Diperbarui
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Ada Update
            </span>
          </div>
          
          <div className="mb-3">
            <p className="text-sm text-amber-800">
              Assessment telah diperbarui oleh admin. {updateStatus.message}
            </p>
            
            {updateStatus.userLastActivity && (
              <p className="text-xs text-amber-700 mt-1">
                Aktivitas terakhir Anda: {new Date(updateStatus.userLastActivity).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
            
            <p className="text-xs text-amber-700">
              Assessment diperbarui: {new Date(updateStatus.assessmentUpdatedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric', 
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-amber-200 mb-4">
            <p className="text-sm text-gray-700">
              <strong>Yang perlu dilakukan:</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc space-y-1">
              <li>Tinjau perubahan yang mungkin ada pada assessment</li>
              <li>Lanjutkan pengisian jika ada indikator baru atau yang dimodifikasi</li>
              <li>Data yang sudah diisi sebelumnya tetap aman</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Lanjut Mengisi
            </button>
            
            <button
              onClick={handleMarkViewed}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isLoading ? 'Memperbarui...' : 'Saya Sudah Memahami'}
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface AssessmentStatusIndicatorProps {
  hasUpdates: boolean
  updateType?: 'none' | 'minor' | 'major'
  hasUserActivity?: boolean
}

export function AssessmentStatusIndicator({ 
  hasUpdates, 
  updateType,
  hasUserActivity 
}: AssessmentStatusIndicatorProps) {
  const getStatusConfig = () => {
    if (hasUpdates) {
      return {
        icon: AlertTriangle,
        label: 'Ada Update',
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        border: 'border-amber-300'
      }
    }

    if (hasUserActivity) {
      return {
        icon: FileText,
        label: 'Sedang Diisi',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-blue-300'
      }
    }

    return {
      icon: Clock,
      label: 'Belum Dimulai',
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      border: 'border-gray-300'
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border} ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}