import * as React from 'react'
import { Button } from '@/components/ui/button'
import { RotateCw, Download, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: React.ReactNode
  onRefresh?: () => void
  onExport?: () => void
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  badge,
  onRefresh,
  onExport,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4',
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Selector Pill */}
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Last 30 days</span>
        </div>

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="h-3 w-3" />
            <span>Refresh</span>
          </Button>
        )}

        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </Button>
        )}

        {actions}
      </div>
    </div>
  )
}
