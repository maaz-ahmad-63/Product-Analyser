'use client'

import React from 'react'
import {
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ObservationPointData {
  title?: string
  date: string
  formattedDate?: string
  metricLabel: string
  metricValue: number | string
  previousValue?: number | string | null
  delta?: number | string | null
  growthPercentage?: number | string | null
  observationType: 'snapshot' | 'event' | 'discussion' | 'review'
  observationSummary?: string
  relatedEvents?: Array<{
    id?: string
    title: string
    description?: string
    type?: string
    impact?: 'positive' | 'negative' | 'neutral'
  }>
  evidence?: Array<{
    author?: string
    text: string
    date?: string
    sentiment?: string
    category?: string
    url?: string | null
  }>
  sourceUrl?: string
}

interface ObservationDrilldownModalProps {
  data: ObservationPointData | null
  onClose: () => void
}

export function ObservationDrilldownModal({ data, onClose }: ObservationDrilldownModalProps) {
  if (!data) return null

  const isPositiveGrowth =
    typeof data.delta === 'number'
      ? data.delta > 0
      : String(data.delta || '').startsWith('+')

  const isNegativeGrowth =
    typeof data.delta === 'number'
      ? data.delta < 0
      : String(data.delta || '').startsWith('-')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {data.title || 'Observation Drill-Down'}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] uppercase font-semibold px-1.5 py-0',
                    data.observationType === 'event'
                      ? 'border-indigo-500/40 text-indigo-400'
                      : 'border-emerald-500/40 text-emerald-400'
                  )}
                >
                  {data.observationType === 'event' ? 'Actual Event' : 'Observed Snapshot'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>{data.formattedDate || data.date}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* LEVEL 1: Summary Metric Card */}
          <div className="p-3.5 rounded-lg bg-muted/30 border border-border/70 space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {data.metricLabel}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-extrabold text-foreground">
                {data.metricValue}
              </span>
              {data.previousValue !== undefined && data.previousValue !== null && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>Previous observation:</span>
                  <span className="font-semibold text-foreground">{data.previousValue}</span>
                </div>
              )}
            </div>

            {/* Deltas & Growth Breakdown */}
            {(data.delta !== undefined || data.growthPercentage !== undefined) && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-[11px]">
                {data.delta !== undefined && data.delta !== null && (
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-muted-foreground">Change:</span>
                    <span
                      className={cn(
                        'font-bold',
                        isPositiveGrowth && 'text-emerald-400',
                        isNegativeGrowth && 'text-rose-400'
                      )}
                    >
                      {typeof data.delta === 'number' && data.delta > 0 ? `+${data.delta}` : data.delta}
                    </span>
                  </div>
                )}

                {data.growthPercentage !== undefined && data.growthPercentage !== null && (
                  <div className="flex items-center gap-1 font-medium">
                    <span className="text-muted-foreground">Growth:</span>
                    <span
                      className={cn(
                        'font-bold flex items-center gap-0.5',
                        isPositiveGrowth && 'text-emerald-400',
                        isNegativeGrowth && 'text-rose-400'
                      )}
                    >
                      {isPositiveGrowth && <TrendingUp className="h-3 w-3" />}
                      {isNegativeGrowth && <TrendingDown className="h-3 w-3" />}
                      {typeof data.growthPercentage === 'number'
                        ? `${data.growthPercentage > 0 ? '+' : ''}${data.growthPercentage.toFixed(1)}%`
                        : data.growthPercentage}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LEVEL 2 & 3: What Was Observed & Related Events */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              What Was Observed
            </span>
            <div className="p-3 rounded-lg bg-card border border-border text-foreground leading-relaxed">
              {data.observationSummary ||
                `Observation captured during the automated monitoring cycle on ${data.formattedDate || data.date}.`}
            </div>

            {data.relatedEvents && data.relatedEvents.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Detected Timeline Events in this Window
                </span>
                <div className="space-y-2">
                  {data.relatedEvents.map((evt, idx) => (
                    <div
                      key={evt.id || idx}
                      className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs flex items-start gap-2.5"
                    >
                      <div
                        className={cn(
                          'p-1 rounded mt-0.5 shrink-0',
                          evt.impact === 'positive' && 'bg-emerald-500/10 text-emerald-400',
                          evt.impact === 'negative' && 'bg-rose-500/10 text-rose-400',
                          (!evt.impact || evt.impact === 'neutral') && 'bg-primary/10 text-primary'
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">{evt.title}</div>
                        {evt.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {evt.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* LEVEL 4: Evidence Drill-Down */}
          <div className="space-y-2 pt-1 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Underlying Evidence & Quotes
              </span>
              {data.sourceUrl && (
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <span>Source listing</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {data.evidence && data.evidence.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {data.evidence.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-muted/20 border border-border/60 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {item.author || 'Customer / Buyer'}
                      </span>
                      {item.date && <span>{item.date}</span>}
                    </div>
                    <p className="italic text-foreground/90 leading-relaxed text-[11px]">
                      &ldquo;{item.text}&rdquo;
                    </p>
                    {item.category && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted font-medium text-muted-foreground">
                          {item.category}
                        </span>
                        {item.sentiment && (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.2 rounded font-medium',
                              item.sentiment === 'positive' && 'bg-emerald-500/10 text-emerald-400',
                              item.sentiment === 'negative' && 'bg-rose-500/10 text-rose-400',
                              item.sentiment === 'neutral' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {item.sentiment}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 mx-auto text-muted-foreground/60 mb-1" />
                Evidence not available for this observation.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Progressive Disclosure: Level 1 Summary → Level 2 Graph → Level 3 Event → Level 4 Evidence
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
