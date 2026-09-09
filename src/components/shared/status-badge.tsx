import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusType =
  | 'active'
  | 'healthy'
  | 'success'
  | 'completed'
  | 'approved'
  | 'action_taken'
  | 'converted'
  | 'warning'
  | 'pending'
  | 'pending_review'
  | 'awaiting_approval'
  | 'in_progress'
  | 'critical'
  | 'danger'
  | 'error'
  | 'failed'
  | 'rejected'
  | 'info'
  | 'reviewed'
  | 'draft_created'
  | 'neutral'
  | 'scheduled'
  | 'paused'
  | 'dismissed'

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase() as StatusType
  const displayLabel = label || status.replace(/_/g, ' ')

  let variant: 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'outline' = 'outline'

  if (
    ['active', 'healthy', 'success', 'completed', 'approved', 'action_taken', 'converted'].includes(
      normalized
    )
  ) {
    variant = 'success'
  } else if (
    ['warning', 'pending', 'pending_review', 'awaiting_approval', 'in_progress', 'needs_review'].includes(
      normalized
    )
  ) {
    variant = 'warning'
  } else if (
    ['critical', 'danger', 'error', 'failed', 'rejected', 'invalid', 'do_not_contact'].includes(
      normalized
    )
  ) {
    variant = 'destructive'
  } else if (['info', 'reviewed', 'draft_created', 'contacted', 'replied'].includes(normalized)) {
    variant = 'info'
  } else if (['rule_insight', 'recommendation'].includes(normalized)) {
    variant = 'purple'
  }

  return (
    <Badge
      variant={variant}
      className={cn('capitalize text-[11px] font-medium tracking-normal py-0.5 px-2', className)}
    >
      {displayLabel}
    </Badge>
  )
}
