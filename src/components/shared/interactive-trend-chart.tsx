'use client'

import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts'
import { ObservationPointData } from './observation-drilldown-modal'
import { MousePointerClick, Calendar, TrendingUp } from 'lucide-react'

export interface TrendChartItem {
  id?: string
  date: string
  formattedDate?: string
  value: number
  previousValue?: number | null
  delta?: number | null
  growthPercentage?: number | null
  eventsCount?: number
  hasEvidence?: boolean
  observationType?: 'snapshot' | 'event' | 'discussion' | 'review'
  observationSummary?: string
  rawItem?: any
}

interface InteractiveTrendChartProps {
  data: TrendChartItem[]
  metricLabel: string
  color?: string
  height?: number
  formatValue?: (val: number) => string
  onSelectPoint?: (data: ObservationPointData) => void
  emptyMessage?: string
}

export function InteractiveTrendChart({
  data,
  metricLabel,
  color = '#10b981', // emerald
  height = 220,
  formatValue = (val) => String(val),
  onSelectPoint,
  emptyMessage = 'No historical snapshot observations available yet.',
}: InteractiveTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl p-6"
        style={{ height }}
      >
        <span>{emptyMessage}</span>
      </div>
    )
  }

  // Calculate min & max for smart domain
  const values = data.map((d) => d.value).filter((v) => typeof v === 'number' && !isNaN(v))
  const minVal = values.length > 0 ? Math.min(...values) : 0
  const maxVal = values.length > 0 ? Math.max(...values) : 100
  const padding = Math.max((maxVal - minVal) * 0.15, 1)
  const yDomain: [number, number] = [Math.max(0, Math.floor(minVal - padding)), Math.ceil(maxVal + padding)]

  const handleClick = (point: TrendChartItem) => {
    if (!onSelectPoint) return

    onSelectPoint({
      title: `${metricLabel} Observation`,
      date: point.date,
      formattedDate: point.formattedDate || point.date,
      metricLabel,
      metricValue: formatValue(point.value),
      previousValue: point.previousValue !== null && point.previousValue !== undefined ? formatValue(point.previousValue) : null,
      delta: point.delta,
      growthPercentage: point.growthPercentage,
      observationType: point.observationType || 'snapshot',
      observationSummary: point.observationSummary || `Observed ${metricLabel.toLowerCase()} value of ${formatValue(point.value)}.`,
      relatedEvents: point.rawItem?.relatedEvents || [],
      evidence: point.rawItem?.evidence || [],
      sourceUrl: point.rawItem?.sourceUrl,
    })
  }

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-primary" />
          <span>Historical Observations ({data.length} data points)</span>
        </span>
        {onSelectPoint && (
          <span className="flex items-center gap-1 text-primary text-[10px] font-medium bg-primary/10 px-2 py-0.5 rounded-full">
            <MousePointerClick className="h-3 w-3" />
            <span>Click any point for evidence drill-down</span>
          </span>
        )}
      </div>

      <div className="w-full rounded-xl border border-border/70 bg-card/60 p-3 pt-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                handleClick(e.activePayload[0].payload)
              }
            }}
          >
            <defs>
              <linearGradient id={`gradient-${metricLabel}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />

            <YAxis
              domain={yDomain}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickFormatter={formatValue}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const item = payload[0].payload as TrendChartItem
                const isPositive = item.delta && item.delta > 0

                return (
                  <div className="rounded-lg border border-border bg-card/95 p-2.5 shadow-xl backdrop-blur-md text-xs space-y-1 z-50">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium border-b border-border/40 pb-1">
                      <Calendar className="h-3 w-3" />
                      <span>{item.formattedDate || item.date}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-3 pt-0.5">
                      <span className="text-muted-foreground">{metricLabel}:</span>
                      <span className="font-bold text-foreground text-sm">
                        {formatValue(item.value)}
                      </span>
                    </div>

                    {item.previousValue !== null && item.previousValue !== undefined && (
                      <div className="text-[11px] text-muted-foreground flex justify-between gap-2">
                        <span>Previous:</span>
                        <span>{formatValue(item.previousValue)}</span>
                      </div>
                    )}

                    {item.delta !== null && item.delta !== undefined && (
                      <div className="text-[11px] flex justify-between gap-2 font-medium">
                        <span className="text-muted-foreground">Change:</span>
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? `+${item.delta}` : item.delta}
                        </span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-border/40 text-[10px] text-primary flex items-center gap-1 font-semibold">
                      <MousePointerClick className="h-3 w-3" />
                      <span>Click to view evidence</span>
                    </div>
                  </div>
                )
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${metricLabel})`}
              activeDot={{
                r: 6,
                stroke: color,
                strokeWidth: 2,
                fill: 'var(--background)',
                className: 'cursor-pointer',
              }}
              dot={{
                r: 3.5,
                stroke: color,
                strokeWidth: 1.5,
                fill: 'var(--background)',
                className: 'cursor-pointer',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
