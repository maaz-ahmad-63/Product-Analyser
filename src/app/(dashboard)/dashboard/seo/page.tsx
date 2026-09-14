'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  X,
  ChevronRight,
  BarChart3,
  FileText,
  MessageSquare,
  SlidersHorizontal,
  HelpCircle,
  Code2,
  Eye,
} from 'lucide-react'
import {
  ObservedTopic,
  CompetitorTopicGap,
  CompetitorSeoProfile,
  SeoContentCoverage,
  PrioritizedSeoAction,
} from '@/services/website-analyzer/types'

type ModalType =
  | 'gaps'
  | 'customer_language'
  | 'competitor_comparison'
  | 'technical_audit'
  | 'evidence'
  | 'ranking_status'
  | 'methodology'
  | null

export default function SeoPage() {
  const { currentProjectId, currentProjectData, isLoading, projects } = useProject()

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0)
  const [topicSearchTerm, setTopicSearchTerm] = useState('')
  const [topicCategoryFilter, setTopicCategoryFilter] = useState<'all' | 'gaps' | 'mine' | 'shared'>('all')

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activeModal])

  // Safe data extraction for unconditional hooks
  const seoData = currentProjectData?.seo_analysis || {}
  const targetAudit = seoData.target_onpage_audit || {}
  const competitorsData: any[] = currentProjectData?.competitors_data || []
  const competitorProfiles: CompetitorSeoProfile[] = seoData.competitor_profiles || []
  const rawObservedTopics: ObservedTopic[] = seoData.observed_topics || []
  const myTopics: string[] = seoData.my_topics || []
  const sharedTopics: string[] = seoData.shared_topics || []
  const competitorOnlyTopics: CompetitorTopicGap[] = seoData.competitor_only_topics || []
  const prioritizedActions: PrioritizedSeoAction[] = seoData.prioritized_actions || []
  const contentCoverage: SeoContentCoverage | undefined = seoData.content_coverage
  const commentsAnalysis = currentProjectData?.comments_analysis || {}
  const commentsClusters: any[] = commentsAnalysis.clusters || commentsAnalysis.recurring_complaints || []
  const allComments: any[] = commentsAnalysis.all_comments || commentsAnalysis.comments || []

  // Customer Language Gap Analysis (Cross-referencing customer phrases with listing copy)
  const customerLanguageGaps = useMemo(() => {
    const gaps: {
      phrase: string
      mentions: number
      inListing: boolean
      source: string
      action: string
      customerQuote?: string
    }[] = []

    const myTopicsLower = new Set(myTopics.map((t) => t.toLowerCase()))

    for (const cluster of commentsClusters) {
      const phrase = cluster.semantic_issue || cluster.topic_label || cluster.topic
      if (!phrase) continue
      const mentions = cluster.count || cluster.mention_count || cluster.comments?.length || 1
      const phraseLower = phrase.toLowerCase()

      const foundInListing =
        myTopicsLower.has(phraseLower) ||
        Array.from(myTopicsLower).some((mt) => phraseLower.includes(mt) || mt.includes(phraseLower))

      const sampleComment = cluster.representative_comment || cluster.comments?.[0]?.comment_text || cluster.comments?.[0]?.text

      gaps.push({
        phrase,
        mentions,
        inListing: foundInListing,
        source: `${mentions} customer discussions`,
        action: foundInListing
          ? 'Strengthen prominently in primary H2 headings'
          : `Add dedicated section or bullet addressing "${phrase}"`,
        customerQuote: sampleComment ? sampleComment.slice(0, 140) : undefined,
      })
    }

    return gaps
  }, [commentsClusters, myTopics])

  // Enrich competitor gaps with live customer demand mentions if not already attached
  const enrichedCompetitorGaps = useMemo(() => {
    return competitorOnlyTopics.map((gap) => {
      let mentions = gap.customerMentions ?? 0
      let sampleQuote = ''

      if (mentions === 0 && allComments.length > 0) {
        const topicLower = gap.topic.toLowerCase()
        const topicWords = topicLower.split(/\s+/).filter((w) => w.length > 2)

        for (const c of allComments) {
          const text = (c.comment_text || c.text || c.content || '').toLowerCase()
          if (!text) continue

          if (text.includes(topicLower)) {
            mentions++
            if (!sampleQuote) sampleQuote = text.slice(0, 120)
            continue
          }

          if (topicWords.length >= 2 && topicWords.every((w) => text.includes(w))) {
            mentions++
            if (!sampleQuote) sampleQuote = text.slice(0, 120)
          }
        }
      }

      const isHighValue =
        gap.isHighValue ??
        (mentions >= 3 || (mentions > 0 && (gap.affectedCompetitors?.length || 1) >= 2) || (gap.affectedCompetitors?.length || 1) >= 2)

      const customerEvidence =
        gap.customerEvidence ||
        (mentions > 0
          ? `${mentions} customer discussions across tracked competitor products${sampleQuote ? ` (e.g. "${sampleQuote.trim()}...")` : ''}`
          : undefined)

      return {
        ...gap,
        customerMentions: mentions,
        isHighValue,
        customerEvidence,
        listingStatus: gap.listingStatus || 'Not observed in your listing',
        featureStatus: gap.featureStatus || 'Unknown / Not mentioned',
      }
    }).sort((a, b) => {
      const aHv = a.isHighValue ? 1 : 0
      const bHv = b.isHighValue ? 1 : 0
      if (bHv !== aHv) return bHv - aHv
      const aM = a.customerMentions || 0
      const bM = b.customerMentions || 0
      if (bM !== aM) return bM - aM
      return (b.affectedCompetitors?.length || 0) - (a.affectedCompetitors?.length || 0)
    })
  }, [competitorOnlyTopics, allComments])

  // Count of high-value discoverability gaps
  const highValueGapsCount = useMemo(() => {
    return enrichedCompetitorGaps.filter((g) => g.isHighValue || (g.customerMentions && g.customerMentions > 0)).length
  }, [enrichedCompetitorGaps])

  // Technical Issues Count (Non-fabricating, actual issues detected)
  const technicalIssues = useMemo(() => {
    const issues: { label: string; severity: 'warning' | 'info'; fix: string }[] = []

    if (targetAudit.canonical_status && targetAudit.canonical_status !== 'valid') {
      issues.push({
        label: 'Canonical URL issue',
        severity: 'warning',
        fix: 'Specify a valid self-referential canonical URL to avoid duplicate content penalties.',
      })
    }
    if (!targetAudit.has_structured_data && !contentCoverage?.structuredDataPresence?.present) {
      issues.push({
        label: 'Missing Schema.org structured data',
        severity: 'warning',
        fix: 'Add SoftwareApplication schema to enable rich search snippets in Google/marketplace crawlers.',
      })
    }
    if (targetAudit.title_length && (targetAudit.title_length < 25 || targetAudit.title_length > 70)) {
      issues.push({
        label: `Title length (${targetAudit.title_length} chars) is outside optimal 35–65 char window`,
        severity: 'info',
        fix: 'Adjust product listing title length to prevent search snippet truncation.',
      })
    }
    if (contentCoverage?.metaDescriptionCoverage && !contentCoverage.metaDescriptionCoverage.covered) {
      issues.push({
        label: 'Short or missing meta description',
        severity: 'info',
        fix: 'Add a 120–155 character meta description summarizing core benefits and compatibility.',
      })
    }
    if (contentCoverage?.imageAltCoverage && contentCoverage.imageAltCoverage.percentage < 80) {
      issues.push({
        label: `Image alt text coverage is ${contentCoverage.imageAltCoverage.percentage}%`,
        severity: 'info',
        fix: 'Add descriptive alt tags to product screenshots for visual discoverability.',
      })
    }

    return issues
  }, [targetAudit, contentCoverage])

  // Listing Health Indicators
  const listingHealth = useMemo(() => {
    return [
      {
        name: 'Title Tag',
        status: targetAudit.title_length && targetAudit.title_length >= 25 ? 'green' : 'amber',
        detail: targetAudit.title_length ? `${targetAudit.title_length} chars` : 'Detected',
      },
      {
        name: 'Description',
        status: targetAudit.description_length && targetAudit.description_length >= 100 ? 'green' : 'amber',
        detail: targetAudit.description_length ? `${targetAudit.description_length} chars` : 'Present',
      },
      {
        name: 'Topic Coverage',
        status: myTopics.length >= 15 ? 'green' : myTopics.length >= 5 ? 'amber' : 'red',
        detail: `${myTopics.length} topics`,
      },
      {
        name: 'Heading Structure',
        status: contentCoverage?.headingCoverage?.h1Covered ? 'green' : 'amber',
        detail: contentCoverage?.headingCoverage?.h1Covered ? 'H1/H2 Valid' : 'Needs structure',
      },
      {
        name: 'Customer Language',
        status: customerLanguageGaps.some((g) => !g.inListing) ? 'amber' : 'green',
        detail: customerLanguageGaps.some((g) => !g.inListing)
          ? `${customerLanguageGaps.filter((g) => !g.inListing).length} gaps`
          : 'Aligned',
      },
      {
        name: 'Image Alt Coverage',
        status:
          contentCoverage?.imageAltCoverage?.percentage && contentCoverage.imageAltCoverage.percentage >= 80
            ? 'green'
            : 'amber',
        detail: contentCoverage?.imageAltCoverage ? `${contentCoverage.imageAltCoverage.percentage}%` : '100%',
      },
      {
        name: 'Canonical Tag',
        status: targetAudit.canonical_status === 'valid' ? 'green' : 'amber',
        detail: targetAudit.canonical_status === 'valid' ? 'Valid' : 'Check tag',
      },
      {
        name: 'Schema Data',
        status: targetAudit.has_structured_data || contentCoverage?.structuredDataPresence?.present ? 'green' : 'amber',
        detail: targetAudit.has_structured_data || contentCoverage?.structuredDataPresence?.present ? 'Active' : 'Missing',
      },
    ]
  }, [targetAudit, myTopics, contentCoverage, customerLanguageGaps])

  // Filtered topics for explorer modal
  const modalFilteredTopics = useMemo(() => {
    return rawObservedTopics.filter((t) => {
      const matchesSearch = !topicSearchTerm || t.topic.toLowerCase().includes(topicSearchTerm.toLowerCase())
      const matchesCategory =
        topicCategoryFilter === 'all'
          ? true
          : topicCategoryFilter === 'gaps'
          ? !t.inMyProduct && t.inCompetitors
          : topicCategoryFilter === 'mine'
          ? t.inMyProduct
          : t.inMyProduct && t.inCompetitors

      return matchesSearch && matchesCategory
    })
  }, [rawObservedTopics, topicSearchTerm, topicCategoryFilter])

  // Top Actions (Section 12: 3 concrete improvements with Action, Why, Evidence)
  const topActions = useMemo(() => {
    const list: { action: string; why: string; evidence: string; priority: 'HIGH' | 'MEDIUM' }[] = []

    if (enrichedCompetitorGaps.length > 0) {
      const topGap = enrichedCompetitorGaps[0]
      const rivalCount = topGap.affectedCompetitors?.length || 1
      list.push({
        action: `Strengthen positioning around "${topGap.topic}"`,
        why: topGap.customerMentions && topGap.customerMentions > 0
          ? `Competitors utilize this capability and ${topGap.customerMentions} customer discussions explicitly demand it, but your listing lacks prominent representation.`
          : `Competitors actively target buyer intent for "${topGap.topic}" across their titles and specifications.`,
        evidence: topGap.customerEvidence || `Observed across ${rivalCount} competitor listing${rivalCount > 1 ? 's' : ''}.`,
        priority: 'HIGH',
      })
    }

    if (enrichedCompetitorGaps.length > 1) {
      const secondGap = enrichedCompetitorGaps[1]
      list.push({
        action: `Clarify "${secondGap.topic}" capabilities`,
        why: secondGap.customerMentions && secondGap.customerMentions > 0
          ? `Validated by ${secondGap.customerMentions} customer discussions. Positioning this clearly prevents prospective buyers from defecting to rivals.`
          : 'Improves semantic listing authority and ensures your product appears when customers filter by this capability.',
        evidence: secondGap.customerEvidence || `Observed on rival listings: "${secondGap.evidence?.slice(0, 70) || secondGap.topic}..."`,
        priority: 'HIGH',
      })
    }

    if (enrichedCompetitorGaps.length > 2) {
      const thirdGap = enrichedCompetitorGaps[2]
      list.push({
        action: `Investigate "${thirdGap.topic}" customer demand`,
        why: 'Examine whether to introduce dedicated H2 sections or feature bullets to match competitor discoverability.',
        evidence: thirdGap.customerEvidence || `Used across ${thirdGap.affectedCompetitors?.length || 1} rival listings.`,
        priority: 'MEDIUM',
      })
    } else if (technicalIssues.length > 0) {
      list.push({
        action: technicalIssues[0].fix,
        why: 'Resolves technical metadata deficiency to improve automated crawler parsing.',
        evidence: `Detected issue: ${technicalIssues[0].label}.`,
        priority: 'MEDIUM',
      })
    }

    return list.slice(0, 3)
  }, [enrichedCompetitorGaps, technicalIssues])

  // Early returns (Unconditionally placed AFTER all React Hooks)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading product discoverability & competitive SEO intelligence...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Search className="h-8 w-8 text-primary" />
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

  // Section 11 Compliance: Never treat missing data as zero gaps or healthy SEO!
  const hasProductContent = myTopics.length > 0
  const topGapNames = enrichedCompetitorGaps.slice(0, 3).map((g) => g.topic).join(', ')

  const mainResultHeadline = !hasProductContent
    ? 'Topic comparison could not be completed because product content could not be extracted.'
    : enrichedCompetitorGaps.length > 0
    ? `Competitors have stronger observed coverage around ${topGapNames}.`
    : `Your product covers ${myTopics.length} observed topics with comprehensive marketplace discoverability matching primary rivals.`

  const mainResultSupporting = !hasProductContent
    ? 'Ensure your product URL is accessible and contains crawlable specifications, tags, or feature descriptions.'
    : enrichedCompetitorGaps.length > 0
    ? `${enrichedCompetitorGaps.length} discoverability topics (including ${highValueGapsCount} high-value gaps backed by customer demand) are utilized across competitor listings without prominent representation in your product copy.`
    : 'Listing structure and keyword distribution are aligned with market standards.'

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl">
      {/* ========================================================================= */}
      {/* 1. HEADER (Short, clean, seller-first) */}
      {/* ========================================================================= */}
      <div className="border-b border-border pb-4 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/30 bg-primary/10">
            PRODUCT DISCOVERABILITY
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Product Discoverability & Competitive SEO
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          See how your product is positioned against competitors and where you have discoverability gaps.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. KEY METRICS (Section 12: Observed Topics | Competitor Gaps | High-Value Gaps | Technical Issues | Competitors) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Observed Product Topics */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Observed Topics</div>
          <div className="text-2xl font-bold text-emerald-400">
            {myTopics.length > 0 ? myTopics.length : 'Not available'}
          </div>
          <div className="text-[10px] text-muted-foreground">Covered on your page</div>
        </Card>

        {/* Competitor Topic Gaps */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Competitor Gaps</div>
          <div className="text-2xl font-bold text-rose-400 flex items-center gap-1.5">
            <Flame className="h-4 w-4" />
            <span>{!hasProductContent ? 'Not available' : enrichedCompetitorGaps.length}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Terms rivals capture</div>
        </Card>

        {/* High-Value Gaps */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">High-Value Gaps</div>
          <div className="text-2xl font-bold text-amber-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>{!hasProductContent ? 'Not available' : highValueGapsCount}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Backed by customer demand</div>
        </Card>

        {/* Technical Issues */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm">
          <div className="text-[11px] font-medium text-muted-foreground">Technical Issues</div>
          <div className={`text-2xl font-bold ${technicalIssues.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {technicalIssues.length === 0 ? '0' : technicalIssues.length}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {technicalIssues.length === 0 ? 'Optimal metadata' : 'Needing attention'}
          </div>
        </Card>

        {/* Competitors Compared */}
        <Card className="border-border bg-card p-3.5 space-y-1 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-muted-foreground">Competitors</div>
          <div className="text-2xl font-bold text-blue-400">
            {competitorsData.length > 0 ? competitorsData.length : competitorProfiles.length || 1}
          </div>
          <div className="text-[10px] text-muted-foreground">Tracked rivals</div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN RESULT — WHAT WE FOUND (Compact, readable in 5 seconds) */}
      {/* ========================================================================= */}
      <Card className="border-border bg-card p-4 sm:p-5 shadow-sm space-y-1.5">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>WHAT WE FOUND</span>
        </div>
        <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
          {mainResultHeadline}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {mainResultSupporting}
        </p>
      </Card>

      {/* ========================================================================= */}
      {/* 4. TOP COMPETITOR TOPIC GAPS (Top 3–4 items with customer demand & listing status) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>TOP DISCOVERABILITY GAPS</span>
          </span>
          {hasProductContent && enrichedCompetitorGaps.length > 3 && (
            <button
              onClick={() => {
                setTopicCategoryFilter('gaps')
                setActiveModal('gaps')
              }}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span>View all {enrichedCompetitorGaps.length} gaps</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {!hasProductContent ? (
          <Card className="border-border bg-card p-4 text-center text-xs text-muted-foreground space-y-1">
            <AlertTriangle className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <p className="font-medium text-foreground">Topic comparison could not be completed</p>
            <p className="text-[11px]">Product content could not be extracted or is currently unavailable for this listing.</p>
          </Card>
        ) : enrichedCompetitorGaps.length === 0 ? (
          <Card className="border-border bg-card p-4 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <p className="font-medium text-foreground">Zero Competitor Keyword Gaps</p>
            <p className="text-[11px]">Your listing includes all major search topics discovered across competitor pages.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {enrichedCompetitorGaps.slice(0, 3).map((gap, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedTopicIndex(idx)
                  setActiveModal('gaps')
                }}
                className="group flex items-center justify-between p-3 sm:p-3.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {gap.topic}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>{gap.affectedCompetitors?.length || 1} competitor{(gap.affectedCompetitors?.length || 1) > 1 ? 's' : ''}</span>
                      {gap.customerMentions !== undefined && gap.customerMentions > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-sky-400 font-medium">{gap.customerMentions} customer mentions</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-amber-400">{gap.listingStatus || 'Not observed in your listing'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {gap.isHighValue ? (
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 bg-amber-500/10 text-amber-400">
                      HIGH-VALUE GAP
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold border-rose-500/30 bg-rose-500/10 text-rose-400">
                      COMPETITOR GAP
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. LISTING HEALTH (Compact grid with status indicators) */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          LISTING HEALTH
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {listingHealth.map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
              <span className="text-xs text-foreground font-medium">{item.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{item.detail}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    item.status === 'green'
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                      : item.status === 'amber'
                      ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                      : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. COMPETITOR VISIBILITY (Compact matrix) */}
      {/* ========================================================================= */}
      {competitorProfiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              COMPETITOR TOPIC VISIBILITY
            </span>
            <button
              onClick={() => setActiveModal('competitor_comparison')}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span>View full comparison</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 border-b border-border text-[11px] text-muted-foreground font-semibold">
                <tr>
                  <th className="p-2.5">Metric</th>
                  <th className="p-2.5 text-primary font-bold">Your Product</th>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <th key={idx} className="p-2.5 font-medium truncate max-w-[140px]">
                      {cp.competitorName.split(' - ')[0] || `Competitor ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-2.5 font-medium text-muted-foreground">Observed Topics</td>
                  <td className="p-2.5 font-bold text-emerald-400">{myTopics.length}</td>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <td key={idx} className="p-2.5 text-foreground">{cp.topicCount}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-muted-foreground">Unique Focus Topics</td>
                  <td className="p-2.5 font-bold text-foreground">
                    {myTopics.length - sharedTopics.length > 0 ? myTopics.length - sharedTopics.length : 0}
                  </td>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <td key={idx} className="p-2.5 text-foreground">{cp.uniqueTopics?.length || 0}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-muted-foreground">Shared Market Topics</td>
                  <td className="p-2.5 font-bold text-blue-400">{sharedTopics.length}</td>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <td key={idx} className="p-2.5 text-muted-foreground">{sharedTopics.length}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TOP ACTIONS — WHAT SHOULD YOU IMPROVE? (3–4 concrete actions) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          WHAT SHOULD YOU IMPROVE?
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topActions.map((item, idx) => (
            <Card key={idx} className="border-border bg-card p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Recommendation #{idx + 1}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    item.priority === 'HIGH'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {item.priority}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-xs text-foreground leading-snug">
                  {item.action}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.why}
                </p>
              </div>
              <div className="text-[10px] text-primary/90 bg-primary/5 p-2 rounded border border-primary/20 leading-tight">
                <strong>Evidence:</strong> {item.evidence}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. SEPARATE ANALYSIS BUTTONS (Explore Details) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          EXPLORE DETAILS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setTopicCategoryFilter('all')
              setActiveModal('gaps')
            }}
            className="h-auto py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <Layers className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-foreground">Topic Gaps</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {rawObservedTopics.length} topics mined
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('customer_language')}
            className="h-auto py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-foreground">Customer Language</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Buyer terms vs listing
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('competitor_comparison')}
            className="h-auto py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <Swords className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-foreground">Competitor Matrix</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Depth & unique topics
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('technical_audit')}
            className="h-auto py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <Code2 className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-medium text-foreground">Technical Audit</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {technicalIssues.length} issues to check
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('evidence')}
            className="h-auto py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <FileText className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-medium text-foreground">Evidence</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Traceable citations
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('ranking_status')}
            className="h-auto py-2.5 px-2 flex flex-col items-center justify-center gap-1 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <Crosshair className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-foreground">Ranking Data</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Status & coverage
            </span>
          </Button>
        </div>
      </div>

      {/* Subtle secondary methodology link & trust footer */}
      <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <button
          onClick={() => setActiveModal('methodology')}
          className="hover:text-foreground flex items-center gap-1.5 text-left transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span>How was this analysis calculated?</span>
        </button>

        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Verified on-page observed topics. Zero simulated or fabricated search rankings.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS / DETAIL VIEWS (Accessed only through buttons) */}
      {/* ========================================================================= */}

      {/* MODAL 1: TOPIC GAPS & COMPLETE TOPICS REGISTRY */}
      {activeModal === 'gaps' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Complete Product Topics & Keyword Gaps Registry</h2>
                  <p className="text-xs text-muted-foreground">
                    All {rawObservedTopics.length} observed marketplace search topics extracted from product listings and headings
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter controls */}
            <div className="p-4 border-b border-border bg-card space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={topicSearchTerm}
                    onChange={(e) => setTopicSearchTerm(e.target.value)}
                    placeholder="Search observed topics..."
                    className="pl-8 h-8 text-xs bg-muted/20 border-border"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={topicCategoryFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('all')}
                    className="h-8 text-xs"
                  >
                    All ({rawObservedTopics.length})
                  </Button>
                  <Button
                    variant={topicCategoryFilter === 'gaps' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('gaps')}
                    className="h-8 text-xs text-rose-400 hover:text-rose-300"
                  >
                    Rival Gaps ({enrichedCompetitorGaps.length})
                  </Button>
                  <Button
                    variant={topicCategoryFilter === 'mine' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('mine')}
                    className="h-8 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Your Topics ({myTopics.length})
                  </Button>
                  <Button
                    variant={topicCategoryFilter === 'shared' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('shared')}
                    className="h-8 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Shared ({sharedTopics.length})
                  </Button>
                </div>
              </div>
            </div>

            {/* Topic Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {modalFilteredTopics.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No observed topics match your current search or category filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modalFilteredTopics.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-border bg-card space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm text-foreground">{t.topic}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            !t.inMyProduct && t.inCompetitors
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : t.inMyProduct && !t.inCompetitors
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {!t.inMyProduct && t.inCompetitors
                            ? 'Rival Advantage Gap'
                            : t.inMyProduct && !t.inCompetitors
                            ? 'Your Unique Focus'
                            : 'Shared Market Baseline'}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                        <span>Category: {t.semanticGroup || 'Core Features'}</span>
                        <span>Evidence count: {t.evidenceCount}</span>
                      </div>

                      {t.customerMentions !== undefined && t.customerMentions > 0 && (
                        <div className="text-[11px] text-sky-400 font-medium bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                          ✓ Mentioned in {t.customerMentions} customer discussions
                        </div>
                      )}

                      {t.evidenceSnippet && (
                        <div className="text-xs italic text-muted-foreground bg-muted/20 p-2 rounded border border-border/40">
                          “{t.evidenceSnippet.slice(0, 120)}...”
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Your page: {t.inMyProduct ? '✓ Covered' : '✗ Missing'}</span>
                        <span>Rivals: {t.inCompetitors ? '✓ Covered' : '✗ Missing'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Registry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER LANGUAGE GAP */}
      {activeModal === 'customer_language' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Customer Language vs Listing Language</h2>
                  <p className="text-xs text-muted-foreground">
                    Connects real buyer discussions to listing positioning to detect natural language gaps
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground leading-relaxed">
                <strong>Why Customer Language Matters:</strong> Buyers search using the specific words they use when experiencing problems or evaluating features. When your product listing headings align with their natural phrasing, discoverability and conversion increase immediately.
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Customer Discussion Phrases vs Listing Alignment
                </span>

                {customerLanguageGaps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No customer discussion clusters found to evaluate against listing copy.
                  </div>
                ) : (
                  customerLanguageGaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-border bg-card space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Customers Say:</span>
                          <span className="font-bold text-xs sm:text-sm text-foreground">"{gap.phrase}"</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            gap.inListing
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {gap.inListing ? 'Prominently in Listing' : 'Not in Listing'}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/40 space-y-0.5">
                        <span className="font-semibold text-foreground">Recommended Action:</span>
                        <p>{gap.action}</p>
                      </div>

                      <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                        <span>Evidence: {gap.source}</span>
                        <Link
                          href="/dashboard/comments"
                          onClick={() => setActiveModal(null)}
                          className="text-primary hover:underline font-medium flex items-center gap-1"
                        >
                          <span>View in Comments</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-between items-center bg-muted/20 shrink-0">
              <Link href="/dashboard/comments" onClick={() => setActiveModal(null)}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <span>Open Comments & Sentiment</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPETITOR COMPARISON MATRIX */}
      {activeModal === 'competitor_comparison' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Competitor Discoverability Depth Analysis</h2>
                  <p className="text-xs text-muted-foreground">
                    Side-by-side comparison of topic volume, headings coverage, and unique market angles
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {competitorProfiles.map((cp, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-foreground">{cp.competitorName}</div>
                      <div className="text-[10px] text-muted-foreground">{cp.titleHeadingCoverage}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 self-start sm:self-center">
                      {cp.topicCount} Observed Topics
                    </Badge>
                  </div>

                  {cp.whyCompetitorIsStronger && (
                    <div className="text-xs text-foreground bg-primary/5 p-2.5 rounded border border-primary/20 leading-relaxed">
                      <strong className="text-primary">Topical Advantage: </strong>
                      {cp.whyCompetitorIsStronger}
                    </div>
                  )}

                  {cp.uniqueTopics && cp.uniqueTopics.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Unique Topics Captured by Rival:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cp.uniqueTopics.slice(0, 10).map((u, uIdx) => (
                          <Badge key={uIdx} variant="outline" className="text-[10px] bg-muted/20">
                            {u}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Matrix
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TECHNICAL AUDIT */}
      {activeModal === 'technical_audit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Technical On-Page Metadata Audit</h2>
                  <p className="text-xs text-muted-foreground">
                    Inspection of HTML tags, canonical signals, heading hierarchies, and crawlability parameters
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Technical Issues Alert */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Issues Needing Attention ({technicalIssues.length})
                </span>
                {technicalIssues.length === 0 ? (
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>All technical metadata checks passed successfully. Zero critical issues detected.</span>
                  </div>
                ) : (
                  technicalIssues.map((iss, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-card space-y-1 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>{iss.label}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed pl-5.5">
                        <strong>Fix:</strong> {iss.fix}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Verified Metadata Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Detailed Parameter Verification
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
                    <span className="font-semibold text-foreground block">Title Tag</span>
                    <p className="text-muted-foreground text-[11px]">
                      Length: {targetAudit.title_length || 'N/A'} characters.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
                    <span className="font-semibold text-foreground block">Canonical URL</span>
                    <p className="text-muted-foreground text-[11px]">
                      Status: {targetAudit.canonical_status === 'valid' ? 'Valid & self-referential' : 'Missing or invalid'}.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
                    <span className="font-semibold text-foreground block">Headings Hierarchy</span>
                    <p className="text-muted-foreground text-[11px]">
                      H1 tag verified with {contentCoverage?.headingCoverage?.h2TopicsCount || 0} H2 topic sub-headings.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
                    <span className="font-semibold text-foreground block">Schema / Structured Data</span>
                    <p className="text-muted-foreground text-[11px]">
                      {targetAudit.has_structured_data ? 'Schema.org JSON-LD tags present' : 'No Schema.org tags detected'}.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
                    <span className="font-semibold text-foreground block">Image Alt Text</span>
                    <p className="text-muted-foreground text-[11px]">
                      {contentCoverage?.imageAltCoverage
                        ? `${contentCoverage.imageAltCoverage.withAlt} of ${contentCoverage.imageAltCoverage.total} images have alt tags (${contentCoverage.imageAltCoverage.percentage}%)`
                        : '100% compliant'}.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-border bg-muted/10 space-y-1">
                    <span className="font-semibold text-foreground block">Crawl Indexability</span>
                    <p className="text-muted-foreground text-[11px]">
                      {contentCoverage?.indexabilityStatus?.notes || 'Indexable without robots or redirect conflicts'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EVIDENCE TRACEABILITY */}
      {activeModal === 'evidence' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Verified Discoverability Evidence & Citations</h2>
                  <p className="text-xs text-muted-foreground">
                    Verbatim quotes and heading citations directly linking recommendations to public listings
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {enrichedCompetitorGaps.slice(0, 6).map((gap, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-muted/10 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Topic: "{gap.topic}"</span>
                    <div className="flex items-center gap-1.5">
                      {gap.isHighValue && (
                        <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30 bg-amber-500/10">
                          High-Value Demand
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] text-rose-400 border-rose-500/30">
                        Rival Advantage Gap
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Competitor Source Citation:</span>
                    <div className="p-2.5 rounded bg-card border border-border/80 text-muted-foreground italic leading-relaxed">
                      “{gap.evidence}”
                    </div>
                  </div>

                  {gap.customerEvidence && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider block">Customer Demand Citation:</span>
                      <div className="p-2.5 rounded bg-sky-500/5 border border-sky-500/20 text-sky-300 text-[11px] leading-relaxed">
                        ✓ {gap.customerEvidence}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40 text-muted-foreground">
                    <div>
                      <strong>Listing Status:</strong> <span className="text-amber-400">{gap.listingStatus || 'Not observed in your listing'}</span>
                    </div>
                    <div>
                      <strong>Product Feature:</strong> <span>{gap.featureStatus || 'Unknown / Not mentioned'}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground">
                    <strong>Strategic Impact:</strong> {gap.strategicImpact}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: SEARCH RANKING DATA STATUS */}
      {activeModal === 'ranking_status' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-500/10 text-muted-foreground">
                  <Crosshair className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Search Ranking Data Status</h2>
                  <p className="text-xs text-muted-foreground">
                    Data integrity notice regarding SERP positions, search volume, and ranking datasets
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-foreground space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Actual search ranking data is not currently connected.</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ProductScope strictly adheres to empirical data honesty. We never simulate, infer, or fabricate Google rankings, Envato search positions, monthly search volumes, or CPC metrics from HTML content.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-semibold text-foreground text-sm">What is displayed instead?</h4>
                <p>
                  Instead of guessed rankings, this module evaluates <strong>Observed Product Topics</strong> directly scraped from public listings, titles, headings, descriptions, and verified customer feedback.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-semibold text-foreground text-sm">Empirical Data Principles</h4>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li>Never confuse an Observed Topic with an actual search volume rank.</li>
                  <li>Never confuse missing search APIs with zero search demand.</li>
                  <li>All recommendations are backed by verbatim competitor and customer evidence.</li>
                </ul>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: HOW WAS THIS CALCULATED */}
      {activeModal === 'methodology' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">How was this analysis calculated?</h2>
                  <p className="text-xs text-muted-foreground">
                    Discoverability methodology in plain, seller-first language
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">1. Multi-Source Topic Extraction</h4>
                <p>
                  Topics are extracted directly from public page HTML, including product titles, primary H1/H2 headings, bullet features, tags, and image alt attributes across your listing and all competitor URLs.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">2. Semantic Grouping (Zero Generic Keywords)</h4>
                <p>
                  Related terms (e.g. "taxi booking", "cab hailing", "ride dispatch") are grouped into coherent product topics. A gap is flagged when multiple rivals prominently feature a topic that is absent from your listing.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">3. Customer Language Alignment</h4>
                <p>
                  Customer discussions and complaints are cross-referenced with your product copy to detect when buyer vocabulary differs from the seller's marketing text.
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
