import { Calendar, Globe, MapPin, Video, BookOpen } from 'lucide-react'

import { Activity } from '@/types/activity'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/ui/StatusBadge'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string + startTime/endTime into the Indonesian format:
 * "Senin, 15 Jan 2025 · 09.00–12.00 WIB"
 */
function formatActivityDateTime(
  date: string,
  startTime: string,
  endTime: string,
): string {
  const dateObj = new Date(`${date}T${startTime}:00+07:00`)

  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dateObj)
  const day = dateObj.getDate()
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(dateObj)
  const year = dateObj.getFullYear()

  // Convert HH:MM → HH.MM
  const fmtTime = (t: string) => t.replace(':', '.')

  return `${dayName}, ${day} ${monthName} ${year} · ${fmtTime(startTime)}–${fmtTime(endTime)} WIB`
}

// ─── Mode chip ────────────────────────────────────────────────────────────────

const MODE_CONFIG = {
  online: {
    label: 'Online',
    icon: Video,
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  offline: {
    label: 'Offline',
    icon: MapPin,
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
  },
  hybrid: {
    label: 'Hybrid',
    icon: Globe,
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
} as const

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActivityCardProps {
  activity: Activity
  onClick?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const modeConfig = MODE_CONFIG[activity.mode]
  const ModeIcon = modeConfig.icon

  const showLocation =
    activity.location && (activity.mode === 'offline' || activity.mode === 'hybrid')

  const formattedDateTime = formatActivityDateTime(
    activity.date,
    activity.startTime,
    activity.endTime,
  )

  return (
    <Card
      data-testid="activity-card"
      className={cn(
        'transition-shadow duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
      )}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>
          <span className="font-semibold line-clamp-2 leading-snug">
            {activity.title}
          </span>
        </CardTitle>

        {/* Program name */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
          <BookOpen className="size-3.5 shrink-0" />
          <span className="line-clamp-1">{activity.programName}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {/* Date & time */}
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Calendar className="size-3.5 shrink-0 mt-0.5" />
          <span>{formattedDateTime}</span>
        </div>

        {/* Mode chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
              modeConfig.className,
            )}
          >
            <ModeIcon className="size-3" />
            {modeConfig.label}
          </span>

          {/* Location (offline / hybrid only) */}
          {showLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">{activity.location}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <StatusBadge status={activity.registrationStatus} />
      </CardFooter>
    </Card>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ActivityCardSkeleton() {
  return (
    <Card data-testid="activity-card-skeleton">
      <CardHeader>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2 mt-1" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-5 w-20 rounded-full" />
      </CardFooter>
    </Card>
  )
}
