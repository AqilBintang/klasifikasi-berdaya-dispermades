'use client'

import { Program, ProgramCategory } from '@/types/program'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/ui/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { truncate } from '@/lib/utils'

export interface ProgramCardProps {
  program: Program
  onClick?: () => void
}

// Warna badge per kategori
const CATEGORY_CLASSES: Record<ProgramCategory, string> = {
  'Teknologi':      'bg-blue-100 text-blue-800 border-blue-200',
  'Kepemimpinan':   'bg-amber-100 text-amber-800 border-amber-200',
  'Kewirausahaan':  'bg-green-100 text-green-800 border-green-200',
  'Seni & Budaya':  'bg-rose-100 text-rose-800 border-rose-200',
  'Lingkungan':     'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Kesehatan':      'bg-sky-100 text-sky-800 border-sky-200',
}

/**
 * Format tanggal ke format Indonesia singkat, contoh: "15 Jan 2025"
 */
function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function ProgramCard({ program, onClick }: ProgramCardProps) {
  return (
    <Card
      data-testid="program-card"
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        {/* Kategori badge */}
        <Badge
          variant="outline"
          className={CATEGORY_CLASSES[program.category]}
        >
          {program.category}
        </Badge>

        {/* Judul program */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 mt-1">
          {program.title}
        </h3>
      </CardHeader>

      <CardContent className="py-0">
        {/* Deskripsi singkat */}
        <p className="text-sm text-muted-foreground">
          {truncate(program.description, 100)}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 mt-2 bg-transparent border-0">
        {/* Tanggal mulai */}
        <span className="text-xs text-muted-foreground">
          {formatDate(program.startDate)}
        </span>

        {/* Status badge */}
        <StatusBadge status={program.status} />
      </CardFooter>
    </Card>
  )
}

export function ProgramCardSkeleton() {
  return (
    <Card data-testid="program-card-skeleton">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </CardHeader>

      <CardContent className="py-0">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6 mt-1" />
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 mt-2 bg-transparent border-0">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardFooter>
    </Card>
  )
}
