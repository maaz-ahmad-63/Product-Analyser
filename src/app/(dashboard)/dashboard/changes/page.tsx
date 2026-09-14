'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Swords,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  Search,
  Flame,
  MessageSquare,
  HelpCircle,
  Award,
  TrendingDown,
  FileText,
  Check,
  X,
  Minus,
  ArrowRight,
  Target,
  ExternalLink,
} from 'lucide-react'
import {
  buildFeatureBattle,
  FeatureDepth,
  FeatureEvidence,
} from '@/services/website-analyzer/feature-analyzer'

// Helper for rendering feature depth badge
function DepthBadge({ depth, label }: { depth: FeatureDepth; label?: string }) {
  const display = label || depth
  switch (depth) {
    case 'Full':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1 py-0.5 px-2"
        >
          <Check className="h-3 w-3 text-emerald-400" />
          <span>{display}</span>
        </Badge>
      )
    case 'Partial':
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-semibold gap-1 py-0.5 px-2"
        >
          <Minus className="h-3 w-3 text-blue-400" />
          <span>{display}</span>
        </Badge>
      )
    case 'Basic':
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold gap-1 py-0.5 px-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>{display}</span>
        </Badge>
      )
    case 'Missing':
      return (
        <Badge
          variant="outline"
          className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] font-semibold gap-1 py-0.5 px-2"
        >
          <X className="h-3 w-3 text-rose-400" />
          <span>{display}</span>
        </Badge>
      )
    case 'Unknown':
    default:
      return (
        <Badge
          variant="outline"
          className="bg-muted/40 text-muted-foreground border-border text-[10px] font-semibold gap-1 py-0.5 px-2"
        >
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
          <span>{display}</span>
        </Badge>
      )
  }
}

