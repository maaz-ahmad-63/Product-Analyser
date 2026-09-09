import { ExternalLink, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EvidenceLinkProps {
  url: string
  label?: string
  sourceType?: string
  className?: string
}

export function EvidenceLink({
  url,
  label = 'View Source',
  sourceType,
  className,
}: EvidenceLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono group',
        className
      )}
      title={sourceType ? `Source: ${sourceType} (Permitted public data)` : 'Permitted public source'}
    >
      <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
      <span>{label}</span>
      <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
    </a>
  )
}
