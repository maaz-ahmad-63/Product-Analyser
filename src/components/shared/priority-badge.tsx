import { Badge } from '@/components/ui/badge'
import { Importance } from '@/types'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: Importance | string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const norm = priority.toLowerCase()

  if (norm === 'critical') {
    return (
      <Badge variant="destructive" className={cn('text-[10px] uppercase font-bold tracking-wider py-0 px-1.5', className)}>
        Critical
      </Badge>
    )
  }
  if (norm === 'high') {
    return (
      <Badge variant="warning" className={cn('text-[10px] uppercase font-bold tracking-wider py-0 px-1.5', className)}>
        High
      </Badge>
    )
  }
  if (norm === 'medium') {
    return (
      <Badge variant="info" className={cn('text-[10px] uppercase font-bold tracking-wider py-0 px-1.5', className)}>
        Medium
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn('text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 text-muted-foreground', className)}>
      Low
    </Badge>
  )
}
