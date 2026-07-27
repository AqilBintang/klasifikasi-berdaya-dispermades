import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface StatisticCardProps {
  title: string
  value: number
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  description?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
}

export function StatisticCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: StatisticCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          {/* Left: title */}
          <p className="text-sm font-medium text-muted-foreground">{title}</p>

          {/* Right: icon */}
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        {/* Value */}
        <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          {value.toLocaleString('id-ID')}
        </p>

        {/* Description */}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}

        {/* Trend */}
        {trend && (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              trend.direction === 'up' && 'text-emerald-600',
              trend.direction === 'down' && 'text-red-500',
              trend.direction === 'neutral' && 'text-muted-foreground',
            )}
          >
            {trend.direction === 'up' && (
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
            )}
            {trend.direction === 'down' && (
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
            )}
            {trend.direction === 'neutral' && (
              <Minus className="h-3 w-3" aria-hidden="true" />
            )}
            <span>
              {trend.value}% dari bulan lalu
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StatisticCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="mt-3 h-9 w-16" />
        <Skeleton className="mt-1 h-3 w-36" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  )
}
