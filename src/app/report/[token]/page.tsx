'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText,
  Printer,
  Globe,
  ExternalLink,
  Star,
  Check,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Search,
  DollarSign,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ReportData {
  reportTitle: string
  platform: string
  generatedAt: string
  selectedModules: string[]
  executiveSummary: {
    targetProduct: {
      name: string
      url: string
      price: string | null
      sales: number | null
      rating: number | null
      reviewCount: number | null
      featuresCount: number | null
      features: string[]
    }
    competitorCount: number
    competitors: Array<{
      name: string
      url: string
      price: string | null
      sales: number | null
      rating: number | null
      features: string[]
    }>
    briefing?: string | null
  }
  productComparison: {
    target: {
      name: string
      features: string[]
      docsAvailable: boolean
      demoAvailable: boolean
    }
    competitors: Array<{
      name: string
      url: string
      price: string | null
      sales: number | null
      rating: number | null
      features: string[]
    }>
  } | null
  seo: {
    targetKeywords: string[]
    myProductMeta: {
      title: string | null
      description: string | null
    }
    competitorMeta: {
      title: string | null
      description: string | null
    } | null
  } | null
  sales: {
    target: {
      price: string | null
      sales: number | null
      rating: number | null
      licenseType: string
    }
    competitor: {
      name: string
      price: string | null
      sales: number | null
      rating: number | null
    } | null
  } | null
  customerFeedback: {
    totalFeedback: number
    recurringCount: number
    criticalCount: number
    groups: Array<{
      category: string
      frequency: number
      severity: string
      summary: string
      representativeEvidence: string
      isRecurring: boolean
    }>
    criticalSingleIssues: Array<{
      category: string
      severity: string
      representativeEvidence: string
    }>
  } | null
  opportunities: Array<{
    issueCategory: string
    commentSummary: string
    valueProposition: string | null
    mentionCount: number
    severity: string
    status: string
  }> | null
}

