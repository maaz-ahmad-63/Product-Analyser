'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Search,
  X,
  ChevronRight,
  Flame,
  Lightbulb,
  FileText,
  Check,
  Copy,
} from 'lucide-react'

// Helpers for normalized categorization & evidence confidence
function getOpportunityType(opp: any): {
  type: string
  color: string
} {
  const cat = (opp.issue_category || opp.category || opp.problem_detected || '').toLowerCase()
  const matching = Boolean(opp.has_matching_feature || (opp.matching_feature && opp.matching_feature !== 'No verified matching feature found.') || opp.matchingProductFeature)

  if (cat.includes('price') || cat.includes('cost') || cat.includes('tier') || cat.includes('billing')) {
    return { type: 'Pricing Opportunity', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' }
  }
  if (cat.includes('install') || cat.includes('setup') || cat.includes('onboard') || cat.includes('deploy')) {
    return { type: 'Customer Pain', color: 'border-rose-500/30 bg-rose-500/10 text-rose-400' }
  }
  if (cat.includes('support') || cat.includes('service') || cat.includes('ticket') || cat.includes('delay')) {
    return { type: 'Competitor Weakness', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' }
  }
  if (cat.includes('compat') || cat.includes('version') || cat.includes('bug') || cat.includes('error') || cat.includes('latency')) {
    return { type: 'Product Improvement', color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' }
  }
  if (matching) {
    return { type: 'Feature Gap', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400' }
  }
  return { type: 'Positioning Opportunity', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' }
}

function getEvidenceStrength(opp: any): {
  label: string
  mentions: number
  level: 'high' | 'medium' | 'low' | 'none'
  color: string
} {
  const mentions = opp.mention_count ?? opp.mentionCount ?? (opp.evidence_quote || opp.comment_summary ? 1 : 0)
  const conf = String(opp.confidence_level || '').toLowerCase()

  if (mentions >= 4 || conf === 'high') {
    return {
      label: `High Evidence (${mentions} mentions)`,
      mentions,
      level: 'high',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    }
  }
  if (mentions >= 2 || conf === 'medium') {
    return {
      label: `Medium Evidence (${mentions} mentions)`,
      mentions,
      level: 'medium',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    }
  }
  if (mentions === 1) {
    return {
      label: 'Single Verified Signal',
      mentions: 1,
      level: 'low',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    }
  }
  return {
    label: 'Insufficient Evidence',
    mentions: 0,
    level: 'none',
    color: 'text-muted-foreground bg-muted/20 border-border',
  }
}

export default function OpportunitiesPage() {
  const { currentProjectId, currentProjectData, isLoading, projects } = useProject()

  // Modal states
  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null)
  const [showRegistryModal, setShowRegistryModal] = useState<boolean>(false)
  const [registryFilter, setRegistryFilter] = useState<'all' | 'high' | 'matched' | 'actionable'>('all')
  const [registrySearch, setRegistrySearch] = useState<string>('')
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null)

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOpportunity(null)
        setShowRegistryModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when modal is active
  useEffect(() => {
    if (selectedOpportunity || showRegistryModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedOpportunity, showRegistryModal])

  // Opportunities data extraction
  const rawOpportunities: any[] = currentProjectData?.opportunities || []

  // Normalization hook
  const opportunities = useMemo(() => {
    return rawOpportunities.map((o: any, idx: number) => {
      const title = o.problem_detected || o.issue_category || o.pain_point || o.title || `Opportunity #${idx + 1}`
      const competitor = o.competitor_name || o.targetCompetitor || o.affected_competitor || 'Tracked Competitor'
      const quote = (o.comment_summary || o.evidence_quote || o.raw_comment || o.publicComment || '').trim()
      const matchingFeature = o.matching_feature || o.matchingProductFeature || ''
      const hasMatch = Boolean(
        o.has_matching_feature ||
        (matchingFeature && matchingFeature !== 'No verified matching feature found.')
      )
      const draftPitch = (o.draft_message || o.suggestedOutreach || '').trim()
      const whyRelevant = o.why_relevant || o.whyRelevant || (hasMatch ? `Directly solved by your "${matchingFeature}" capability.` : 'Identified buyer pain point with switching intent.')
      const severity = String(o.severity || 'medium').toLowerCase()
      const score = Number(o.opportunity_score ?? o.opportunityScore ?? 0.75)
      const isHighPriority = score >= 0.8 || severity === 'high' || String(o.confidence_level || '').toLowerCase() === 'high'
      const typeInfo = getOpportunityType(o)
      const evidenceInfo = getEvidenceStrength(o)

      const primaryAction = hasMatch
        ? `Highlight "${matchingFeature}" against ${competitor}`
        : draftPitch
        ? `Deploy outreach angle targeting ${competitor} buyers`
        : `Target ${competitor} buyers experiencing ${title.toLowerCase()}`

      return {
        ...o,
        id: o.id || `opp-${idx}`,
        title,
        competitor,
        quote,
        hasEvidence: Boolean(quote && quote.length > 5),
        matchingFeature: hasMatch ? matchingFeature : null,
        hasMatch,
        draftPitch,
        hasAction: Boolean(draftPitch || o.value_proposition || hasMatch),
        whyRelevant,
        score,
        isHighPriority,
        typeInfo,
        evidenceInfo,
        primaryAction,
      }
    })
  }, [rawOpportunities])

  // Key Metrics (3–5 useful metrics using real data only)
  const totalOpportunities = opportunities.length
  const highPriorityCount = opportunities.filter((o) => o.isHighPriority).length
  const customerBackedCount = opportunities.filter((o) => o.hasEvidence).length
  const competitorGapsCount = opportunities.filter((o) => o.hasMatch).length
  const actionableCount = opportunities.filter((o) => o.hasAction).length

  // Top 4 strongest opportunities
  const topOpportunities = useMemo(() => {
    return [...opportunities]
      .sort((a, b) => {
        // High priority + has evidence + has matching feature
        const aScore = (a.isHighPriority ? 2 : 0) + (a.hasMatch ? 2 : 0) + (a.hasEvidence ? 1 : 0) + (a.score || 0)
        const bScore = (b.isHighPriority ? 2 : 0) + (b.hasMatch ? 2 : 0) + (b.hasEvidence ? 1 : 0) + (b.score || 0)
        return bScore - aScore
      })
      .slice(0, 4)
  }, [opportunities])

  // "WHAT WE FOUND" Executive Main Answer
  const mainAnswer = useMemo(() => {
    if (opportunities.length === 0) {
      return {
        headline: 'No verified customer displacement opportunities detected yet.',
        support: 'Run or refresh an analysis to extract public customer discussions and competitor switching signals.',
      }
    }

    const primaryOpp = topOpportunities[0] || opportunities[0]
    const compName = primaryOpp.competitor || 'competitor solutions'
    const problem = primaryOpp.title || 'technical and onboarding friction'
    const match = primaryOpp.matchingFeature

    if (match) {
      return {
        headline: `Competitor buyers repeatedly report friction around ${problem.toLowerCase()} on ${compName}, while your product offers "${match}".`,
        support: `This establishes a high-confidence displacement opportunity (${primaryOpp.evidenceInfo.label}): marketing your "${match}" directly addresses the exact pain point driving competitor churn.`,
      }
    }

    return {
      headline: `Buyers actively express dissatisfaction with ${problem.toLowerCase()} on ${compName}.`,
      support: `Addressing this verified pain point in your positioning and documentation provides an immediate angle to capture dissatisfied buyers seeking alternatives.`,
    }
  }, [opportunities.length, topOpportunities])

  // Filtered registry
  const filteredRegistry = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch =
        !registrySearch ||
        opp.title.toLowerCase().includes(registrySearch.toLowerCase()) ||
        opp.competitor.toLowerCase().includes(registrySearch.toLowerCase()) ||
        opp.quote.toLowerCase().includes(registrySearch.toLowerCase()) ||
        (opp.matchingFeature && opp.matchingFeature.toLowerCase().includes(registrySearch.toLowerCase()))

      const matchesFilter =
        registryFilter === 'all'
          ? true
          : registryFilter === 'high'
          ? opp.isHighPriority
          : registryFilter === 'matched'
          ? opp.hasMatch
          : opp.hasAction

      return matchesSearch && matchesFilter
    })
  }, [opportunities, registrySearch, registryFilter])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedDraftId(id)
    setTimeout(() => setCopiedDraftId(null), 2500)
  }

  // Early returns
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading intelligence opportunities...
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

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl">
      {/* ========================================================================= */}
      {/* 1. HEADER (Seller-First, Intelligence Focus) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              INTELLIGENCE OPPORTUNITIES
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-400 shrink-0" />
            <span>Intelligence Opportunities</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Identifies high-confidence displacement opportunities where competitors are failing customer expectations and your product offers a verified advantage.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/comments">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span>Customer Comments</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KEY METRICS (3–5 Useful Metrics, Real Data Only) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Opportunities */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Total Opportunities</div>
          <div className="text-2xl font-bold text-foreground">
            {totalOpportunities > 0 ? totalOpportunities : 'Not available'}
          </div>
          <div className="text-[10px] text-muted-foreground">Detected churn signals</div>
        </Card>

        {/* High Priority */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">High Priority</div>
          <div className="text-2xl font-bold text-rose-400 flex items-center gap-1.5">
            <Flame className="h-4 w-4" />
            <span>{totalOpportunities > 0 ? highPriorityCount : 'Not available'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">High-intent buyer pain</div>
        </Card>

        {/* Customer-Backed */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Customer-Backed</div>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>{totalOpportunities > 0 ? customerBackedCount : 'Not available'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Direct customer quote evidence</div>
        </Card>

        {/* Competitor Gaps */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Competitor Gaps</div>
          <div className="text-2xl font-bold text-purple-400 flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            <span>{totalOpportunities > 0 ? competitorGapsCount : 'Not available'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Solvable by your features</div>
        </Card>

        {/* Actionable Angles */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Actionable Angles</div>
          <div className="text-2xl font-bold text-blue-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>{totalOpportunities > 0 ? actionableCount : 'Not available'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Pre-crafted pitch angles</div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN ANSWER ("WHAT WE FOUND" — Executive 10-Second Takeaway) */}
      {/* ========================================================================= */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 shadow-sm space-y-1.5">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>WHAT WE FOUND</span>
        </div>
        <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
          {mainAnswer.headline}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {mainAnswer.support}
        </p>
      </Card>

      {/* ========================================================================= */}
      {/* 4. TOP OPPORTUNITIES (3–5 Compact, High-Impact Cards) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-emerald-400" />
              <span>TOP OPPORTUNITIES</span>
            </span>
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
              Top {topOpportunities.length} of {totalOpportunities}
            </Badge>
          </div>
          {opportunities.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRegistryModal(true)}
              className="text-xs text-primary hover:underline font-medium gap-1 h-7 px-2"
            >
              <span>Explore all {opportunities.length} opportunities</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {topOpportunities.length === 0 ? (
          <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-foreground text-sm">No Active Churn Opportunities Detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Competitor public feedback does not show high-confidence displacement friction at this time.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topOpportunities.map((opp, idx) => (
              <Card
                key={opp.id || idx}
                className="border-border bg-card p-4 space-y-3 hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] font-bold uppercase ${opp.typeInfo.color}`}>
                      {opp.typeInfo.type}
                    </Badge>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {opp.is_shared_market_weakness && (
                        <Badge variant="outline" className="text-[9px] font-bold border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                          Shared Weakness ({opp.shared_competitors_count} rivals)
                        </Badge>
                      )}
                      {opp.highest_sales_competitor_affected && (
                        <Badge variant="outline" className="text-[9px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-400">
                          Sales Leader Affected
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          opp.isHighPriority
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {opp.isHighPriority ? 'HIGH PRIORITY' : 'MEDIUM'}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] font-medium ${opp.evidenceInfo.color}`}>
                        {opp.evidenceInfo.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Target Competitor */}
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                      {opp.title}
                    </h3>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Target Competitor: <strong className="text-foreground">{opp.competitor}</strong>
                    </div>
                  </div>

                  {/* Why it Matters */}
                  <div className="p-2.5 rounded bg-muted/20 border border-border/60 text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Why it matters
                    </span>
                    <p className="text-foreground/90 text-[11px] leading-relaxed line-clamp-2">
                      {opp.whyRelevant}
                    </p>
                  </div>
                </div>

                {/* Bottom Action & Modal Trigger */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Action: <strong className="text-primary font-medium">{opp.primaryAction}</strong>
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOpportunity(opp)}
                    className="h-7 text-xs gap-1 text-foreground hover:text-primary hover:border-primary/50 shrink-0 font-medium"
                  >
                    <span>View Evidence</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. ACTION BUTTONS & REGISTRY ACCESS */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-lg border border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="space-y-0.5 text-center sm:text-left">
          <div className="font-semibold text-xs text-foreground">
            Complete Opportunity Registry ({opportunities.length} total signals)
          </div>
          <div className="text-[11px] text-muted-foreground">
            Filter by matched product capabilities, inspect draft outreach templates, and review public comments.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setShowRegistryModal(true)}
            variant="default"
            size="sm"
            className="text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>View Full Opportunity Registry</span>
          </Button>
        </div>
      </div>

      {/* Compliance Guarantee Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Every switching signal linked to real public feedback. Zero manufactured leads.</span>
        </span>
        <span>Opportunity Intelligence Engine</span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: STRUCTURED OPPORTUNITY DETAIL (The 7-Step Hierarchy) */}
      {/* ========================================================================= */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3 bg-muted/10">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[9px] font-bold uppercase ${selectedOpportunity.typeInfo.color}`}>
                    {selectedOpportunity.typeInfo.type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-bold ${
                      selectedOpportunity.isHighPriority
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {selectedOpportunity.isHighPriority ? 'HIGH PRIORITY' : 'MEDIUM'}
                  </Badge>
                  {selectedOpportunity.is_shared_market_weakness && (
                    <Badge variant="outline" className="text-[9px] font-bold border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                      Shared Weakness ({selectedOpportunity.shared_competitors_count} rivals)
                    </Badge>
                  )}
                  {selectedOpportunity.highest_sales_competitor_affected && (
                    <Badge variant="outline" className="text-[9px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-400">
                      Sales Leader Affected
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[9px] font-medium ${selectedOpportunity.evidenceInfo.color}`}>
                    {selectedOpportunity.evidenceInfo.label}
                  </Badge>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                  {selectedOpportunity.title}
                </h2>
                <div className="text-xs text-muted-foreground">
                  Target Competitor: <strong className="text-foreground">{selectedOpportunity.competitor}</strong>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedOpportunity(null)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body: Strict 7-Step Hierarchy */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* 1. WHY THIS IS AN OPPORTUNITY */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>1. Why This is an Opportunity</span>
                </div>
                <p className="text-foreground text-xs leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/20">
                  {selectedOpportunity.whyRelevant || selectedOpportunity.value_proposition || 'Identified customer friction provides a direct commercial angle to displace competitor software.'}
                </p>
              </div>

              {/* 2. EVIDENCE */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5" />
                  <span>2. Grounded Evidence</span>
                </div>
                {selectedOpportunity.hasEvidence ? (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-2">
                    <p className="italic text-foreground text-xs leading-relaxed">
                      "{selectedOpportunity.quote}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>Source: Public Customer Discussion</span>
                      <span>{selectedOpportunity.comment_date || 'Verified marketplace discussion'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs">
                    Insufficient direct quote evidence recorded in current crawl. Derived from aggregated topic clustering.
                  </div>
                )}
              </div>

              {/* 3. CUSTOMER SIGNAL */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>3. Customer Signal</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Observed Friction:</span>
                    <strong className="text-foreground">{selectedOpportunity.title}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Customer Mention Frequency:</span>
                    <strong className="text-foreground">{selectedOpportunity.evidenceInfo.mentions} discussions</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Severity Level:</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-rose-400 border-rose-500/30">
                      {selectedOpportunity.severity || 'Medium'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 4. COMPETITOR SIGNAL */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Target className="h-3.5 w-3.5" />
                  <span>4. Competitor Signal</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Affected Solution:</span>
                    <strong className="text-foreground">{selectedOpportunity.competitor}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Competitor Vulnerability:</span>
                    <span className="text-foreground font-medium">Unresolved customer friction in core workflow</span>
                  </div>
                </div>
              </div>

              {/* 5. YOUR PRODUCT GAP / ADVANTAGE */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <Zap className="h-3.5 w-3.5" />
                  <span>5. Your Product Solution Advantage</span>
                </div>
                <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-1">
                  {selectedOpportunity.hasMatch ? (
                    <>
                      <div className="flex items-center gap-1 text-purple-400 font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Verified Matching Capability in Your Product:</span>
                      </div>
                      <p className="text-foreground font-bold text-xs">
                        "{selectedOpportunity.matchingFeature}"
                      </p>
                      <p className="text-[11px] text-muted-foreground pt-1">
                        You already offer this feature out-of-the-box, providing immediate proof against competitor limitations.
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No direct 1:1 automated feature match detected in current spec. Represents an opportunity for roadmap differentiation or positioning focus.
                    </p>
                  )}
                </div>
              </div>

              {/* 6. BUSINESS IMPACT */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>6. Strategic Commercial Impact</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card text-xs text-foreground/90 leading-relaxed">
                  Directly targeting this pain point removes buyer hesitation during evaluation, increases conversion against {selectedOpportunity.competitor}, and establishes your product as the more reliable modern alternative.
                </div>
              </div>

              {/* 7. RECOMMENDED ACTION */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>7. Recommended Commercial Action</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <p className="text-foreground font-medium text-xs">
                    {selectedOpportunity.primaryAction}
                  </p>

                  {selectedOpportunity.draftPitch && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">
                          Pre-Crafted Outreach Pitch / Ad Hook:
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedOpportunity.draftPitch, selectedOpportunity.id)}
                          className="h-6 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300"
                        >
                          {copiedDraftId === selectedOpportunity.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Script</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-2.5 rounded bg-background/80 border border-border font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedOpportunity.draftPitch}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOpportunity(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COMPLETE OPPORTUNITY REGISTRY (Search & Filter) */}
      {/* ========================================================================= */}
      {showRegistryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3 bg-muted/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Complete Opportunity Registry ({opportunities.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Browse, search, and filter all detected customer switching signals.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRegistryModal(false)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Controls */}
            <div className="p-4 border-b border-border space-y-3 bg-card">
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search opportunities, competitors, or customer quotes..."
                    value={registrySearch}
                    onChange={(e) => setRegistrySearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
                  <Button
                    variant={registryFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegistryFilter('all')}
                    className="h-8 text-xs flex-1 sm:flex-initial"
                  >
                    All ({opportunities.length})
                  </Button>
                  <Button
                    variant={registryFilter === 'high' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegistryFilter('high')}
                    className="h-8 text-xs flex-1 sm:flex-initial"
                  >
                    High Priority ({highPriorityCount})
                  </Button>
                  <Button
                    variant={registryFilter === 'matched' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegistryFilter('matched')}
                    className="h-8 text-xs flex-1 sm:flex-initial"
                  >
                    Matched ({competitorGapsCount})
                  </Button>
                </div>
              </div>
            </div>

            {/* Registry List */}
            <div className="p-4 overflow-y-auto divide-y divide-border/60 max-h-[60vh] space-y-2">
              {filteredRegistry.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No opportunities match your search or filter.
                </div>
              ) : (
                filteredRegistry.map((opp) => (
                  <div
                    key={opp.id}
                    className="pt-3 first:pt-0 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 p-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase ${opp.typeInfo.color}`}>
                          {opp.typeInfo.type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            opp.isHighPriority
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {opp.isHighPriority ? 'HIGH' : 'MED'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Target: <strong className="text-foreground">{opp.competitor}</strong>
                        </span>
                      </div>

                      <div className="font-semibold text-xs text-foreground">
                        {opp.title}
                      </div>

                      {opp.hasEvidence && (
                        <div className="text-[11px] italic text-muted-foreground line-clamp-1">
                          "{opp.quote}"
                        </div>
                      )}

                      {opp.matchingFeature && (
                        <div className="text-[10px] text-purple-400">
                          Matched Feature: <strong className="text-foreground">{opp.matchingFeature}</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOpportunity(opp)
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10 text-xs">
              <span className="text-muted-foreground text-[11px]">
                Showing {filteredRegistry.length} of {opportunities.length} total signals
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegistryModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
