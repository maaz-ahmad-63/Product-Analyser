'use client'

import React, { useState } from 'react'
import { HelpCircle, Info, Calculator, Database, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MetricExplanation {
  label: string
  currentValue: string | number
  previousValue?: string | number | null
  formula?: string
  result?: string
  source?: string
  notes?: string
  baselinePeriod?: string
}

interface MetricExplainerProps {
  explanation: MetricExplanation
  children?: React.ReactNode
  className?: string
  badgeVariant?: 'subtle' | 'inline' | 'icon-only'
}

export function MetricExplainer({
  explanation,
  children,
  className,
  badgeVariant = 'inline',
}: MetricExplainerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <span
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        title="Click to view calculation and data source"
        className={cn(
          'inline-flex items-center gap-1 cursor-pointer transition-all hover:opacity-80 select-none group',
          badgeVariant === 'subtle' && 'border-b border-dotted border-muted-foreground/50 hover:border-primary',
          className
        )}
      >
        {children}
        <Info className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </span>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(false)
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-primary/10 text-primary">
                  <Calculator className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-foreground truncate max-w-[220px]">
                  {explanation.label}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Values Comparison */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/60 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Current Value
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {explanation.currentValue}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Previous Baseline
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    {explanation.previousValue !== undefined && explanation.previousValue !== null
                      ? explanation.previousValue
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Calculation Formula */}
              {explanation.formula && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Calculation
                  </span>
                  <div className="p-2.5 rounded-md bg-zinc-950/80 border border-border/80 font-mono text-[11px] text-primary space-y-1">
                    <div className="text-muted-foreground">{explanation.formula}</div>
                    {explanation.result && (
                      <div className="text-foreground font-bold pt-1 border-t border-border/40 flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span>Result: {explanation.result}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Data Source */}
              {explanation.source && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Data Source
                  </span>
                  <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-[11px] text-muted-foreground">
                    <Database className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{explanation.source}</span>
                  </div>
                </div>
              )}

              {/* Baseline Period or Notes */}
              {(explanation.baselinePeriod || explanation.notes) && (
                <div className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-md space-y-1">
                  {explanation.baselinePeriod && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">Observation window:</span>
                      <span>{explanation.baselinePeriod}</span>
                    </div>
                  )}
                  {explanation.notes && <div>{explanation.notes}</div>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
