'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Swords,
  ExternalLink,
  DollarSign,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  TrendingUp,
  Check,
  Plus,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Target,
  Trophy,
  MessageSquare,
  Trash2,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { sanitizeFeatureList } from '@/services/website-analyzer/feature-analyzer'

function formatPriceString(val: any): string {
  if (!val) return 'Not available'
  const str = String(val).trim()
  if (/^(\$|₹|€|£|Rs\.?|¥)/i.test(str)) return str
  return typeof val === 'number' ? `$${val}` : `$${str}`
}

function getProductPrice(prod?: any): string {
  if (!prod) return 'Not available'
  const ep = prod.envatoSales?.product_price || prod.envatoSales?.price
  if (ep) return formatPriceString(ep)
  const pp = prod.pricingPlans?.[0]
  if (pp) {
    const raw = pp.price || pp.pricePerMonth || pp.priceMonthly || pp.priceAnnual
    if (raw) return formatPriceString(raw)
  }
  return 'Not available'
}

function getNumericPrice(prod?: any): number | null {
  if (!prod) return null
  const ep = prod.envatoSales?.product_price || prod.envatoSales?.price
  if (ep) {
    const n = parseFloat(String(ep).replace(/[^0-9.]/g, ''))
    if (!isNaN(n)) return n
  }
  const pp = prod.pricingPlans?.[0]
  if (pp) {
    const raw = pp.price || pp.pricePerMonth || pp.priceMonthly || pp.priceAnnual
    if (raw) {
      const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''))
      if (!isNaN(n)) return n
    }
  }
  return null
}

function getProductSales(prod?: any): string {
  if (!prod) return 'Not available'
  const s = prod.envatoSales?.current_total_sales ?? prod.envatoSales?.totalSales ?? prod.envatoSales?.total_sales
  if (s !== null && s !== undefined && typeof s === 'number') {
    return s.toLocaleString()
  }
  return 'Not available'
}

function getProductSalesNumber(prod?: any): number {
  if (!prod) return 0
  const s = prod.envatoSales?.current_total_sales ?? prod.envatoSales?.totalSales ?? prod.envatoSales?.total_sales
  return typeof s === 'number' ? s : 0
}

function getProductRating(prod?: any): string {
  if (!prod) return 'Not available'
  const r = prod.envatoSales?.rating
  if (r !== null && r !== undefined && typeof r === 'number') {
    return r.toFixed(1)
  }
  return 'Not available'
}

function getProductCommentsCount(prod?: any, commentsAnalysis?: any): string {
  if (!prod) return '0'
  const summaries: any[] = commentsAnalysis?.summaries || commentsAnalysis?.competitor_summaries || []
  const found = summaries.find((s: any) =>
    (prod.url && s.product_url === prod.url) ||
    (prod.productName && s.product_name && (s.product_name.toLowerCase().includes(prod.productName.toLowerCase().slice(0, 15)) || prod.productName.toLowerCase().includes(s.product_name.toLowerCase().slice(0, 15))))
  )
  const analyzed = found?.total_comments ?? (prod.comments?.length || 0)
  const marketplace = prod.envatoSales?.comment_count
  if (marketplace && marketplace > analyzed) {
    return `${analyzed} / ${marketplace}`
  }
  if (analyzed > 0) return `${analyzed}`
  if (marketplace) return `${marketplace}`
  return '0'
}

