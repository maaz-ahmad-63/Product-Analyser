'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  Target,
  Clock,
  Check,
} from 'lucide-react'

export default function RecommendationsPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()
  const [acceptedActions, setAcceptedActions] = useState<Record<string, boolean>>({})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading strategic recommendations...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Lightbulb className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Select an active workspace above or run a competitive analysis to generate deterministic product and pricing recommendations.
        </p>
        <Link href="/analyses/new">
          <Button className="gap-2 mt-2">
            <Sparkles className="h-4 w-4" />
            Run New Analysis
          </Button>
        </Link>
      </div>
    )
  }

  const recommendations: any[] = currentProjectData?.recommendations || []
  const comparison = currentProjectData?.comparison || {}
  const improvementAreas: string[] = comparison.improvementAreas || []
  const productGaps: string[] = comparison.productGaps || []

  const toggleAction = (id: string) => {
    setAcceptedActions((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const criticalCount = recommendations.filter((r) => r.priority === 'critical').length
  const highCount = recommendations.filter((r) => r.priority === 'high').length

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
              Strategic Recommendations
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {recommendations.length} Actionable Items
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary shrink-0" />
            <span>Product & Positioning Recommendations</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Deterministic recommendations derived from verified competitor pricing moves, feature gaps, and customer complaints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href={`/analyses/${currentProjectId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Full Analysis Matrix</span>
            </Button>
          </Link>
          <Link href="/dashboard/my-saas">
            <Button size="sm" className="gap-1.5 text-xs shadow-sm">
              <Zap className="h-3.5 w-3.5" />
              <span>Target SaaS Specs</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Total Recommendations
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {recommendations.length}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            rule-engine synthesized
          </span>
        </Card>

        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Critical Priority
          </span>
          <div className="text-xl font-bold text-rose-400 mt-1">
            {criticalCount}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            immediate strategic risk
          </span>
        </Card>

        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            High Priority Moves
          </span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {highCount}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            high growth leverage
          </span>
        </Card>

        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Actions Accepted
          </span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {Object.values(acceptedActions).filter(Boolean).length}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            ready for implementation
          </span>
        </Card>
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border text-xs text-muted-foreground">
            No specific rule triggers detected in this scan. Your current product pricing and feature posture are competitive.
          </Card>
        ) : (
          recommendations.map((rec: any, idx: number) => {
            const isAccepted = !!acceptedActions[rec.id || String(idx)]
            const priorityBadge =
              rec.priority === 'critical'
                ? 'destructive'
                : rec.priority === 'high'
                ? 'warning'
                : 'outline'

            return (
              <Card
                key={rec.id || idx}
                className={`border-border transition-all ${
                  isAccepted ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-card'
                }`}
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">
                          {rec.title}
                        </CardTitle>
                        <span className="text-[11px] text-muted-foreground">
                          Rule: {rec.ruleTriggered || 'Competitive Differentiation'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={priorityBadge as any} className="text-[10px] uppercase">
                        {rec.priority || 'medium'}
                      </Badge>
                      {rec.confidence && (
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(rec.confidence * 100)}% Confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Problem / Market Context
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      {rec.reason || rec.problem || 'Market adjustment identified.'}
                    </p>
                  </div>

                  {rec.evidence && (
                    <div className="p-2.5 rounded bg-muted/20 border border-border/60 text-[11px] text-foreground">
                      <strong className="text-primary block mb-0.5">Observed Evidence:</strong>
                      {rec.evidence}
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <span className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                      <Zap className="h-3.5 w-3.5" />
                      Suggested Action (Next 30 Minutes)
                    </span>
                    <p className="text-foreground text-xs leading-relaxed font-medium">
                      {rec.suggestedAction}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      {isAccepted ? 'Action marked for roadmap execution' : 'Pending review'}
                    </span>
                    <Button
                      size="sm"
                      variant={isAccepted ? 'secondary' : 'default'}
                      onClick={() => toggleAction(rec.id || String(idx))}
                      className="gap-1.5 text-xs h-7"
                    >
                      {isAccepted ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Accepted</span>
                        </>
                      ) : (
                        <>
                          <span>Accept Recommendation</span>
                          <ArrowRight className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Identified Product Gaps & Improvement Areas */}
      {(productGaps.length > 0 || improvementAreas.length > 0) && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Feature Gaps & Improvement Focus Areas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {productGaps.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block">
                  Identified Feature Gaps ({productGaps.length})
                </span>
                <ul className="space-y-1 text-muted-foreground">
                  {productGaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {improvementAreas.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-purple-400 uppercase tracking-wider text-[11px] block">
                  Key Improvement Vectors ({improvementAreas.length})
                </span>
                <ul className="space-y-1 text-muted-foreground">
                  {improvementAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-purple-400">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Guarantee Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Recommendations synthesized deterministically from live scraped product facts.</span>
        </span>
        <span>Zero Guesswork</span>
      </div>
    </div>
  )
}
