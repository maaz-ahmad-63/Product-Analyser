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
  Lightbulb,
  Search,
  Flame,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  Award,
  Ban,
  Crosshair,
  TrendingDown,
  FileText,
  Activity,
  Check,
  X,
  Minus,
  ArrowRight,
} from 'lucide-react'
import {
  buildFeatureBattle,
  FeatureBattleCategory,
  FeatureDepth,
  FeatureEvidence,
  FeatureBattleRow,
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

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'table_stakes' | 'advantage' | 'gap' | 'parity'>('ALL')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [showFullMatrix, setShowFullMatrix] = useState<boolean>(false)

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

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* 0. HEADER — FEATURE BATTLE */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40 bg-primary/10">
              FEATURE BATTLE
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {competitorNames.length} Rival{competitorNames.length === 1 ? '' : 's'} Tracked
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {totalMarketFeatures} Market Features Analyzed
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary shrink-0" />
            <span>Feature Battle — Which product has the better feature offering?</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Direct capability benchmark separating genuine differentiators from table stakes and highlighting missing features that customers actually demand.
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
      {/* 1. WHAT IS THE RESULT? (Executive Summary Banner) */}
      {/* ========================================================================= */}
      <Card className="border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
            <Zap className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
              1. What is the Result? (Feature Battle Verdict)
            </span>
            <p className="text-xs sm:text-sm text-foreground font-semibold leading-relaxed">
              Your product has <strong className="text-emerald-400">{summary.featuresYouLead.length} unique capabilities</strong>, while competitors lead on <strong className="text-rose-400">{summary.featuresCompetitorsLead.length} capabilities</strong> that your product does not currently demonstrate.
              {summary.highValueGaps.length > 0 && ` Of those, ${summary.highValueGaps.length} have verified customer complaints or requests.`}
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. KEY NUMBERS */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          2. Key Feature Balance
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Features You Lead */}
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

          {/* Shared Parity */}
          <Card className="border-blue-500/30 bg-blue-500/5 p-3.5">
            <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Shared Parity</span>
            </span>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {summary.parity.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Matched baseline capabilities
            </span>
          </Card>

          {/* Competitors Lead */}
          <Card className="border-rose-500/30 bg-rose-500/5 p-3.5">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              <span>Competitor Leads</span>
            </span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {summary.featuresCompetitorsLead.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Capabilities rivals hold
            </span>
          </Card>

          {/* Table Stakes */}
          <Card className="border-purple-500/30 bg-purple-500/5 p-3.5">
            <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>Table Stakes</span>
            </span>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {summary.tableStakes.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Baseline industry expectations
            </span>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HIGH-IMPACT GAPS (Top 3–5 First) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-rose-400" />
            <span>3. High-Impact Gaps (Missing Competitor Features That Customers Actually Demand)</span>
          </span>
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">
            {summary.highValueGaps.length} Critical Gaps
          </Badge>
        </div>

        {summary.highValueGaps.length === 0 ? (
          <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
            <p className="font-medium text-foreground">Zero Critical Capability Gaps</p>
            <p className="text-[11px]">Competitors do not offer any features that buyers are demanding from your product.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.highValueGaps.slice(0, 4).map((gap, idx) => (
              <Card key={idx} className="border-rose-500/30 bg-card p-4 space-y-2 hover:border-rose-500/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground text-xs">{gap.feature}</span>
                    <div className="text-[10px] text-muted-foreground">
                      Category: <span className="text-foreground font-medium">{gap.category}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold border-rose-500/40 bg-rose-500/10 text-rose-400 shrink-0"
                  >
                    {gap.priority} PRIORITY
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/20 p-2 rounded border border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Rival Adoption:</span>
                    <span className="font-semibold text-foreground">{gap.competitors.length} competitor{gap.competitors.length > 1 ? 's' : ''} ({gap.competitorRatio})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Your Status:</span>
                    <span className="font-semibold text-rose-400">{gap.myProductDepth === 'Missing' ? 'Not Observed' : gap.myProductDepth}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {gap.reason}
                </p>

                <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground border-t border-border/40">
                  <span className="flex items-center gap-1 text-rose-400 font-semibold">
                    <MessageSquare className="h-3 w-3" />
                    {gap.customerMentions} buyer mention{gap.customerMentions > 1 ? 's' : ''}
                  </span>
                  {gap.requestMentions > 0 && (
                    <span>({gap.requestMentions} direct feature request{gap.requestMentions > 1 ? 's' : ''})</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. YOUR ADVANTAGES (Top 3–5 Differentiators) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Award className="h-4 w-4 text-emerald-400" />
            <span>4. Your Product Advantages (Where You Win)</span>
          </span>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
            {summary.myProductAdvantages.length} Verified Differentiators
          </Badge>
        </div>

        {summary.myProductAdvantages.length === 0 ? (
          <Card className="border-border bg-card p-6 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Market Parity Established</p>
            <p className="text-[11px] mt-0.5">Your catalog matches competitor baseline capabilities.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.myProductAdvantages.slice(0, 3).map((adv, idx) => (
              <Card key={idx} className="border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-foreground text-xs">{adv.feature}</span>
                  <DepthBadge depth={adv.myDepth} />
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                  {adv.category}
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {adv.differentiatorReason}
                </p>
                {adv.customerQuote && (
                  <div className="text-[11px] italic text-muted-foreground bg-background/50 p-2 rounded border border-emerald-500/20">
                    “{adv.customerQuote}”
                  </div>
                )}
                <div className="pt-1 text-[10px] text-emerald-400/90 font-medium">
                  Recommendation: Hero marketing hook & sales objection-handler.
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. WHAT SHOULD I DO? (Top 3 Sprint Priorities & Actions) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          5. What Should I Do? (Top 3 Feature Sprint Priorities)
        </span>
        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
          <CardContent className="p-0 divide-y divide-border/60 text-xs">
            {summary.whatThisMeans.top3Priorities.map((item) => (
              <div key={item.rank} className="p-4 flex items-start gap-3 hover:bg-muted/10 transition-colors">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                  #{item.rank}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">{item.feature}</span>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      {item.action}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.evidenceReason}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 6. PROGRESSIVE DISCLOSURE: VIEW FULL FEATURE MATRIX (100+ items) */}
      {/* ========================================================================= */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>6. Full Feature Matrix & Verification Receipts</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Exhaustive side-by-side specification table across all {matrix.length} identified market capabilities.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullMatrix(!showFullMatrix)}
              className="text-xs gap-1.5 h-8 shrink-0"
            >
              {showFullMatrix ? (
                <>
                  <span>Hide Full Matrix</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>View Full Feature Matrix ({matrix.length} features)</span>
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

      {/* Compliance & Provenance Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-4 gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Every feature depth, evidence receipt, and sentiment count backed by public page DOM markup and customer reviews. Zero fabricated data.</span>
        </span>
        <span className="text-right">Feature Battle Intelligence Engine</span>
      </div>
    </div>
  )
}