// Helper for confidence badge
function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color =
    confidence === 'High'
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : confidence === 'Medium'
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-muted-foreground border-border bg-muted/20'

  return (
    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${color}`}>
      {confidence} Confidence
    </Badge>
  )
}

export default function CompetitorChangesPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()

  // Matrix Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'table_stakes' | 'advantage' | 'gap' | 'parity'>('ALL')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [showFullMatrix, setShowFullMatrix] = useState<boolean>(false)
  const [openFindings, setOpenFindings] = useState<Record<string, boolean>>({})
  const [showMethodology, setShowMethodology] = useState<boolean>(false)

  const myProduct = currentProjectData?.my_product || {}
  const competitors: any[] = currentProjectData?.competitors_data || []
  const commentsAnalysis = currentProjectData?.comments_analysis

  // Build the Feature Battle analysis memoized
  const featureBattle = useMemo(() => {
    return buildFeatureBattle(myProduct, competitors, commentsAnalysis)
  }, [myProduct, competitors, commentsAnalysis])

  const { summary, matrix, categories, totalMarketFeatures } = featureBattle

  // Competitor names list
  const competitorNames = useMemo(() => {
    if (competitors.length > 0) {
      return competitors.map((c: any, idx: number) => c.productName || c.name || `Competitor ${idx + 1}`)
    }
    const namesSet = new Set<string>()
    matrix.forEach((r) => {
      Object.keys(r.competitors).forEach((name) => namesSet.add(name))
    })
    return Array.from(namesSet)
  }, [competitors, matrix])

  // Filtered rows for the Feature Matrix table
  const filteredRows = useMemo(() => {
    return matrix.filter((row) => {
      if (selectedCategory !== 'ALL' && row.category !== selectedCategory) {
        return false
      }
      if (classificationFilter !== 'ALL' && row.classification !== classificationFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = row.feature.toLowerCase().includes(q)
        const matchesCategory = row.category.toLowerCase().includes(q)
        const matchesEvidence =
          row.myProduct.evidence.snippet.toLowerCase().includes(q) ||
          Object.values(row.competitors).some((c) => c.evidence.snippet.toLowerCase().includes(q))
        if (!matchesName && !matchesCategory && !matchesEvidence) {
          return false
        }
      }
      return true
    })
  }, [matrix, selectedCategory, classificationFilter, searchQuery])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleFinding = (id: string) => {
    setOpenFindings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Analyzing competitive specifications & customer sentiment...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Swords className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Select an active workspace above or run an analysis to generate your Product Competitive Feature Matrix.
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

  const myProductName = myProduct.productName || 'Your Product'

  // Construct "WHAT WE FOUND" Dynamic Synthesis
  const topAdvantageNames = summary.myProductAdvantages.slice(0, 2).map((a) => a.feature)
  const topGapNames = summary.highValueGaps.slice(0, 2).map((g) => g.feature)

  let whatWeFoundNarrative = ''
  if (topAdvantageNames.length > 0 && topGapNames.length > 0) {
    whatWeFoundNarrative = `Your product is strong in ${topAdvantageNames.join(' and ')}, while competitors hold an advantage in ${topGapNames.join(' and ')}. The most important gaps to close are the ${summary.highValueGaps.length} capabilities that customers are actively requesting in public discussions.`
  } else if (topAdvantageNames.length > 0) {
    whatWeFoundNarrative = `Your product has ${summary.featuresYouLead.length} exclusive advantages led by ${topAdvantageNames.join(' and ')}, giving you a strong differentiation hook against monitored rivals.`
  } else if (topGapNames.length > 0) {
    whatWeFoundNarrative = `Competitors currently lead in ${summary.featuresCompetitorsLead.length} cataloged features. Focus on the ${summary.highValueGaps.length} customer-backed gaps like ${topGapNames.join(' and ')} where buyer demand is verified.`
  } else {
    whatWeFoundNarrative = `Your product matches competitor baseline capabilities across ${summary.parity.length} shared features. Differentiate by prioritizing custom features requested by customers.`
  }

  // Construct Curated Top 3-5 Findings
  const topFindingsList: Array<{
    id: string
    type: 'gap' | 'advantage'
    title: string
    category: string
    badgeText: string
    facts: string[]
    whyItMatters: string
    evidenceSnippet?: string
    customerQuotes?: string[]
    competitorList?: string[]
    myStatus?: string
  }> = []

  // Add top high-value gaps
  summary.highValueGaps.slice(0, 3).forEach((gap, idx) => {
    topFindingsList.push({
      id: `gap-${idx}`,
      type: 'gap',
      title: gap.feature,
      category: gap.category,
      badgeText: `${gap.priority} PRIORITY GAP`,
      facts: [
        `${gap.competitors.length} competitor${gap.competitors.length > 1 ? 's' : ''} offer this (${gap.competitorRatio})`,
        `${gap.customerMentions} buyer discussions`,
        `${gap.requestMentions} direct feature requests`,
      ],
      whyItMatters: gap.reason || 'Customers are repeatedly asking for this capability in competitor discussions.',
      evidenceSnippet: gap.evidence?.snippet,
      customerQuotes: matrix.find((r) => r.feature === gap.feature)?.customerImportance?.representativeQuotes || [],
      competitorList: gap.competitors,
      myStatus: gap.myProductDepth === 'Missing' ? 'Not detected on your site' : gap.myProductDepth,
    })
  })

  // Add top advantages
  summary.myProductAdvantages.slice(0, 2).forEach((adv, idx) => {
    topFindingsList.push({
      id: `adv-${idx}`,
      type: 'advantage',
      title: adv.feature,
      category: adv.category,
      badgeText: 'YOUR ADVANTAGE',
      facts: [
        `Your product supports this (${adv.myDepth} coverage)`,
        `0 of ${competitorNames.length} monitored competitors offer verified support`,
      ],
      whyItMatters: adv.differentiatorReason || 'Your product holds a verified capability advantage that competitors do not advertise.',
      customerQuotes: adv.customerQuote ? [adv.customerQuote] : [],
      myStatus: `${adv.myDepth} Support`,
    })
  })

  // Construct Curated 3-5 Recommended Actions
  const recommendedActions: Array<{
    rank: number
    title: string
    reason: string
    tag: string
  }> = []

  if (summary.highValueGaps.length > 0) {
    recommendedActions.push({
      rank: 1,
      title: `Prioritize ${summary.highValueGaps[0].feature}`,
      reason: `Customer demand is highest here (${summary.highValueGaps[0].customerMentions} buyer mentions, ${summary.highValueGaps[0].requestMentions} requests).`,
      tag: 'High Buyer Demand',
    })
  }

  if (summary.highValueGaps.length > 1) {
    recommendedActions.push({
      rank: 2,
      title: `Improve ${summary.highValueGaps[1].feature}`,
      reason: `Offered by ${summary.highValueGaps[1].competitors.length} competitors (${summary.highValueGaps[1].competitorRatio}) and represents an active purchasing objection.`,
      tag: 'Competitor Parity',
    })
  } else if (summary.featuresCompetitorsLead.length > 0) {
    recommendedActions.push({
      rank: 2,
      title: `Evaluate ${summary.featuresCompetitorsLead[0]}`,
      reason: 'Competitors currently hold stronger coverage in this capability area.',
      tag: 'Competitive Gap',
    })
  }

  if (summary.myProductAdvantages.length > 0) {
    recommendedActions.push({
      rank: recommendedActions.length + 1,
      title: `Promote ${summary.myProductAdvantages[0].feature}`,
      reason: 'This is one of your verified differentiators that competitors lack. Feature it in hero sales copy and product demos.',
      tag: 'Core Differentiator',
    })
  } else if (summary.featuresYouLead.length > 0) {
    recommendedActions.push({
      rank: recommendedActions.length + 1,
      title: `Highlight ${summary.featuresYouLead[0]}`,
      reason: 'Verified exclusive feature advantage that differentiates your solution in demos.',
      tag: 'Sales Wedge',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40 bg-primary/10">
              Product Intelligence
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {competitorNames.length} Rival{competitorNames.length === 1 ? '' : 's'} Tracked
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {totalMarketFeatures} Capabilities Evaluated
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary shrink-0" />
            <span>Feature Battle</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Clear visibility into what competitors offer, where your product wins, and which gaps matter to buyers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/my-saas">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <span>Sales & Pricing</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. AT A GLANCE */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          1. At a Glance
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Your Advantages */}
          <Card className="border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Award className="h-3 w-3" />
              <span>Your Advantages</span>
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {summary.featuresYouLead.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Capabilities where you lead
            </span>
          </Card>

          {/* Shared Capabilities */}
          <Card className="border-blue-500/30 bg-blue-500/5 p-3.5">
            <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Shared Capabilities</span>
            </span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {summary.parity.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Matched baseline features
            </span>
          </Card>

          {/* Important Competitive Gaps */}
          <Card className="border-rose-500/30 bg-rose-500/5 p-3.5">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              <span>Competitive Gaps</span>
            </span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {summary.featuresCompetitorsLead.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Capabilities rivals offer
            </span>
          </Card>

          {/* Customer-Backed Gaps */}
          <Card className="border-amber-500/30 bg-amber-500/5 p-3.5">
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Flame className="h-3 w-3" />
              <span>Customer-Backed Gaps</span>
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {summary.highValueGaps.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Gaps customers are asking for
            </span>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN COMPETITIVE RESULT ("WHAT WE FOUND") */}
      {/* ========================================================================= */}
      <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0 mt-0.5">
            <Zap className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                2. Main Competitive Result
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-primary border-primary/30">
                WHAT WE FOUND
              </Badge>
            </div>
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {whatWeFoundNarrative}
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. TOP FINDINGS (Top 3–5 Findings) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            <span>3. Top Findings ({topFindingsList.length} Key Takeaways)</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Ranked by customer demand & market advantage
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {topFindingsList.map((finding) => {
            const isExpanded = !!openFindings[finding.id]
            const isGap = finding.type === 'gap'

            return (
              <Card
                key={finding.id}
                className={`p-4 space-y-3 transition-all ${
                  isGap
                    ? 'border-rose-500/30 bg-card hover:border-rose-500/60'
                    : 'border-emerald-500/30 bg-card hover:border-emerald-500/60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${
                        isGap
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {finding.badgeText}
                    </Badge>
                    <h3 className="font-bold text-foreground text-sm leading-snug">
                      {finding.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground block">
                      Category: <strong className="text-foreground">{finding.category}</strong>
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFinding(finding.id)}
                    className="text-xs gap-1 h-7 px-2 text-primary hover:text-primary shrink-0"
                  >
                    <span>{isExpanded ? 'Hide Evidence' : 'View Evidence'}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {/* Facts Strip */}
                <div className="flex flex-wrap gap-2 text-[11px] bg-muted/20 p-2.5 rounded-lg border border-border/50">
                  {finding.facts.map((fact, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-1.5 text-foreground font-medium">
                      <span className={`h-1.5 w-1.5 rounded-full ${isGap ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                      <span>{fact}</span>
                    </div>
                  ))}
                </div>

                {/* Why It Matters */}
                <div className="text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Why It Matters:
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {finding.whyItMatters}
                  </p>
                </div>

                {/* Expandable Evidence Drawer */}
                {isExpanded && (
                  <div className="pt-2 border-t border-border/60 space-y-2.5 animate-fade-in text-xs">
                    {finding.competitorList && finding.competitorList.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Competitors Offering This:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {finding.competitorList.map((cName, cIdx) => (
                            <Badge key={cIdx} variant="secondary" className="text-[10px] py-0 px-1.5">
                              {cName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {finding.evidenceSnippet && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                          Public Listing Reference:
                        </span>
                        <p className="text-[11px] italic bg-muted/30 p-2 rounded border border-border/40 text-foreground/90">
                          "{finding.evidenceSnippet}"
                        </p>
                      </div>
                    )}

                    {finding.customerQuotes && finding.customerQuotes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>Customer Feedback Quotes:</span>
                        </span>
                        <div className="space-y-1">
                          {finding.customerQuotes.slice(0, 2).map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="text-[11px] italic bg-amber-500/5 p-2 rounded border border-amber-500/20 text-muted-foreground"
                            >
                              “{q}”
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {finding.myStatus && (
                      <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
                        <span>Your Current Status:</span>
                        <strong className="text-foreground">{finding.myStatus}</strong>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECOMMENDED ACTIONS ("WHAT SHOULD YOU DO?") */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            4. Recommended Actions
          </span>
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
            WHAT SHOULD YOU DO?
          </Badge>
        </div>

        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/10">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Prioritized Tactical Moves</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Direct recommendations derived from verified competitor advantages and buyer request volumes.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-border/60 text-xs">
            {recommendedActions.map((action) => (
              <div key={action.rank} className="p-4 flex items-start gap-3 hover:bg-muted/10 transition-colors">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                  #{action.rank}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground text-xs">{action.title}</span>
                    <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                      {action.tag}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {action.reason}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 5. FULL FEATURE MATRIX (Progressive Disclosure) */}
      {/* ========================================================================= */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  Full Feature Matrix & Verification Evidence
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Investigate all {matrix.length} market capabilities across categories, competitor depth ratings, and evidence quotes.
              </CardDescription>
            </div>
            <Button
              variant={showFullMatrix ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setShowFullMatrix(!showFullMatrix)}
              className="text-xs gap-1.5 h-8 shrink-0 font-semibold"
            >
              {showFullMatrix ? (
                <>
                  <span>Hide Full Matrix</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>Explore Full Feature Battle ({matrix.length} features)</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {showFullMatrix && (
          <CardContent className="p-4 space-y-4 animate-fade-in text-xs">
            {/* Search & Status Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search across capabilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/20 border-border"
                />
              </div>

              {/* Classification Pill Filters */}
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/60 text-xs">
                {(
                  [
                    { id: 'ALL', label: 'All' },
                    { id: 'advantage', label: 'Advantages' },
                    { id: 'gap', label: 'Gaps' },
                    { id: 'table_stakes', label: 'Table Stakes' },
                    { id: 'parity', label: 'Parity' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setClassificationFilter(tab.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      classificationFilter === tab.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-thin">
              <Button
                variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('ALL')}
                className="h-6 text-[10px] px-2.5 shrink-0 rounded-full"
              >
                All Categories ({matrix.length})
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.name}
                  variant={selectedCategory === cat.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.name)}
                  className="h-6 text-[10px] px-2.5 shrink-0 rounded-full gap-1"
                >
                  <span>{cat.name}</span>
                  <span className="opacity-70">({cat.count})</span>
                </Button>
              ))}
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 w-[280px]">Feature & Category</th>
                    <th className="py-3 px-3 w-[150px] bg-primary/5 border-x border-primary/20 text-primary font-bold">
                      {myProductName} (You)
                    </th>
                    {competitorNames.map((cName) => (
                      <th key={cName} className="py-3 px-3 min-w-[130px]">
                        {cName}
                      </th>
                    ))}
                    <th className="py-3 px-3 w-[180px]">Customer Demand</th>
                    <th className="py-3 px-3 w-[80px] text-center">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRows.map((row) => {
                    const isExpanded = !!expandedRows[row.id]
                    const hasQuotes = row.customerImportance.representativeQuotes.length > 0

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => toggleRow(row.id)}
                          className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                            isExpanded ? 'bg-muted/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground text-xs">{row.feature}</span>
                                {row.isGenuineDifferentiator && (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] px-1 py-0 font-bold">
                                    Differentiator
                                  </Badge>
                                )}
                                {row.isHighValueGap && (
                                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[9px] px-1 py-0 font-bold">
                                    High-Value Gap
                                  </Badge>
                                )}
                                {row.classification === 'table_stakes' && (
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[9px] px-1 py-0 font-medium">
                                    Table Stakes
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground block">{row.category}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 bg-primary/5 border-x border-primary/20">
                            <DepthBadge depth={row.myProduct.depth} />
                          </td>

                          {competitorNames.map((cName) => {
                            const compData = row.competitors[cName]
                            const depth = compData?.depth || 'Unknown'
                            return (
                              <td key={cName} className="py-3 px-3">
                                <DepthBadge depth={depth} />
                              </td>
                            )
                          })}

                          <td className="py-3 px-3">
                            {row.customerImportance.customerMentions > 0 ? (
                              <div className="space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    row.customerImportance.importanceScore === 'HIGH'
                                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 font-bold'
                                      : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                  }`}
                                >
                                  <Flame className="h-3 w-3 mr-0.5" />
                                  {row.customerImportance.customerMentions} mention{row.customerImportance.customerMentions > 1 ? 's' : ''}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                No mentions
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-muted/10 border-b border-border/60">
                            <td colSpan={competitorNames.length + 4} className="p-4">
                              <div className="space-y-3 bg-background/60 rounded-lg p-4 border border-border/80">
                                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    <span>Evidence Receipts for "{row.feature}"</span>
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    Verdict: <strong className="text-foreground">{row.conclusion}</strong>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                  <div className="p-3 rounded-md bg-primary/5 border border-primary/20 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-primary">{myProductName}</span>
                                      <ConfidenceBadge confidence={row.myProduct.evidence.confidence} />
                                    </div>
                                    <p className="text-xs italic text-foreground/90 bg-muted/30 p-2 rounded border border-border/40">
                                      "{row.myProduct.evidence.snippet}"
                                    </p>
                                  </div>

                                  {competitorNames.map((cName) => {
                                    const compData = row.competitors[cName]
                                    const ev = compData?.evidence || {
                                      snippet: 'No public mention detected',
                                      confidence: 'Unknown',
                                    }
                                    return (
                                      <div key={cName} className="p-3 rounded-md bg-card border border-border space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-foreground">{cName}</span>
                                          <ConfidenceBadge confidence={ev.confidence} />
                                        </div>
                                        <p className="text-xs italic text-foreground/90 bg-muted/20 p-2 rounded border border-border/40">
                                          "{ev.snippet}"
                                        </p>
                                      </div>
                                    )
                                  })}
                                </div>

                                {hasQuotes && (
                                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3 text-amber-400" />
                                      <span>Customer Feedback Quotes</span>
                                    </span>
                                    <div className="space-y-1.5">
                                      {row.customerImportance.representativeQuotes.map((q, qIdx) => (
                                        <div
                                          key={qIdx}
                                          className="text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-border/40 italic"
                                        >
                                          “{q}”
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 6. METHODOLOGY & DATA PROVENANCE (Collapsible) */}
      {/* ========================================================================= */}
      <div className="border border-border/60 rounded-xl bg-card/50 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-foreground">How was this calculated?</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>{showMethodology ? 'Hide methodology' : 'Learn more'}</span>
            {showMethodology ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </button>

        {showMethodology && (
          <div className="p-4 pt-0 border-t border-border/60 space-y-2 text-muted-foreground text-xs leading-relaxed">
            <p>
              Features are extracted directly from public product websites, official specification tables, and documentation. Depth is verified against published page markup.
            </p>
            <p>
              Customer demand is calculated by counting explicit feature requests and complaints across verified marketplace reviews. Unmentioned capabilities are marked <strong>Unknown</strong> rather than assumed Missing unless corroborated by buyer feedback.
            </p>
            <p className="text-[11px] text-foreground/80 font-medium">
              Zero fabricated data. Every result traces directly to public web sources and verified review quotes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
