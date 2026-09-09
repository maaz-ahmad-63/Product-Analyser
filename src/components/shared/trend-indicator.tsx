import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  value: number
  suffix?: string
  inverse?: boolean // true if positive number is bad (e.g. churn or negative feedback)
  className?: string
}

export function TrendIndicator({
  value,
  suffix = '%',
  inverse = false,
  className,
}: TrendIndicatorProps) {
  if (value === 0) {
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-xs text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />
        <span>0{suffix}</span>
      </span>
    )
  }

  const isUp = value > 0
  const isPositiveResult = inverse ? !isUp : isUp

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositiveResult ? 'text-emerald-500' : 'text-rose-500',
        className
      )}
    >
      {isUp ? (
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>
        {isUp ? '+' : ''}
        {value}
        {suffix}
      </span>
    </span>
  )
}
