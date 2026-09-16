'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Edit3, Loader2, Check } from 'lucide-react'
import { AMAZON_MODULES, AmazonModuleOption } from '@/components/analyses/amazon-modules'

const AVAILABLE_MODULES: Array<{ id: string; label: string; description: string }> = [
  { id: 'product_intelligence', label: 'Product Intelligence', description: 'Core features, documentation, licensing' },
  { id: 'seo', label: 'SEO', description: 'Target keywords, meta titles, ranking telemetry' },
  { id: 'sales', label: 'Sales', description: 'Units sold, pricing models, revenue estimates' },
  { id: 'reviews', label: 'Reviews', description: 'Rating distributions and verified review counts' },
  { id: 'comments', label: 'Comments / Sentiment', description: '13 customer complaint categories & evidence' },
  { id: 'opportunities', label: 'Opportunities', description: 'Actionable feature gaps & cold outreach angles' },
]

interface EditAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisId: string
  initialName: string
  initialProductName?: string | null
  initialModules: string[]
  platform?: string
  onUpdated: (updated: { name: string; myProductName?: string | null; selectedModules: string[] }) => void
}

export function EditAnalysisDialog({
  open,
  onOpenChange,
  analysisId,
  initialName,
  initialProductName,
  initialModules,
  platform,
  onUpdated,
}: EditAnalysisDialogProps) {
  const [name, setName] = useState(initialName)
  const [productName, setProductName] = useState(initialProductName || '')
  const [selectedModules, setSelectedModules] = useState<string[]>(initialModules)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAmazon = platform === 'amazon'

  useEffect(() => {
    setName(initialName)
    setProductName(initialProductName || '')
    setSelectedModules(initialModules.length > 0 ? initialModules : AVAILABLE_MODULES.map((m) => m.id))
  }, [initialName, initialProductName, initialModules, open])

  const toggleModule = (id: string) => {
    setSelectedModules((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          setError('At least one module must be selected.')
          return prev
        }
        setError(null)
        return prev.filter((m) => m !== id)
      } else {
        setError(null)
        return [...prev, id]
      }
    })
  }

  const isAmazonModuleSelected = (amzMod: AmazonModuleOption) => {
    return amzMod.underlyingModules.some((m: string) => selectedModules.includes(m))
  }

  const toggleAmazonModule = (amzMod: AmazonModuleOption) => {
    const isSelected = isAmazonModuleSelected(amzMod)
    if (isSelected) {
      const remaining = selectedModules.filter((m) => !amzMod.underlyingModules.includes(m))
      if (remaining.length === 0) {
        setError('At least one intelligence module must be selected.')
        return
      }
      setError(null)
      setSelectedModules(remaining)
    } else {
      setError(null)
      setSelectedModules(Array.from(new Set([...selectedModules, ...amzMod.underlyingModules])))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/analyses/${analysisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          myProductName: productName.trim() || null,
          selectedModules,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update analysis')
      }

      onUpdated({
        name: name.trim(),
        myProductName: productName.trim() || null,
        selectedModules,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving changes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border bg-card p-5 gap-4">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Edit3 className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Edit Analysis
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Update workspace name, product label, and configured intelligence modules.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-2.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Analysis Name */}
          <div className="space-y-1.5">
            <label className="text-foreground font-medium block text-[11px]">Analysis Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q3 Competitive Benchmark"
              disabled={loading}
              className="h-8 text-xs bg-muted/20 border-border"
              required
            />
          </div>

          {/* Product Label */}
          <div className="space-y-1.5">
            <label className="text-foreground font-medium block text-[11px]">Target Product Label</label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., RideOn Taxi Booking"
              disabled={loading}
              className="h-8 text-xs bg-muted/20 border-border"
            />
          </div>

          {/* Modules Selection */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-foreground font-medium block text-[11px]">
                {isAmazon ? 'Amazon Intelligence Modules' : 'Active Intelligence Modules'} ({isAmazon ? AMAZON_MODULES.filter(isAmazonModuleSelected).length : selectedModules.length} selected)
              </label>
              {isAmazon && (
                <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">
                  Amazon 5-Module Pack
                </Badge>
              )}
            </div>
            {isAmazon ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AMAZON_MODULES.map((mod: AmazonModuleOption, idx: number) => {
                  const isChecked = isAmazonModuleSelected(mod)
                  const isLast = idx === AMAZON_MODULES.length - 1
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleAmazonModule(mod)}
                      className={`p-2.5 rounded-md border text-left transition-colors flex flex-col justify-between gap-1.5 ${
                        isLast ? 'sm:col-span-2' : ''
                      } ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border bg-muted/20 text-muted-foreground opacity-60 hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs block">{idx + 1}. {mod.label}</span>
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-transparent'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight pt-1 border-t border-border/40 w-full">
                        {mod.items.join(' · ')}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_MODULES.map((mod) => {
                  const isChecked = selectedModules.includes(mod.id)
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`p-2.5 rounded-md border text-left transition-colors flex items-start justify-between gap-2 ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border bg-muted/20 text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-xs block">{mod.label}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5 leading-tight">
                          {mod.description}
                        </span>
                      </div>
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/40 bg-transparent'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim()}
              className="h-8 text-xs font-medium"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