export default function PublicReportPage() {
  const params = useParams()
  const token = (params?.token as string) || ''

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!token) return

    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/${token}`)
        if (!res.ok) {
          setUnavailable(true)
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setUnavailable(true)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Loading executive report...</p>
        </div>
      </div>
    )
  }

  // Unavailable State
  if (unavailable || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">Report unavailable.</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This executive analysis report is private or the shareable link has been disabled by the owner.
            </p>
          </div>
          <div className="pt-2">
            <a href="/login" className="text-xs text-primary hover:underline font-medium">
              Sign in to ProductScope
            </a>
          </div>
        </div>
      </div>
    )
  }

  const { targetProduct, competitors } = data.executiveSummary
  const selected = data.selectedModules || []
  const isAll = selected.length === 0

  return (
    <div className="min-h-screen bg-background text-foreground antialiased print:bg-white print:text-black">
      {/* Top Banner (Hidden in Print) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 md:px-8 backdrop-blur-sm print:hidden">
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <span>ProductScope Executive Report</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-8 text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      </header>

      {/* Main Report Document */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 lg:p-10 space-y-8">
        {/* Document Header */}
        <div className="border-b border-border pb-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              {data.platform === 'envato' ? 'Envato Marketplace' : 'Web SaaS'}
            </Badge>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              Generated: {new Date(data.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {data.reportTitle}
          </h1>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>Target: <strong className="text-foreground">{targetProduct.name}</strong></span>
            <span>•</span>
            <span>Benchmarked against <strong className="text-foreground">{data.executiveSummary.competitorCount} competitor(s)</strong></span>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY & CORE KPIS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            <h2>1. Executive Summary & Verified Telemetry</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border bg-card p-3.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Target Price
              </span>
              <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {targetProduct.price || 'Not available'}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">List Price</span>
            </Card>

            <Card className="border-border bg-card p-3.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Target Sales
              </span>
              <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {targetProduct.sales !== null ? Number(targetProduct.sales).toLocaleString() : 'Not available'}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Verified Volume</span>
            </Card>

            <Card className="border-border bg-card p-3.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Customer Rating
              </span>
              <div className="text-lg sm:text-xl font-bold text-foreground mt-1 flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>{targetProduct.rating !== null ? targetProduct.rating : 'Unrated'}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {targetProduct.reviewCount ? `${targetProduct.reviewCount} reviews` : 'Not available'}
              </span>
            </Card>

            <Card className="border-border bg-card p-3.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Verified Features
              </span>
              <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {targetProduct.featuresCount || 'Not available'}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Detected specs</span>
            </Card>
          </div>

          {data.executiveSummary.briefing && (
            <Card className="border-border/80 bg-muted/10 p-4 border-l-2 border-l-primary/70">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Executive Strategic Briefing</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {data.executiveSummary.briefing}
              </p>
            </Card>
          )}
        </section>

        {/* 2. PRODUCT & COMPETITOR BENCHMARK COMPARISON */}
        {(isAll || selected.includes('product_intelligence')) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              <h2>2. Competitor Product Benchmarks</h2>
            </div>

            <Card className="border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">Price</th>
                      <th className="px-3 py-3">Sales</th>
                      <th className="px-3 py-3">Rating</th>
                      <th className="px-3 py-3">Features Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr className="bg-primary/5 font-medium">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {targetProduct.name}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Target</Badge>
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">{targetProduct.price || 'Not available'}</td>
                      <td className="px-3 py-3">{targetProduct.sales !== null ? Number(targetProduct.sales).toLocaleString() : 'Not available'}</td>
                      <td className="px-3 py-3">{targetProduct.rating ? `★ ${targetProduct.rating}` : 'Unrated'}</td>
                      <td className="px-3 py-3">{targetProduct.featuresCount || 'Not available'}</td>
                    </tr>
                    {competitors.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {comp.name}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="secondary" className="text-[10px]">Competitor</Badge>
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{comp.price || 'Not available'}</td>
                        <td className="px-3 py-3">{comp.sales !== null ? Number(comp.sales).toLocaleString() : 'Not available'}</td>
                        <td className="px-3 py-3">{comp.rating ? `★ ${comp.rating}` : 'Unrated'}</td>
                        <td className="px-3 py-3">{comp.features?.length || 'Not available'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        {/* 3. CUSTOMER FEEDBACK ANALYSIS */}
        {(isAll || selected.includes('comments')) && data.customerFeedback && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h2>3. Customer Feedback & Complaint Categories</h2>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                {data.customerFeedback.totalFeedback} Total Comments
              </Badge>
            </div>

            {/* Critical Issues Alert */}
            {data.customerFeedback.criticalSingleIssues?.length > 0 && (
              <div className="p-4 rounded-lg border border-rose-500/40 bg-rose-500/10 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Critical Customer Issue Detected</span>
                </div>
                {data.customerFeedback.criticalSingleIssues.map((crit, i) => (
                  <p key={i} className="text-xs text-foreground italic">
                    &quot;{crit.representativeEvidence}&quot;
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.customerFeedback.groups.map((grp) => (
                <Card
                  key={grp.category}
                  className={`border p-3.5 space-y-2 ${
                    grp.isRecurring ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{grp.category}</span>
                    <Badge variant={grp.isRecurring ? 'default' : 'outline'} className="text-[10px] font-mono">
                      {grp.frequency} mention(s)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{grp.summary}</p>
                  <div className="p-2 rounded bg-muted/30 border border-border/60 text-[10px] italic text-foreground/90">
                    &quot;{grp.representativeEvidence.slice(0, 160)}...&quot;
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 4. STRATEGIC OPPORTUNITIES */}
        {(isAll || selected.includes('opportunities')) && data.opportunities && data.opportunities.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2>4. Strategic Market Opportunities</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {data.opportunities.map((opp, idx) => (
                <Card key={idx} className="border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      {opp.issueCategory}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Evidence: {opp.mentionCount} mentions
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Friction:</strong> {opp.commentSummary}
                  </p>
                  {opp.valueProposition && (
                    <div className="p-2.5 rounded bg-primary/5 border border-primary/20 text-xs text-foreground/90">
                      <strong className="text-primary font-medium">Recommended Action:</strong> {opp.valueProposition}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 5. ON-PAGE SEO TELEMETRY */}
        {(isAll || selected.includes('seo')) && data.seo && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Search className="h-4 w-4 text-primary" />
              <h2>5. On-Page SEO & Ranking Telemetry</h2>
            </div>

            <Card className="border-border bg-card p-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Target Page Title</span>
                <p className="font-medium text-foreground">{data.seo.myProductMeta.title || 'Not available'}</p>
              </div>

              {data.seo.targetKeywords?.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Target Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {data.seo.targetKeywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* 6. COMMERCIAL SALES BENCHMARKS */}
        {(isAll || selected.includes('sales')) && data.sales && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h2>6. Commercial Sales Telemetry</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Card className="border-border bg-card p-4 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Target Sales Volume</span>
                <div className="text-lg font-bold text-foreground">
                  {data.sales.target.sales !== null ? Number(data.sales.target.sales).toLocaleString() : 'Not available'}
                </div>
                <span className="text-[11px] text-muted-foreground block">{data.sales.target.licenseType}</span>
              </Card>

              {data.sales.competitor && (
                <Card className="border-border bg-card p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    {data.sales.competitor.name} Volume
                  </span>
                  <div className="text-lg font-bold text-foreground">
                    {data.sales.competitor.sales !== null ? Number(data.sales.competitor.sales).toLocaleString() : 'Not available'}
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Price: {data.sales.competitor.price || 'Not available'}
                  </span>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-1">
          <p>This report was generated using verified public data and deterministic benchmarking rules.</p>
          <p className="text-[11px]">ProductScope © {new Date().getFullYear()} • Confidential Executive Briefing</p>
        </footer>
      </main>
    </div>
  )
}
