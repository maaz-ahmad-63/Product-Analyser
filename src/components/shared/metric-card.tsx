import { Card, CardContent } from '@/components/ui/card'
import { TrendIndicator } from './trend-indicator'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: number
  trendSuffix?: string
  inverseTrend?: boolean
  icon?: LucideIcon
  iconColor?: string
  href?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  trendSuffix,
  inverseTrend,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  href,
  className,
}: MetricCardProps) {
  const content = (
    <Card
      className={cn(
        'border border-border bg-card transition-colors hover:border-border/80',
        href && 'hover:border-primary/40 cursor-pointer',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {Icon && (
            <div className={cn('p-1 rounded bg-muted/60', iconColor)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {value}
          </span>
          {trend !== undefined && (
            <TrendIndicator
              value={trend}
              suffix={trendSuffix}
              inverse={inverseTrend}
            />
          )}
        </div>

        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
