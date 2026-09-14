'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Tag,
  Hash,
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  Swords,
  Crosshair,
  Flame,
} from 'lucide-react'
import {
  ObservedTopic,
  CompetitorTopicGap,
  CompetitorSeoProfile,
  SeoContentCoverage,
  PrioritizedSeoAction,
} from '@/services/website-analyzer/types'

export default function SeoPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()
  const [topicFilter, setTopicFilter] = useState<'all' | 'my' | 'competitor' | 'shared'>('all')
  const [showAllTopics, setShowAllTopics] = useState(false)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading product discoverability & search intelligence...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Search className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Select an active workspace above or run an analysis to extract marketplace search topics and competitor keyword gaps.
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

  const seoData = currentProjectData?.seo_analysis || {}
  const targetAudit = seoData.target_onpage_audit || {}
  const competitorsData: any[] = currentProjectData?.competitors_data || []

  const rawObservedTopics: ObservedTopic[] = seoData.observed_topics || []
  const myTopics: string[] = seoData.my_topics || []
  const sharedTopics: string[] = seoData.shared_topics || []
  const competitorOnlyTopics: CompetitorTopicGap[] = seoData.competitor_only_topics || []
  const prioritizedActions: PrioritizedSeoAction[] = seoData.prioritized_actions || []

  const filteredTopics = rawObservedTopics.filter((t) => {
    if (topicFilter === 'my') return t.inMyProduct
    if (topicFilter === 'competitor') return t.inCompetitors
    if (topicFilter === 'shared') return t.inMyProduct && t.inCompetitors
    return true
  })

  // 1. Natural Language Business Summary
  const summaryText = competitorOnlyTopics.length > 0
    ? `Your product is discoverable for ${myTopics.length} core search topics, but competitors dominate ${competitorOnlyTopics.length} high-intent search terms that you currently lack (such as "${competitorOnlyTopics[0]?.topic}"). Adding these buyer search keywords to your product listing will increase incoming marketplace traffic.`
    : myTopics.length > 0
    ? `Your product covers ${myTopics.length} core search topics across its headings and product description with strong market discoverability.`
    : 'Insufficient listing content to extract comprehensive topic coverage.'

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* 0. HEADER — SEO & PRODUCT DISCOVERABILITY */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40 bg-primary/10">
              DISCOVERABILITY INTELLIGENCE
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {rawObservedTopics.length} Search Topics Mined
            </Badge>
            {competitorsData.length > 0 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {competitorsData.length} Rivals Compared
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6 text-primary shrink-0" />
            <span>SEO & Product Discoverability — How is my product positioned & discoverable?</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Marketplace search terms, competitor keyword gaps, and listing copy improvements to maximize organic customer discovery.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/competitors">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Swords className="h-3.5 w-3.5 text-primary" />
              <span>Competitors</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WHAT IS HAPPENING? (Natural Language Business Summary) */}
      {/* ========================================================================= */}
      <Card className="border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
              1. What is Happening? (Discoverability Summary)
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
          2. Key Discoverability Numbers
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Topics You Cover */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Topics You Cover
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {myTopics.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              active search keywords
            </span>
          </Card>

          {/* Competitor Keyword Gaps */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Competitor Keyword Gaps
            </span>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {competitorOnlyTopics.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              terms rivals capture that you miss
            </span>
          </Card>

          {/* Shared Market Terms */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Shared Market Terms
            </span>
            <div className="text-xl font-bold text-blue-400 mt-1">
              {sharedTopics.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              industry standard keywords
            </span>
          </Card>

          {/* Listing Health */}
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Listing Structure Health
            </span>
            <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-1">
              {targetAudit.canonical_status === 'valid' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Healthy
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Needs Polish
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              metadata & title optimization
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
          <span>3. Main Insight: Your Biggest Search Discoverability Gap</span>
        </div>
        <p className="text-xs text-foreground font-medium leading-relaxed">
          {competitorOnlyTopics.length > 0
            ? `Competitors are capturing significant search volume around high-intent keywords like "${competitorOnlyTopics.slice(0, 3).map((g) => g.topic).join('", "')}". Because your product title and main headings do not contain these terms, prospective buyers searching the marketplace land directly on rival product pages.`
            : 'Your product has comprehensive topic coverage matching or exceeding primary competitors in your category.'}
        </p>
      </Card>

      {/* ========================================================================= */}
      {/* 4. IMPORTANT EVIDENCE (Top Search Keyword Opportunities) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-rose-400" />
            <span>4. Top Competitor Keyword Gaps (Search Terms to Target)</span>
          </span>
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">
            {competitorOnlyTopics.length} Gaps Detected
          </Badge>
        </div>

        {competitorOnlyTopics.length === 0 ? (
          <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
            <p className="font-medium text-foreground">Zero Keyword Gaps</p>
            <p className="text-[11px]">Your listing includes all major keywords discovered across competitor pages.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {competitorOnlyTopics.slice(0, 4).map((gap, idx) => (
              <Card key={idx} className="border-border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-foreground text-xs">{gap.topic}</span>
                  <Badge variant="outline" className="text-[9px] font-bold border-rose-500/30 bg-rose-500/10 text-rose-400 shrink-0">
                    High Demand Keyword
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Found on Rival Listing:</span>
                  <p className="italic text-foreground/90">"{gap.evidence}"</p>
                </div>

                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40 flex items-center justify-between">
                  <span>Impact: {gap.strategicImpact || 'Search visibility'}</span>
                  <span className="text-primary font-medium">Add to your title/copy</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. WHAT SHOULD I DO? (3 Listing Optimization Actions) */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          5. What Should I Do? (Actionable Listing Copy Improvements)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {prioritizedActions.length > 0 ? (
            prioritizedActions.slice(0, 3).map((act, idx) => (
              <Card key={idx} className="border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{act.priority.toUpperCase()} PRIORITY: {act.category}</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {act.action}
                </p>
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  Expected Objective: {act.expectedObjective}
                </div>
              </Card>
            ))
          ) : (
            <>
              <Card className="border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Update Product Title</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  Incorporate the top rival keyword gap into your primary marketplace title to trigger immediate keyword matching.
                </p>
              </Card>
              <Card className="border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Feature Bullet Headings</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  Rewrite your top 3 feature bullet headings so they contain high-intent action phrases used by prospective buyers.
                </p>
              </Card>
              <Card className="border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Refine Meta Description</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  Ensure your meta description clearly states compatibility, pricing, and key benefits within the first 140 characters.
                </p>
              </Card>
            </>
          )}
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
                6. Complete Content Topics Registry & Technical Audit
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Examine all {rawObservedTopics.length} extracted topics and on-page technical metadata checks.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="text-xs gap-1.5 h-7"
            >
              {showAllTopics ? (
                <>
                  <span>Hide Details</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>View Details</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {showAllTopics && (
          <CardContent className="p-4 space-y-4 animate-fade-in text-xs">
            {/* Topic Filter Tabs */}
            <Tabs value={topicFilter} onValueChange={(v) => setTopicFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs">All Topics ({rawObservedTopics.length})</TabsTrigger>
                <TabsTrigger value="my" className="text-xs">Your Topics ({myTopics.length})</TabsTrigger>
                <TabsTrigger value="competitor" className="text-xs">Competitor Topics</TabsTrigger>
                <TabsTrigger value="shared" className="text-xs">Shared ({sharedTopics.length})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Topic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto p-1">
              {filteredTopics.map((topic, idx) => (
                <div key={idx} className="p-2.5 rounded bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">{topic.topic}</span>
                    <Badge variant="outline" className="text-[9px]">{topic.semanticGroup}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                    <span>You: {topic.inMyProduct ? '✓ Yes' : '✗ No'}</span>
                    <span>Rivals: {topic.inCompetitors ? '✓ Yes' : '✗ No'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Technical On-Page Health Collapsible */}
            <div className="pt-3 border-t border-border/40">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
              >
                <span>View Technical Metadata Audit (HTML & Tags)</span>
                {showTechnicalDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showTechnicalDetails && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/20 rounded border border-border text-[11px]">
                  <div>
                    <span className="font-bold text-foreground block">Title Tag</span>
                    <p className="text-muted-foreground">{targetAudit.title_length ? `${targetAudit.title_length} characters` : 'Not available'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">Canonical URL</span>
                    <p className="text-muted-foreground">{targetAudit.canonical_status === 'valid' ? 'Valid & self-referential' : 'Missing tag'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">Structured Data</span>
                    <p className="text-muted-foreground">{targetAudit.has_structured_data ? 'Schema tags detected' : 'No structured data'}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Compliance Guarantee Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Real public listing text topics. Zero fabricated rank metrics.</span>
        </span>
        <span>Product Discoverability Engine</span>
      </div>
    </div>
  )
}
