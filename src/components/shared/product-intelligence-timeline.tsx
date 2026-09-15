'use client'

import React, { useState, useMemo } from 'react'
import {
  Activity,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Filter,
  X,
  FileText,
  ExternalLink,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface TimelineEventItem {
  id: string
  date: string
  formattedDate?: string
  title: string
  whatHappened: string
  whyItMatters?: string
  activityType: string
  category: 'sales' | 'pricing' | 'reviews' | 'discussions' | 'features' | 'competitors'
  impactType?: 'positive' | 'negative' | 'neutral'
  isOurProduct?: boolean
  productName?: string
  previousValue?: string | number | null
  currentValue?: string | number | null
  deltaValue?: string | number | null
  possibleReasons?: string
  recommendedActions?: string
  evidence?: Array<{
    author?: string
    text: string
    date?: string
    url?: string | null
  }>
  sourceUrl?: string
}

interface ProductIntelligenceTimelineProps {
  events: TimelineEventItem[]
  title?: string
  maxItems?: number
  showFilters?: boolean
  emptyMessage?: string
}

export function ProductIntelligenceTimeline({
  events,
  title = 'Product Intelligence Timeline',
  maxItems = 15,
  showFilters = true,
  emptyMessage = 'No historical events detected yet.',
}: ProductIntelligenceTimelineProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeEvent, setActiveEvent] = useState<TimelineEventItem | null>(null)

  const filteredEvents = useMemo(() => {
    if (!events) return []
    if (selectedCategory === 'all') return events.slice(0, maxItems)
    return events.filter((e) => e.category === selectedCategory).slice(0, maxItems)
  }, [events, selectedCategory, maxItems])

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'sales':
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
      case 'pricing':
        return <DollarSign className="h-3.5 w-3.5 text-amber-400" />
      case 'reviews':
        return <Star className="h-3.5 w-3.5 text-yellow-400" />
      case 'discussions':
        return <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
      case 'features':
        return <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
      default:
        return <Activity className="h-3.5 w-3.5 text-primary" />
    }
  }

  return (
    <div className="space-y-3">
      {/* Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">{title}</h3>
            <span className="text-[10px] text-muted-foreground">
              Progressive disclosure: Click any event to inspect cause, impact, and evidence
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'sales', 'discussions', 'features', 'pricing'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors capitalize shrink-0',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border/60 pl-6">
          {filteredEvents.map((evt) => {
            const isPositive = evt.impactType === 'positive'
            const isNegative = evt.impactType === 'negative'

            return (
              <div
                key={evt.id}
                onClick={() => setActiveEvent(evt)}
                className="group relative -ml-6 flex items-start gap-3 p-2.5 rounded-lg border border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 transition-all cursor-pointer shadow-xs"
              >
                {/* Marker Dot */}
                <div
                  className={cn(
                    'h-7 w-7 rounded-full border border-border/80 flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110',
                    isPositive && 'bg-emerald-500/15 border-emerald-500/30',
                    isNegative && 'bg-rose-500/15 border-rose-500/30',
                    !isPositive && !isNegative && 'bg-muted/80'
                  )}
                >
                  {getEventIcon(evt.category)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                      {evt.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {evt.formattedDate || evt.date}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {evt.whatHappened}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    {evt.deltaValue && (
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded',
                          isPositive && 'bg-emerald-500/15 text-emerald-400',
                          isNegative && 'bg-rose-500/15 text-rose-400',
                          !isPositive && !isNegative && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {evt.deltaValue}
                      </span>
                    )}

                    {evt.productName && (
                      <span className="text-[10px] text-muted-foreground/80 truncate max-w-[150px]">
                        {evt.productName}
                      </span>
                    )}

                    <span className="text-[10px] text-primary/80 font-medium ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <span>View details</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Event Detail Modal / Drawer */}
      {activeEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  {getEventIcon(activeEvent.category)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{activeEvent.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {activeEvent.formattedDate || activeEvent.date}
                    </span>
                    {activeEvent.productName && <span>• {activeEvent.productName}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveEvent(null)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* WHAT HAPPENED */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  What Happened
                </span>
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-foreground leading-relaxed">
                  {activeEvent.whatHappened}
                </div>
              </div>

              {/* METRIC CHANGE */}
              {(activeEvent.previousValue || activeEvent.currentValue || activeEvent.deltaValue) && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Metric Change
                  </span>
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/70 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Previous</span>
                      <span className="font-semibold text-foreground">
                        {String(activeEvent.previousValue || 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Current</span>
                      <span className="font-semibold text-foreground">
                        {String(activeEvent.currentValue || 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Delta</span>
                      <span className="font-bold text-primary">
                        {String(activeEvent.deltaValue || 'Observed')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* WHY IT MATTERS */}
              {activeEvent.whyItMatters && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Why It Matters
                  </span>
                  <div className="p-3 rounded-lg bg-card border border-border text-muted-foreground leading-relaxed">
                    {activeEvent.whyItMatters}
                  </div>
                </div>
              )}

              {/* RECOMMENDED ACTIONS */}
              {activeEvent.recommendedActions && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Strategic Recommendation
                  </span>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-foreground leading-relaxed">
                    {activeEvent.recommendedActions}
                  </div>
                </div>
              )}

              {/* EVIDENCE */}
              <div className="space-y-1 pt-1 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-primary" />
                  Evidence
                </span>
                {activeEvent.evidence && activeEvent.evidence.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeEvent.evidence.map((ev, i) => (
                      <div key={i} className="p-2.5 rounded-md bg-muted/30 border border-border text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground">{ev.author || 'User'}</span>
                          {ev.date && <span>{ev.date}</span>}
                        </div>
                        <p className="italic">&ldquo;{ev.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-muted/20 border border-dashed border-border text-center text-[11px] text-muted-foreground">
                    Evidence not available.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
              {activeEvent.sourceUrl ? (
                <a
                  href={activeEvent.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <span>View Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground">Automated telemetry event</span>
              )}
              <button
                onClick={() => setActiveEvent(null)}
                className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
