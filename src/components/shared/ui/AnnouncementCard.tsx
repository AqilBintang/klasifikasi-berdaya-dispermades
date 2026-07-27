'use client'

import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'

import { type Announcement } from '@/types/announcement'
import { truncate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnnouncementCardProps {
  announcement: Announcement
  onClick?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementCard({ announcement, onClick }: AnnouncementCardProps) {
  const relativeDate = formatDistanceToNow(new Date(announcement.publishedAt), {
    addSuffix: true,
    locale: id,
  })

  return (
    <Card
      data-testid="announcement-card"
      className={cn(
        'transition-shadow duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
      )}
      onClick={onClick}
    >
      {/* Baris atas: badge kategori + badge Penting */}
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {announcement.category}
          </Badge>
          {announcement.isImportant && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Penting
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-1.5 pt-2">
        {/* Judul */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
          {announcement.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          {truncate(announcement.summary, 120)}
        </p>
      </CardContent>

      {/* Baris bawah: tanggal relatif (kiri) + author (kanan) */}
      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{relativeDate}</span>
        <span className="text-xs text-muted-foreground">{announcement.authorName}</span>
      </CardFooter>
    </Card>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function AnnouncementCardSkeleton() {
  return (
    <Card data-testid="announcement-card-skeleton">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded mt-1" />
        <Skeleton className="h-3 w-5/6 rounded" />
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </CardFooter>
    </Card>
  )
}
