import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Empty State ──────────────────────────────────────────────────────────────

interface SectionEmptyProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function SectionEmpty({ message, actionLabel, onAction }: SectionEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Inbox className="mb-3 h-10 w-10 opacity-40" />
      <p className="text-sm">{message}</p>
      {onAction && actionLabel && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface SectionErrorProps {
  message?: string
  onRetry?: () => void
}

export function SectionError({
  message = 'Gagal memuat data.',
  onRetry,
}: SectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-destructive opacity-80" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  )
}

// ─── Skeleton Grid ────────────────────────────────────────────────────────────

interface SectionSkeletonProps {
  count?: number
  children: React.ReactNode
}

export function SectionSkeleton({ count = 3, children }: SectionSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{children}</div>
      ))}
    </div>
  )
}
