'use client'

import React from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  Swords,
  Target,
  ArrowRight,
  Zap,
  CheckCircle2,
  ExternalLink,
  Clock,
  Building,
  Star,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Layers,
  MessageSquare,
  ShieldCheck,
  Share2,
  Search,
  Check,
  Trophy,
  HelpCircle,
} from 'lucide-react'
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

export default function OverviewPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading executive intelligence overview...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Building className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No Workspace Analyses Found</h2>
        <p className="text-xs text-muted-foreground">
          Run your first competitive intelligence analysis to preview live pricing advantage, feature gaps, and switching opportunities.
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
  const opportunities: any[] = currentProjectData?.opportunities || []
  const commentsAnalysis = currentProjectData?.comments_analysis || {}
  const executiveSummary = currentProjectMeta?.executiveSummary || null

  const targetName = currentProjectMeta?.ownProduct?.name || myProduct.productName || myProduct.websiteTitle || projectName
  const targetUrl = currentProjectMeta?.ownProduct?.url || myProduct.url || '#'

  // Pricing calculations
  const targetPriceNum = getNumericPrice(myProduct)
  const competitorPrices = competitors
    .map(getNumericPrice)
    .filter((p): p is number => p !== null && p > 0)
  
  const avgCompetitorPrice = competitorPrices.length > 0
    ? Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
    : null

  // Sales Leader
  let salesLeader = competitors.length > 0 ? competitors[0] : null
  let maxSales = -1
  for (const comp of competitors) {
    const sales = getProductSalesNumber(comp)
    if (sales > maxSales) {
      maxSales = sales
      salesLeader = comp
    }
  }
  const salesLeaderName = salesLeader ? (salesLeader.productName || salesLeader.websiteTitle || 'Top Competitor') : 'None'
  const mySalesNum = getProductSalesNumber(myProduct)

  // Feature stats
  const myExclusive = comparison.myExclusiveFeatures || []
  const competitorExclusive = comparison.competitorExclusiveFeatures || []
  const readyOpportunities = opportunities.filter((o) => o.status === 'qualified' || (o.opportunityScore && o.opportunityScore >= 0.7))

  // Ratings
  const myRating = getProductRating(myProduct)
  const competitorRatings = competitors
    .map((c) => (c.envatoSales?.rating !== null && c.envatoSales?.rating !== undefined ? Number(c.envatoSales.rating) : null))
    .filter((r): r is number => r !== null)
  const avgRating = competitorRatings.length > 0
    ? (competitorRatings.reduce((a, b) => a + b, 0) / competitorRatings.length).toFixed(1)
    : null

  // Question 1: What Changed / Current Standing
  const standingSummary = competitors.length > 0
    ? `Across your market (${competitors.length} competitor${competitors.length === 1 ? '' : 's'} tracked), your product is listed at ${getProductPrice(myProduct)} with ${getProductSales(myProduct)} sales. ${
        maxSales > 0 ? `${salesLeaderName} holds category sales volume (${maxSales.toLocaleString()} sales), ` : ''
      }while you maintain ${myExclusive.length} exclusive feature advantages.`
    : `Single product scan active for ${targetName}. Add competitor URLs to calculate market averages and feature parity.`

  // Question 2: Why Does It Matter?
  const whyItMatters = targetPriceNum && avgCompetitorPrice
    ? targetPriceNum < avgCompetitorPrice
      ? `You hold a $${avgCompetitorPrice - targetPriceNum} price advantage over the competitor average ($${avgCompetitorPrice}). If you highlight total cost of ownership and your ${myExclusive.length} exclusive capabilities, you can convert budget-conscious buyers before they default to ${salesLeaderName}.`
      : `Your product is priced at a premium above the competitor average ($${avgCompetitorPrice}). Buyers will compare feature-by-feature; you must justify this price through superior stability and exclusive features.`
    : `Direct positioning prevents lost deals to incumbents who rely on brand longevity rather than feature quality.`

  // Question 3: What Is My Biggest Advantage?
  const biggestAdvantage = myExclusive.length > 0
    ? `Exclusive Feature Moat (${myExclusive.length} unique capabilities rivals lack)`
    : targetPriceNum && avgCompetitorPrice && targetPriceNum < avgCompetitorPrice
      ? `Aggressive Pricing Wedge ($${avgCompetitorPrice - targetPriceNum} below market average)`
      : `Clean, modern platform architecture`

  const advantageDetail = myExclusive.length > 0
    ? `Capabilities competitors do not offer: ${myExclusive.slice(0, 3).join(', ')}${myExclusive.length > 3 ? `, +${myExclusive.length - 3} more` : ''}.`
    : `Price parity gives you runway to out-support incumbents.`

  // Question 4: What Is My Biggest Weakness?
  const biggestWeakness = competitorExclusive.length > 0
    ? `Parity Gap (${competitorExclusive.length} competitor-exclusive capabilities)`
    : mySalesNum < maxSales
      ? `Category Sales Velocity (${salesLeaderName} has more historical review social proof)`
      : `Market awareness and search footprint`

  const weaknessDetail = competitorExclusive.length > 0
    ? `Top competitor features buyers frequently ask for: ${competitorExclusive.slice(0, 3).join(', ')}${competitorExclusive.length > 3 ? `, +${competitorExclusive.length - 3} more` : ''}.`
    : `Incumbents have collected more public reviews over several years.`

  // Question 5: What Is the Biggest Competitor Threat?
  const biggestThreat = salesLeaderName !== 'None'
    ? `${salesLeaderName} Market Dominance`
    : `Emerging low-cost clones`

  const threatDetail = maxSales > 0
    ? `${salesLeaderName} holds ${maxSales.toLocaleString()} sales and high category visibility, making them the default evaluation choice for new buyers.`
    : `Competitors are actively iterating on feature parity.`

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
              Executive Briefing
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {competitors.length} Competitors Tracked
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {projectName}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary shrink-0" />
            <span>Executive Command Center</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            The 20-second executive summary: standing, advantages, vulnerabilities, threats, and next moves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentProjectMeta?.shareEnabled && currentProjectMeta?.shareToken && (
            <Link href={`/report/${currentProjectMeta.shareToken}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Share2 className="h-3.5 w-3.5" />
                <span>Share Report</span>
              </Button>
            </Link>
          )}
          <Link href="/analyses/new">
            <Button size="sm" className="gap-1.5 text-xs shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Run New Analysis</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 20-SECOND EXECUTIVE ANSWER (The 6 Questions) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Executive 20-Second Intelligence Summary
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Autonomous Synthesis
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1: What Is Happening? */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                Question 1: What Is Happening?
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                Current Market Standing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <p className="text-foreground leading-relaxed">
                {standingSummary}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="text-[10px]">
                  Price: {getProductPrice(myProduct)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Sales: {getProductSales(myProduct)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Rating: {myRating !== 'Not available' ? `${myRating} ★` : 'Unrated'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Q2: Why Does It Matter? */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                Question 2: Why Does It Matter?
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                Strategic Business Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                {whyItMatters}
              </p>
              <div className="pt-1 text-[11px] text-foreground font-medium">
                Buyer Decision Driver: {targetPriceNum && avgCompetitorPrice && targetPriceNum < avgCompetitorPrice ? 'Value & ROI' : 'Quality & Exclusive Capabilities'}
              </div>
            </CardContent>
          </Card>

          {/* Q3: What Is My Biggest Advantage? */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2 border-b border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Question 3: What Is My Biggest Advantage?
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                {biggestAdvantage}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                {advantageDetail}
              </p>
              <Link href="/dashboard/changes" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline pt-1">
                Explore in Feature Battle →
              </Link>
            </CardContent>
          </Card>

          {/* Q4: What Is My Biggest Weakness? */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2 border-b border-amber-500/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Question 4: What Is My Biggest Weakness?
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                {biggestWeakness}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                {weaknessDetail}
              </p>
              <Link href="/dashboard/changes" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:underline pt-1">
                View Feature Gaps to Close →
              </Link>
            </CardContent>
          </Card>

          {/* Q5: What Is the Biggest Competitor Threat? */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1">
                <Swords className="h-3 w-3" />
                Question 5: What Is the Biggest Threat?
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                {biggestThreat}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                {threatDetail}
              </p>
              <Link href="/dashboard/competitors" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1">
                View Competitor Profile →
              </Link>
            </CardContent>
          </Card>

          {/* Q6: What Should I Do Next? (Top 3 Priorities) */}
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2 border-b border-primary/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-1">
                <Target className="h-3 w-3" />
                Question 6: What Should I Do Next?
              </span>
              <CardTitle className="text-sm font-bold text-foreground">
                Top 3 Execution Priorities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold text-foreground">Close High-Impact Feature Gap: </span>
                  <span className="text-muted-foreground">
                    {competitorExclusive.length > 0 ? competitorExclusive[0] : 'Expand third-party automations'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold text-foreground">Sharpen Value Proposition: </span>
                  <span className="text-muted-foreground">
                    {targetPriceNum && avgCompetitorPrice && targetPriceNum < avgCompetitorPrice
                      ? `Highlight your $${avgCompetitorPrice - targetPriceNum} price advantage on hero section`
                      : 'Emphasize your exclusive features and dedicated support'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-semibold text-foreground">Intercept Switching Buyers: </span>
                  <span className="text-muted-foreground">
                    Target {salesLeaderName} users frustrated with bugs or missing updates.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DEEP DIVE MODULE NAVIGATION (1-Click Access to the 7 Focused Modules) */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>Dedicated Intelligence Modules</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Each module is focused on answering one specific business question. Click any card for the full breakdown.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Sales & Pricing */}
          <Link href="/dashboard/my-saas" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    Sales & Pricing
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  How are products selling & priced?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Sales momentum, price position, and velocity benchmarks.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Target: {getProductPrice(myProduct)}</span>
                  <span className="font-semibold text-foreground">{getProductSales(myProduct)} sales</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 2. Feature Battle */}
          <Link href="/dashboard/changes" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                    Feature Battle
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Which product has the better features?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Parity analysis, capability matrix, and roadmap sprint priorities.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-semibold">{myExclusive.length} exclusive</span>
                  <span className="text-amber-400 font-semibold">{competitorExclusive.length} gaps</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 3. Reviews & Ratings */}
          <Link href="/dashboard/reviews" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                    Reviews & Ratings
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  What do customers like and dislike?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Star rating distribution, top praise, and dissatisfaction drivers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Rating: {myRating !== 'Not available' ? `${myRating} ★` : 'Catalog verified'}</span>
                  <span>Avg: {avgRating ? `${avgRating} ★` : '—'}</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 4. Comments & Sentiment */}
          <Link href="/dashboard/comments" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                    Customer Comments
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  What problems are customers talking about?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Recurring buyer complaints, unaddressed questions, and quotes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Discussions: {commentsAnalysis.totalComments || 'Active'}</span>
                  <span className="text-purple-400 font-semibold">Recurring issues tracked</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 5. Opportunities & Leads */}
          <Link href="/dashboard/opportunities" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                    Opportunities & Leads
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Where are the best sales opportunities?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Switching signals from competitor customers ready for outreach.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Total Leads: {opportunities.length}</span>
                  <span className="text-blue-400 font-semibold">{readyOpportunities.length} ready to pitch</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 6. Competitors */}
          <Link href="/dashboard/competitors" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/30">
                    Competitor Tracking
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-rose-400 transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  What are competitors doing?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Side-by-side telemetry, sales leader profiles, and add competitor tool.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>{competitors.length} rivals monitored</span>
                  <span className="text-foreground font-semibold">Leader: {salesLeaderName}</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 7. Product Discoverability */}
          <Link href="/dashboard/seo" className="group">
            <Card className="border-border bg-card hover:border-primary/60 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">
                    Discoverability & SEO
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  How discoverable is my product?
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Listing health, keyword gaps against rivals, and copy optimizations.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs border-t border-border/50 text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Search Topics</span>
                  <span className="text-cyan-400 font-semibold">Review listing keywords</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Methodology Notice */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>ProductScope continuous market intelligence for active project &quot;{projectName}&quot;.</span>
        </span>
        <span>Public verified sources · No fabricated metrics</span>
      </div>
    </div>
  )
}
