'use client'

import React, { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { ObservationPointData } from './observation-drilldown-modal'
import { TrendingUp, MousePointerClick, Eye, EyeOff } from 'lucide-react'

export interface CompetitorSeriesConfig {
  id: string
  name: string
  color: string
  dataKey: string
  isOwn?: boolean
}

export interface MultiTrendPoint {
  id?: string
  date: string
  formattedDate: string
  [key: string]: any // dynamic series values e.g. { 'RideOn': 4.88, 'Taxido': 4.00, ... }
  metaBySeries?: Record<
    string,
    {
      value: number | null
      previousValue?: number | null
      delta?: number | null
      observationSummary?: string
      sourceUrl?: string
      evidence?: any[]
    }
  >
}

interface MultiCompetitorTrendChartProps {
  series: CompetitorSeriesConfig[]
  data: MultiTrendPoint[]
  metricLabel: string
  height?: number
  formatValue?: (val: number) => string
  onSelectPoint?: (data: ObservationPointData) => void
  emptyMessage?: string
}

export function MultiCompetitorTrendChart({
  series,
  data,
  metricLabel,
  height = 230,
  formatValue = (val) => String(val),
  onSelectPoint,
  emptyMessage = 'No multi-competitor snapshot observations available yet.',
}: MultiCompetitorTrendChartProps) {
  // Toggle visible series
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({})

  if (!data || data.length === 0 || !series || series.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl p-6"
        style={{ height }}
      >
        <span>{emptyMessage}</span>
      </div>
    )
  }

  // Calculate smart Y domain across all visible series
  const allValues: number[] = []
  data.forEach((point) => {
    series.forEach((s) => {
      if (!hiddenSeries[s.dataKey] && typeof point[s.dataKey] === 'number' && !isNaN(point[s.dataKey])) {
        allValues.push(point[s.dataKey])
      }
    })
  })

  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 5
  const padding = Math.max((maxVal - minVal) * 0.15, 0.2)
  const yDomain: [number, number] = [
    Math.max(0, Number((minVal - padding).toFixed(2))),
    Number((maxVal + padding).toFixed(2)),
  ]

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="w-full space-y-2.5">
      {/* Top Controls: Legend & Evidence Notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground px-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {series.map((s) => {
            const isHidden = hiddenSeries[s.dataKey]
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeries(s.dataKey)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border ${
                  isHidden
                    ? 'border-border/40 text-muted-foreground/50 bg-muted/20 line-through'
                    : 'border-border/80 bg-card hover:bg-muted/40 text-foreground shadow-xs'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isHidden ? '#6b7280' : s.color }}
                />
                <span className="truncate max-w-[120px]">{s.name}</span>
                {s.isOwn && (
                  <span className="text-[9px] px-1 py-0 rounded bg-primary/20 text-primary font-bold">
                    YOU
                  </span>
                )}
                {isHidden ? (
                  <EyeOff className="h-2.5 w-2.5 text-muted-foreground/60" />
                ) : (
                  <Eye className="h-2.5 w-2.5 text-muted-foreground/60" />
                )}
              </button>
            )
          })}
        </div>

        {onSelectPoint && (
          <span className="flex items-center gap-1 text-primary text-[10px] font-medium bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            <MousePointerClick className="h-3 w-3" />
            <span>Click any point for evidence</span>
          </span>
        )}
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
            />
            <YAxis
              domain={yDomain}
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (typeof val === 'number' ? val.toFixed(1) : String(val))}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const point = payload[0]?.payload as MultiTrendPoint

                return (
                  <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl text-xs space-y-2 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{label}</span>
                      <span className="text-[10px] font-mono">{metricLabel}</span>
                    </div>

                    <div className="space-y-1.5">
                      {series
                        .filter((s) => !hiddenSeries[s.dataKey])
                        .map((s) => {
                          const val = point?.[s.dataKey]
                          if (val === undefined || val === null) return null

                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (!onSelectPoint) return
                                const meta = point.metaBySeries?.[s.dataKey]
                                onSelectPoint({
                                  title: `${s.name} ${metricLabel}`,
                                  date: point.date,
                                  formattedDate: point.formattedDate,
                                  metricLabel,
                                  metricValue: formatValue(val),
                                  previousValue:
                                    meta?.previousValue !== null && meta?.previousValue !== undefined
                                      ? formatValue(meta.previousValue)
                                      : null,
                                  delta: meta?.delta ?? null,
                                  observationType: 'snapshot',
                                  observationSummary:
                                    meta?.observationSummary ||
                                    `Observed ${metricLabel.toLowerCase()} of ${formatValue(val)} for ${s.name}.`,
                                  sourceUrl: meta?.sourceUrl,
                                  evidence: meta?.evidence || [],
                                })
                              }}
                              className="flex items-center justify-between gap-2 p-1 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: s.color }}
                                />
                                <span className="font-medium truncate max-w-[130px] text-foreground">
                                  {s.name}
                                </span>
                                {s.isOwn && (
                                  <span className="text-[9px] px-1 py-0 rounded bg-primary/20 text-primary font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-foreground shrink-0">
                                {formatValue(val)}
                              </span>
                            </div>
                          )
                        })}
                    </div>

                    {onSelectPoint && (
                      <div className="border-t border-border/50 pt-1.5 text-[10px] text-primary flex items-center gap-1 justify-center">
                        <MousePointerClick className="h-3 w-3" />
                        <span>Click product row to inspect evidence</span>
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {series
              .filter((s) => !hiddenSeries[s.dataKey])
              .map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={s.isOwn ? 2.5 : 1.8}
                  dot={{
                    r: s.isOwn ? 3.5 : 2.5,
                    fill: s.color,
                    stroke: '#09090b',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: s.color,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    onClick: (_, eventPayload) => {
                      if (!onSelectPoint) return
                      const point = (eventPayload as any)?.payload as MultiTrendPoint
                      const val = point?.[s.dataKey]
                      if (val === undefined || val === null) return
                      const meta = point.metaBySeries?.[s.dataKey]

                      onSelectPoint({
                        title: `${s.name} ${metricLabel}`,
                        date: point.date,
                        formattedDate: point.formattedDate,
                        metricLabel,
                        metricValue: formatValue(val),
                        previousValue:
                          meta?.previousValue !== null && meta?.previousValue !== undefined
                            ? formatValue(meta.previousValue)
                            : null,
                        delta: meta?.delta ?? null,
                        observationType: 'snapshot',
                        observationSummary:
                          meta?.observationSummary ||
                          `Observed ${metricLabel.toLowerCase()} of ${formatValue(val)} for ${s.name}.`,
                        sourceUrl: meta?.sourceUrl,
                        evidence: meta?.evidence || [],
                      })
                    },
                  }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
