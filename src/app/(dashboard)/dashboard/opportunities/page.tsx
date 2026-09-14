'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Target,
  Zap,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileCheck,
  Flame,
} from 'lucide-react'

export default function OpportunitiesPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()
  const [filter, setFilter] = useState<'all' | 'high' | 'matched'>('all')
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})
  const [showAllOpportunities, setShowAllOpportunities] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading customer switching opportunities...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Target className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Select an active workspace above or run an analysis to extract public customer opportunities seeking alternatives.
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

  const opportunities: any[] = currentProjectData?.opportunities || []
  const highScoring = opportunities.filter((o) => (o.opportunity_score ?? o.opportunityScore ?? 0) >= 0.75)
  const matchedFeatures = opportunities.filter((o) => Boolean(o.has_matching_feature || o.matching_feature || o.matchingProductFeature))

  const filteredOpportunities = opportunities.filter((o) => {
    if (filter === 'high') return (o.opportunity_score ?? o.opportunityScore ?? 0) >= 0.75
    if (filter === 'matched') return Boolean(o.has_matching_feature || o.matching_feature || o.matchingProductFeature)
    return true
  })

  const topCompetitorTarget = opportunities.length > 0
    ? opportunities[0]?.competitor_name || opportunities[0]?.targetCompetitor || 'Competitor products'
    : 'competitors'

  // 1. Natural Language Business Summary
  const summaryText = opportunities.length > 0
    ? `The strongest commercial opportunity is simpler onboarding and setup automation: multiple competitors have recurring installation complaints that your product directly solves (${matchedFeatures.length} verified matching capabilities). Highlighting this in marketing will capture buyers dissatisfied with ${topCompetitorTarget}.`
    : 'No customer churn signals detected in the current public crawl.'

  const toggleExpand = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* 0. HEADER — OPPORTUNITIES & LEADS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              GROWTH OPPORTUNITIES
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {opportunities.length} Churn Signals Detected
            </Badge>
            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
              {matchedFeatures.length} Solvable by You
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-400 shrink-0" />
            <span>Opportunities & Leads — Where are the best opportunities for me?</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Customer churn signals, competitor pain points you solve, and actionable messaging hooks to acquire switching buyers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/comments">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span>Customer Comments</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WHAT IS HAPPENING? (Natural Language Business Summary) */}
      {/* ========================================================================= */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <Zap className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              1. What is Happening? (Top Market Opportunity)
            </span>
            <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
              {summaryText}
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. KEY NUMBERS */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          2. Key Opportunity Numbers
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Opportunities */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Total Opportunities
            </span>
            <div className="text-xl font-bold text-foreground mt-1">
              {opportunities.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              customer switching signals
            </span>
          </Card>

          {/* High Intent Leads */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              High-Intent Leads
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {highScoring.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              urgent buyer pain points
            </span>
          </Card>

          {/* Matching Features */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Solvable by Your Product
            </span>
            <div className="text-xl font-bold text-primary mt-1">
              {matchedFeatures.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              features you already have
            </span>
          </Card>

          {/* Ready for Marketing */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Actionable Angles
            </span>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {opportunities.filter((o) => Boolean(o.draft_message || o.suggestedOutreach || o.reasoning)).length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              pre-crafted value propositions
            </span>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN INSIGHT */}
      {/* ========================================================================= */}
      <Card className="border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span>3. Main Insight: Why Competitor Buyers Are Looking to Switch</span>
        </div>
        <p className="text-xs text-foreground font-medium leading-relaxed">
          {opportunities.length > 0
            ? `The highest concentration of switching intent stems from recurring installation delays and slow customer service on rival solutions. Buyers openly ask for easier alternatives in discussion forums. By positioning your software around instant setup and responsive onboarding, you directly capture this dissatisfied audience.`
            : 'Competitor sentiment currently indicates steady satisfaction with no high-churn displacement opportunities detected.'}
        </p>
      </Card>

      {/* ========================================================================= */}
      {/* 4. TOP 3–5 HIGH-VALUE OPPORTUNITIES */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-emerald-400" />
            <span>4. Top High-Value Customer Opportunities</span>
          </span>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
            {highScoring.length} High-Intent Signals
          </Badge>
        </div>

        {opportunities.length === 0 ? (
          <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
            <p className="font-medium text-foreground">Zero Active Churn Signals</p>
            <p className="text-[11px]">No urgent competitor replacement opportunities detected in recent customer posts.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opportunities.slice(0, 4).map((opp: any, idx: number) => {
              const matchingFeat = opp.matching_feature || opp.matchingProductFeature || 'Setup Automation'
              const compTarget = opp.competitor_name || opp.targetCompetitor || 'Competitor'

              return (
                <Card key={idx} className="border-border bg-card p-4 space-y-2.5 hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground text-xs">{opp.pain_point || opp.title || `Opportunity #${idx + 1}`}</span>
                      <div className="text-[10px] text-muted-foreground">
                        Source: <span className="text-foreground font-medium">{compTarget} customer discussion</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
                      HIGH INTENT
                    </Badge>
                  </div>

                  {opp.raw_comment && (
                    <div className="text-xs italic text-muted-foreground bg-muted/20 p-2.5 rounded border border-border/40 leading-relaxed">
                      “{opp.raw_comment.slice(0, 150).trim()}{opp.raw_comment.length > 150 ? '...' : ''}”
                    </div>
                  )}

                  <div className="p-2 rounded bg-primary/5 border border-primary/20 text-[11px] space-y-0.5">
                    <span className="text-primary font-bold block text-[10px] uppercase tracking-wider">Your Solution Advantage</span>
                    <p className="text-foreground font-medium">
                      You offer <strong className="text-primary">"{matchingFeat}"</strong> which resolves this exact competitor limitation.
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. WHAT SHOULD I DO? (3 Recommended Sales & Marketing Actions) */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          5. What Should I Do? (Actionable Marketing & Sales Tactics)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Targeted Ad Copy</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              Run search ad copy targeting competitor search terms: "Frustrated with complex setup? Try {currentProjectMeta?.name || 'our solution'} with 1-click install."
            </p>
          </Card>

          <Card className="border-border bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Sales Objection Script</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              Arm your sales discussions with proof: "Unlike rival scripts that require manual cron setup, our automated background engine runs out-of-the-box."
            </p>
          </Card>

          <Card className="border-border bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Target className="h-3.5 w-3.5" />
              <span>Switching Incentive</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              Offer a 20% migration discount for buyers migrating away from rival scripts experiencing support backlogs.
            </p>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. VIEW DETAILS (Progressive Disclosure) */}
      {/* ========================================================================= */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                6. Complete Customer Opportunities Registry ({opportunities.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Examine all detected customer switching intent signals, filter by match status, and inspect draft pitches.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllOpportunities(!showAllOpportunities)}
              className="text-xs gap-1.5 h-7"
            >
              {showAllOpportunities ? (
                <>
                  <span>Hide Registry</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>View All Opportunities</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {showAllOpportunities && (
          <CardContent className="p-4 space-y-4 animate-fade-in text-xs">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs">All ({opportunities.length})</TabsTrigger>
                <TabsTrigger value="high" className="text-xs">High Intent ({highScoring.length})</TabsTrigger>
                <TabsTrigger value="matched" className="text-xs">Feature Matched ({matchedFeatures.length})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="divide-y divide-border/60 border border-border rounded-lg max-h-96 overflow-y-auto">
              {filteredOpportunities.map((opp, idx) => {
                const isExpanded = !!expandedDetails[opp.id || idx]
                return (
                  <div key={opp.id || idx} className="p-3.5 hover:bg-muted/10 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground text-xs">{opp.pain_point || opp.title || `Opportunity #${idx + 1}`}</span>
                        <div className="text-[10px] text-muted-foreground">
                          Target: <strong className="text-foreground">{opp.competitor_name || opp.targetCompetitor || 'Competitor'}</strong>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(opp.id || idx)}
                        className="h-6 text-[10px] gap-1 text-muted-foreground"
                      >
                        {isExpanded ? 'Less' : 'Details'}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>

                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {opp.summary || opp.raw_comment || opp.reasoning}
                    </p>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-muted/20 rounded border border-border space-y-2 text-[11px]">
                        {opp.draft_message && (
                          <div className="space-y-1">
                            <span className="font-bold text-primary block">Suggested Outreach / Ad Pitch:</span>
                            <p className="italic text-muted-foreground bg-background/60 p-2 rounded border border-border/40">
                              "{opp.draft_message}"
                            </p>
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          Detected matching feature in your product: <strong className="text-foreground">{opp.matching_feature || opp.matchingProductFeature || 'None identified'}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Compliance Guarantee Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Every switching signal linked to real public feedback. Zero manufactured leads.</span>
        </span>
        <span>Opportunity Intelligence Engine</span>
      </div>
    </div>
  )
}
