import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type BadgeStatus =
  | 'active'
  | 'upcoming'
  | 'completed'
  | 'open'
  | 'closed'
  | 'full'
  | 'info'

export interface StatusBadgeProps {
  status: BadgeStatus
  label?: string
}

const DEFAULT_LABELS: Record<BadgeStatus, string> = {
  active: 'Aktif',
  upcoming: 'Mendatang',
  completed: 'Selesai',
  open: 'Buka',
  closed: 'Ditutup',
  full: 'Penuh',
  info: 'Info',
}

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
  full: 'bg-orange-100 text-orange-800 border-orange-200',
  info: 'bg-purple-100 text-purple-800 border-purple-200',
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const displayLabel = label ?? DEFAULT_LABELS[status]
  const colorClasses = STATUS_CLASSES[status]

  return (
    <Badge
      variant="outline"
      className={cn(colorClasses)}
    >
      {displayLabel}
    </Badge>
  )
}