export default function CompetitorsPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects, refreshProjects } = useProject()
  const [showFullTelemetry, setShowFullTelemetry] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showBsrModal, setShowBsrModal] = useState(false)
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('')
  const [addingCompetitor, setAddingCompetitor] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [removingUrl, setRemovingUrl] = useState<string | null>(null)

  // Escape key & body scroll lock for BSR modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBsrModal(false)
        setIsAddModalOpen(false)
      }
    }
    if (showBsrModal || isAddModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showBsrModal, isAddModalOpen])

  const handleRemoveCompetitor = async (competitorUrl: string) => {
    if (!currentProjectId || !competitorUrl) return
    if (!confirm('Are you sure you want to remove this competitor? The market analysis, SEO, features, and opportunities will immediately recalculate without it.')) return

    setRemovingUrl(competitorUrl)
    try {
      const res = await fetch(`/api/analyze/${currentProjectId}/competitors?url=${encodeURIComponent(competitorUrl)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove competitor')
      }
      if (refreshProjects) {
        await refreshProjects()
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove competitor')
    } finally {
      setRemovingUrl(null)
    }
  }

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompetitorUrl.trim() || !currentProjectId) return

    setAddingCompetitor(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await fetch(`/api/analyze/${currentProjectId}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_url: newCompetitorUrl.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add competitor')
      }

      setActionSuccess('Competitor successfully analyzed and added to workspace!')
      setNewCompetitorUrl('')
      if (refreshProjects) {
        await refreshProjects()
      }
      setTimeout(() => {
        setIsAddModalOpen(false)
        setActionSuccess(null)
      }, 1400)
    } catch (err: any) {
      setActionError(err.message || 'Failed to add competitor')
    } finally {
      setAddingCompetitor(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading competitor intelligence...
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
          Select an active workspace above or run a competitive analysis to track competitor pricing, features, and sales telemetry.
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

  const projectName = currentProjectMeta?.name || 'Active Project'
  const myProduct = currentProjectData?.my_product || {}
  const competitors: any[] = currentProjectData?.competitors_data || []
  const comparison = currentProjectData?.comparison || {}
  const commentsAnalysis = currentProjectData?.comments_analysis || {}
  const totalCommentsIndexed = commentsAnalysis.total_analyzed || (commentsAnalysis.all_comments?.length || 0)
  const metaCompetitors = currentProjectMeta?.competitors || []
  const hasCompetitorData = competitors.length > 0

  const isAmazonWorkspace =
    currentProjectMeta?.platform === 'amazon' ||
    Boolean(myProduct.url && /amazon\.[a-z.]+/i.test(myProduct.url))
  const marketPosition = comparison.marketPosition
  const hasBsr = Boolean(
    isAmazonWorkspace &&
    marketPosition &&
    (marketPosition.myRank !== null || marketPosition.competitorBsrs?.some((c: any) => c.rank !== null))
  )

  const competitorPrices = competitors
    .map(getNumericPrice)
    .filter((p): p is number => p !== null && p > 0)
  
  const avgCompetitorPrice = competitorPrices.length > 0
    ? (competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length).toFixed(0)
    : null

  const targetPriceNum = getNumericPrice(myProduct)

  // Find Sales Leader
  let salesLeader = competitors.length > 0 ? competitors[0] : null
  let maxSales = -1
  for (const comp of competitors) {
    const sales = getProductSalesNumber(comp)
    if (sales > maxSales) {
      maxSales = sales
      salesLeader = comp
    }
  }
  const salesLeaderName = salesLeader ? (salesLeader.productName || salesLeader.websiteTitle || 'Leading Competitor') : 'None'

  // Total features across competitors
  const totalCompetitorFeatures = competitors.reduce((acc, c) => acc + sanitizeFeatureList(c.features).length, 0)
  const myExclusiveCount = comparison.myExclusiveFeatures?.length || 0
  const competitorExclusiveCount = comparison.competitorExclusiveFeatures?.length || 0

  // 1. Natural Language Business Summary
  const businessSummary = hasCompetitorData
    ? `Tracking ${competitors.length} competitor${competitors.length === 1 ? '' : 's'} in your market. ${
        maxSales > 0 ? `${salesLeaderName} leads in total sales volume (${maxSales.toLocaleString()}+ sales), ` : ''
      }while average competitor price sits at ${avgCompetitorPrice ? `$${avgCompetitorPrice}` : 'market standard'}. You hold ${myExclusiveCount} exclusive feature advantage${myExclusiveCount === 1 ? '' : 's'} that rivals lack.`
    : `Single-product scan active. Add competitor URLs to generate side-by-side market benchmarks and sales intelligence.`

  // 3. Main Insight
  const mainInsight = hasCompetitorData
    ? targetPriceNum && avgCompetitorPrice
      ? Number(targetPriceNum) < Number(avgCompetitorPrice)
        ? `Your product has a pricing advantage at $${targetPriceNum}, undercutting the competitor average ($${avgCompetitorPrice}) by $${(Number(avgCompetitorPrice) - Number(targetPriceNum)).toFixed(0)}. Your primary growth lever is conversion on value-sensitive buyers.`
        : `Your product is positioned at a premium ($${targetPriceNum}) compared to the competitor average ($${avgCompetitorPrice}). Justify your price tier using your ${myExclusiveCount} exclusive capabilities.`
      : `Competitors offer ${totalCompetitorFeatures} cataloged capabilities across ${competitors.length} tracked offerings.`
    : 'Add competitor URLs to uncover their pricing models, feature offerings, and sales volume.'

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
              Competitor Intelligence
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {competitors.length} Rival{competitors.length === 1 ? '' : 's'} Tracked
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {projectName}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary shrink-0" />
            <span>Competitor Tracking & Moves</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            What competitors are doing, how they are priced, how much they sell, and where you win.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setActionError(null)
              setActionSuccess(null)
              setIsAddModalOpen(true)
            }}
            className="gap-1.5 text-xs shadow-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Competitor</span>
          </Button>

          <Link href="/dashboard/changes">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Feature Battle →</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* LEVEL 1: WHAT IS HAPPENING? (Natural Language Business Summary) */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block">
              1. What Is Happening?
            </span>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {businessSummary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MARKET POSITION (BSR) — Platform-Gated for Amazon Workspaces (Phase 2) */}
      {hasBsr && (
        <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider text-primary border-primary/30">
                  MARKET POSITION
                </Badge>
                {marketPosition?.myCategory && (
                  <span className="text-xs text-muted-foreground">
                    Category: <strong className="text-foreground">{marketPosition.myCategory}</strong>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-baseline gap-5 pt-0.5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Your BSR
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {marketPosition?.myBsrFormatted}
                  </span>
                </div>
                <div className="border-l border-border pl-5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Competitor BSR Range
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {marketPosition?.competitorBsrRange || marketPosition?.marketRange}
                  </span>
                </div>
                {(marketPosition?.bestObservedCompetitor || marketPosition?.strongestCompetitor) && (
                  <div className="border-l border-border pl-5 hidden sm:block">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Best Observed Competitor Rank
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {(marketPosition.bestObservedCompetitor || marketPosition.strongestCompetitor)?.name} ({(marketPosition.bestObservedCompetitor || marketPosition.strongestCompetitor)?.bsrFormatted})
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {marketPosition?.relativePositionText}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBsrModal(true)}
              className="shrink-0 gap-1.5 text-xs h-8 border-primary/40 hover:bg-primary/10"
            >
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>View BSR Details</span>
            </Button>
          </div>
        </Card>
      )}

      {/* LEVEL 2: KEY NUMBERS (3-5 Key Metrics) */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          2. Market Key Numbers
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Rivals Tracked
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {competitors.length || metaCompetitors.length || 0}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              verified competitors
            </span>
          </Card>

          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Avg Market Price
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {avgCompetitorPrice ? `$${avgCompetitorPrice}` : 'Unlisted'}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {targetPriceNum && avgCompetitorPrice
                ? Number(targetPriceNum) < Number(avgCompetitorPrice)
                : 'competitor average'}
            </span>
          </Card>

          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              {isAmazonWorkspace ? 'Top Purchase Signal' : 'Sales Volume Leader'}
            </span>
            <div className="text-base font-bold text-foreground mt-1 truncate" title={salesLeaderName}>
              {salesLeaderName}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {isAmazonWorkspace
                ? (maxSales > 0 ? `${maxSales.toLocaleString()}+ bought in past month` : 'Not publicly observed')
                : (maxSales > 0 ? `${maxSales.toLocaleString()} total sales` : 'Market established')}
            </span>
          </Card>

          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              {isAmazonWorkspace ? 'Reviews Analyzed' : 'Total Comments'}
            </span>
            <div className="text-2xl font-bold text-primary mt-1 flex items-center gap-1.5">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>{totalCommentsIndexed || '0'}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {isAmazonWorkspace ? 'customer reviews analyzed' : 'discussions analyzed'}
            </span>
          </Card>

          <Card className="border-border bg-card p-3.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Your Exclusive Moat
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {myExclusiveCount}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              features rivals lack
            </span>
          </Card>
        </div>
      </div>

      {/* LEVEL 3: MAIN INSIGHT (1 Core Finding) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>3. Core Competitive Finding</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-2">
          <p className="text-foreground text-xs leading-relaxed font-medium">
            {mainInsight}
          </p>
          <div className="flex items-center gap-3 pt-2 text-[11px] text-muted-foreground">
            <span>Market positioning status: <strong className="text-foreground">{targetPriceNum && avgCompetitorPrice && Number(targetPriceNum) < Number(avgCompetitorPrice) ? 'Value Challenger' : 'Feature Leader'}</strong></span>
            <span>·</span>
            <Link href="/dashboard/my-saas" className="text-primary hover:underline">
              Review full sales & pricing telemetry →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* LEVEL 4: IMPORTANT EVIDENCE (Competitor Profiles: 1 Card per Competitor) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            4. Competitor Profiles ({competitors.length} Monitored)
          </span>
          <Link href="/dashboard/changes">
            <Button variant="ghost" size="xs" className="text-xs gap-1 text-primary">
              Compare Full Features <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {!hasCompetitorData ? (
          <Card className="border-dashed border-border/80 bg-card/40 p-8 text-center space-y-4">
            <div className="p-3 rounded-full bg-primary/10 w-12 h-12 mx-auto flex items-center justify-center text-primary">
              <Swords className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">No Competitors Monitored in this Project</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Add competitor product URLs to see their sales figures, pricing, and feature comparison side-by-side.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add First Competitor
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((comp, idx) => {
              const compName = comp.productName || comp.websiteTitle || `Competitor ${idx + 1}`
              const compUrl = comp.url || '#'
              const compPrice = getProductPrice(comp)
              const compSales = getProductSales(comp)
              const compRating = getProductRating(comp)
              const cleanFeatures = sanitizeFeatureList(comp.features)
              const isLeader = comp === salesLeader && maxSales > 0

              return (
                <Card key={idx} className="border-border bg-card flex flex-col justify-between hover:border-border/80 transition-all">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            Rival #{idx + 1}
                          </Badge>
                          {isLeader && (
                            <Badge variant="warning" className="text-[9px] gap-1 py-0 px-1.5">
                              <Trophy className="h-2.5 w-2.5 text-amber-500" />
                              Sales Leader
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {compName}
                        </CardTitle>
                        {comp.url && (
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono truncate max-w-[240px]"
                          >
                            <span className="truncate">{comp.url}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold">List Price</span>
                        <span className="text-base font-bold text-foreground">{compPrice}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-3 text-xs flex-1">
                    {/* Key Stats Row */}
                    <div className="grid grid-cols-4 gap-2 p-2 rounded bg-muted/20 border border-border/40 text-center text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">{isAmazonWorkspace ? 'Purchase Signal' : 'Sales Volume'}</span>
                        <span className="font-semibold text-foreground">
                          {isAmazonWorkspace
                            ? ((comp as any)?.amazonPurchaseBadge || (compSales !== 'Not available' && compSales !== '0' ? `${compSales}+ bought` : 'Not publicly observed'))
                            : compSales}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Buyer Rating</span>
                        <span className="font-semibold text-foreground flex items-center justify-center gap-0.5">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {compRating}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">{isAmazonWorkspace ? 'Reviews' : 'Total Comments'}</span>
                        <span className="font-semibold text-foreground flex items-center justify-center gap-1">
                          <MessageSquare className="h-3 w-3 text-primary" />
                          {getProductCommentsCount(comp, commentsAnalysis)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Features</span>
                        <span className="font-semibold text-foreground">{cleanFeatures.length}</span>
                      </div>
                    </div>

                    {/* What they emphasize (Strength) */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Core Offering / Tagline
                      </span>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                        {comp.description || comp.websiteTitle || 'No public tagline indexed.'}
                      </p>
                    </div>

                    {/* Detected Highlights */}
                    {cleanFeatures.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                          Key Capabilities
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {cleanFeatures.slice(0, 3).map((f: string, fIdx: number) => (
                            <Badge key={fIdx} variant="secondary" className="text-[10px] py-0 px-1.5">
                              {f}
                            </Badge>
                          ))}
                          {cleanFeatures.length > 3 && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground">
                              +{cleanFeatures.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs bg-muted/10">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">
                        Scraped from public source
                      </span>
                      {comp.url && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCompetitor(comp.url)}
                          disabled={removingUrl === comp.url}
                          className="text-[10px] text-muted-foreground hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Remove competitor from project analysis"
                        >
                          {removingUrl === comp.url ? (
                            <RotateCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-2.5 w-2.5" />
                          )}
                          <span>{removingUrl === comp.url ? 'Removing...' : 'Remove'}</span>
                        </button>
                      )}
                    </div>
                    <Link href="/dashboard/changes">
                      <Button variant="ghost" size="xs" className="h-6 text-[11px] gap-1 text-primary">
                        Battle Features <ArrowRight className="h-2.5 w-2.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* LEVEL 5: WHAT SHOULD I DO? (3 Concrete Actions) */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          5. What Should I Do? (Top 3 Tactical Actions)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-border bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Check className="h-3.5 w-3.5" />
              <span>1. Leverage Price Position</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {targetPriceNum && avgCompetitorPrice && Number(targetPriceNum) < Number(avgCompetitorPrice)
                ? `Highlight your $${(Number(avgCompetitorPrice) - Number(targetPriceNum)).toFixed(0)} price advantage prominently in top-of-funnel ads and comparison pages.`
                : 'Offer flexible billing or add-on bundles to differentiate against competitor standard rates.'}
            </p>
          </Card>

          <Card className="border-border bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Target className="h-3.5 w-3.5" />
              <span>2. Promote Exclusive Features</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {myExclusiveCount > 0
                ? `Put your ${myExclusiveCount} exclusive capabilities front-and-center on your homepage to immediately establish superior value.`
                : 'Explore Feature Battle to identify unmet buyer needs and expand differentiation.'}
            </p>
          </Card>

          <Card className="border-border bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>3. Target Rival Dissatisfaction</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Review customer comment complaints from {salesLeaderName} to intercept switching buyers looking for better alternatives.
            </p>
          </Card>
        </div>
      </div>

      {/* LEVEL 6: RAW TELEMETRY BENCHMARK TABLE (Progressive Disclosure) */}
      <Card className="border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowFullTelemetry(!showFullTelemetry)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                6. Complete Market Benchmark Matrix
              </span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                {competitors.length + 1} products
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct side-by-side comparison of list pricing, sales volume, rating, total comments, and features.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary font-medium">
            <span>{showFullTelemetry ? 'Hide Details' : 'View Full Table'}</span>
            {showFullTelemetry ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showFullTelemetry && (
          <div className="p-4 pt-0 border-t border-border/60 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">{isAmazonWorkspace ? 'Current Price' : 'List Price'}</th>
                    <th className="py-2.5 px-4">{isAmazonWorkspace ? 'Purchase Signal (Past Month)' : 'Sales Volume'}</th>
                    <th className="py-2.5 px-4">Rating</th>
                    <th className="py-2.5 px-4">{isAmazonWorkspace ? 'Reviews Analyzed' : 'Total Comments'}</th>
                    <th className="py-2.5 px-4">Features Detected</th>
                    <th className="py-2.5 px-4 text-right">Source Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Target Product */}
                  <tr className="bg-primary/5 font-medium">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <div>
                          <span className="font-bold text-foreground">
                            {myProduct.productName || currentProjectMeta?.ownProduct?.name || 'Your SaaS Product'}
                          </span>
                          <Badge variant="outline" className="ml-2 text-[9px] py-0 px-1 text-primary border-primary/40">
                            Your Product
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {getProductPrice(myProduct)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {isAmazonWorkspace
                        ? ((myProduct as any)?.amazonPurchaseBadge || (getProductSales(myProduct) !== 'Not available' ? `${getProductSales(myProduct)}+ bought` : 'Not publicly observed'))
                        : getProductSales(myProduct)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-foreground">{getProductRating(myProduct)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span>{getProductCommentsCount(myProduct, commentsAnalysis)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {sanitizeFeatureList(myProduct.features).length} features
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href="/dashboard/reviews">
                        <Button variant="ghost" size="xs" className="h-6 text-[11px] gap-1">
                          {isAmazonWorkspace ? 'Reviews' : 'Comments'} <ArrowRight className="h-2.5 w-2.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>

                  {/* Competitors */}
                  {competitors.map((comp, idx) => {
                    const compName = comp.productName || comp.websiteTitle || `Competitor ${idx + 1}`
                    return (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                            <div>
                              <span className="font-semibold text-foreground">{compName}</span>
                              {comp.url && (
                                <a
                                  href={comp.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[10px] text-muted-foreground hover:text-primary truncate max-w-[200px]"
                                >
                                  {comp.url}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {getProductPrice(comp)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {isAmazonWorkspace
                            ? ((comp as any)?.amazonPurchaseBadge || (getProductSales(comp) !== 'Not available' && getProductSales(comp) !== '0' ? `${getProductSales(comp)}+ bought` : 'Not publicly observed'))
                            : getProductSales(comp)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span className="font-semibold text-foreground">{getProductRating(comp)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{getProductCommentsCount(comp, commentsAnalysis)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {sanitizeFeatureList(comp.features).length} features
                        </td>
                        <td className="py-3 px-4 text-right">
                          {comp.url ? (
                            <a href={comp.url} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="xs" className="h-6 text-[11px] gap-1">
                                Source <ExternalLink className="h-2.5 w-2.5" />
                              </Button>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Methodology note */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Competitor Data Provenance & Methodology</span>
              </div>
              <p>
                Pricing, feature lists, and sales volumes are collected strictly from public web endpoints, published pricing tiers, and marketplace APIs. Missing public data is transparently noted rather than assumed.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ADD COMPETITOR MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>Add Competitor to {projectName}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={addingCompetitor}
                className="text-muted-foreground hover:text-foreground text-sm font-bold px-1.5 py-0.5 rounded hover:bg-muted/30"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter another public Envato or SaaS product URL. It will be scraped in real time and benchmarked against your product across sales, pricing, features, and SEO.
            </p>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddCompetitor} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                  Competitor Product URL
                </label>
                <Input
                  type="url"
                  placeholder="https://codecanyon.net/item/competitor-name/12345678"
                  value={newCompetitorUrl}
                  onChange={(e) => setNewCompetitorUrl(e.target.value)}
                  disabled={addingCompetitor}
                  required
                  className="text-xs h-9"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addingCompetitor}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addingCompetitor || !newCompetitorUrl.trim()}
                  className="text-xs gap-1.5"
                >
                  {addingCompetitor ? (
                    <>
                      <RotateCw className="h-3 w-3 animate-spin" />
                      <span>Scraping & Benchmarking...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      <span>Add & Benchmark</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BSR MARKET POSITION DETAILS MODAL (Phase 2) */}
      {/* ========================================================================= */}
      {showBsrModal && marketPosition && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBsrModal(false)
          }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-start justify-between gap-3 bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold tracking-wider text-primary border-primary/30 bg-primary/10">
                    BSR MARKET POSITION
                  </Badge>
                  {marketPosition.myCategory && (
                    <Badge variant="secondary" className="text-[10px]">
                      {marketPosition.myCategory}
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Best Sellers Rank & Relative Market Positioning
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Public Best Sellers Rank (BSR) comparison across your product and all added competitors. Note: BSR reflects relative sales velocity on Amazon and is never fabricated or converted into units/revenue.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBsrModal(false)}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary Bar */}
            <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Your BSR:</span>{' '}
                  <strong className="text-foreground">{marketPosition.myBsrFormatted}</strong>
                </div>
                <div className="border-l border-border pl-4">
                  <span className="text-muted-foreground">Competitor BSR Range:</span>{' '}
                  <strong className="text-primary">{marketPosition.competitorBsrRange || marketPosition.marketRange}</strong>
                </div>
                {(marketPosition.bestObservedCompetitor || marketPosition.strongestCompetitor) && (
                  <div className="border-l border-border pl-4 hidden sm:block">
                    <span className="text-muted-foreground">Best Observed Competitor:</span>{' '}
                    <strong className="text-foreground">
                      {(marketPosition.bestObservedCompetitor || marketPosition.strongestCompetitor)?.name} ({(marketPosition.bestObservedCompetitor || marketPosition.strongestCompetitor)?.bsrFormatted})
                    </strong>
                  </div>
                )}
              </div>
              <span className="text-muted-foreground italic">
                {marketPosition.historicalObservationsNote}
              </span>
            </div>

            {/* Competitor-by-Competitor Evidence List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {/* Target Product Entry */}
              <Card className="border-primary/40 bg-primary/5 p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        YOUR PRODUCT
                      </Badge>
                      <span className="font-bold text-sm text-foreground">
                        {myProduct.productName || 'Your Product'}
                      </span>
                    </div>
                    {myProduct.url && (
                      <span className="text-[11px] text-muted-foreground block truncate max-w-md">
                        {myProduct.url}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Observed BSR
                      </span>
                      <span className="text-base font-bold text-primary">
                        {marketPosition.myBsrFormatted}
                      </span>
                    </div>
                    {marketPosition.myCategory && (
                      <div className="border-l border-border pl-3 text-left">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Category
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {marketPosition.myCategory}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {myProduct.amazonBsr?.subcategories && myProduct.amazonBsr.subcategories.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Subcategories:</span>
                    {myProduct.amazonBsr.subcategories.map((sub: any, sIdx: number) => (
                      <Badge key={sIdx} variant="outline" className="text-[10px]">
                        {sub.rankFormatted} in {sub.category}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>

              {/* Competitors Entries */}
              {(marketPosition.competitorBsrs || []).map((comp: any, idx: number) => (
                <Card key={idx} className="border-border bg-card p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          COMPETITOR {idx + 1}
                        </Badge>
                        <span className="font-bold text-sm text-foreground">
                          {comp.name}
                        </span>
                        {comp.relativeRank && (
                          <Badge variant="secondary" className="text-[10px]">
                            Rank #{comp.relativeRank}
                          </Badge>
                        )}
                      </div>
                      {comp.url && (
                        <span className="text-[11px] text-muted-foreground block truncate max-w-md">
                          {comp.url}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Observed BSR
                        </span>
                        <span className={`text-base font-bold ${comp.rank !== null ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {comp.bsrFormatted}
                        </span>
                      </div>
                      {comp.category && (
                        <div className="border-l border-border pl-3 text-left">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Category
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {comp.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {comp.subcategories && comp.subcategories.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Subcategories:</span>
                      {comp.subcategories.map((sub: any, sIdx: number) => (
                        <Badge key={sIdx} variant="outline" className="text-[10px]">
                          {sub.rankFormatted} in {sub.category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Data extracted strictly from public Amazon listings. Never converted to units or revenue.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBsrModal(false)}
                className="text-xs"
              >
                Close BSR Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
