'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Layers,
  ArrowLeft,
  RotateCw,
  ExternalLink,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Search,
  DollarSign,
  Star,
  MessageSquare,
  TrendingUp,
  Building,
  Globe,
  FileText,
  Users,
  Check,
  X,
  Tag,
  ArrowUpRight,
  TrendingDown,
  Percent,
  Copy,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldAlert,
  Info,
  History,
  Trash2,
  Share2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteAnalysisDialog } from '@/components/analyses/delete-analysis-dialog'
import { ShareAnalysisDialog } from '@/components/analyses/share-analysis-dialog'
import {
  AnalysisResponseData,
  ExtractedProductData,
  OpportunityRecord,
  PublicComment,
} from '@/services/website-analyzer/types'
import {
  organizeFeedbackIntoCategories,
  FeedbackCategoryGroup,
} from '@/services/website-analyzer/comments-analyzer'

interface AnalysisMeta {
  id: string
  name: string
  platform: 'envato' | 'generic' | string
  ownProduct: {
    url: string
    name: string | null
  }
  competitors: Array<{
    url: string
    name: string | null
  }>
  selectedModules: string[]
  status: 'completed' | 'running' | 'failed' | 'queued' | string
  shareEnabled?: boolean
  shareToken?: string | null
  createdAt: string
  updatedAt: string
  lastRefreshedAt?: string | null
  nextRefreshAt?: string | null
  refreshLock?: boolean
  errorMessage?: string | null
  executiveSummary?: string | null
}

function formatPriceString(val: any): string {
  if (!val) return 'Not available'
  const str = String(val).trim()
  if (/^(\$|₹|€|£|Rs\.?|¥)/i.test(str)) return str
  return typeof val === 'number' ? `$${val}` : `$${str}`
}

function getProductPrice(prod?: ExtractedProductData | null): string {
  if (!prod) return 'Not available'
  const ep = prod.envatoSales?.product_price || (prod.envatoSales as any)?.price
  if (ep) return formatPriceString(ep)
  const pp = prod.pricingPlans?.[0]
  if (pp) {
    const raw = (pp as any).price || (pp as any).pricePerMonth || (pp as any).pricePerYear || (pp as any).priceMonthly || (pp as any).priceAnnual
    if (raw) return formatPriceString(raw)
  }
  return 'Not available'
}

function getProductSales(prod?: ExtractedProductData | null): string {
  if (!prod) return 'Not available'
  const s = prod.envatoSales?.current_total_sales ?? (prod.envatoSales as any)?.totalSales
  if (s !== null && s !== undefined && typeof s === 'number') {
    return s.toLocaleString()
  }
  return 'Not available'
}

function getProductRating(prod?: ExtractedProductData | null): string {
  if (!prod) return 'Not available'
  const r = prod.envatoSales?.rating
  if (r !== null && r !== undefined && typeof r === 'number') {
    return r.toFixed(1)
  }
  return 'Not available'
}

function getProductReviewCount(prod?: ExtractedProductData | null): string {
  if (!prod) return 'Not available'
  const count = prod.envatoSales?.review_count ?? (prod.envatoSales as any)?.reviewCount
  if (count !== null && count !== undefined && typeof count === 'number') {
    return `${count} reviews`
  }
  return 'Not available'
}

export default function AnalysisWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = (params?.id as string) || ''

  const [meta, setMeta] = useState<AnalysisMeta | null>(null)
  const [data, setData] = useState<AnalysisResponseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)

  // Expandable comments bucket drilldown
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('overview')

  const fetchWorkspace = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const res = await fetch(`/api/analyses/${id}`)
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You do not have permission to access this analysis.')
        if (res.status === 404) throw new Error('Analysis workspace not found.')
        throw new Error(`Failed to load analysis (${res.status})`)
      }
      const json = await res.json()
      setMeta(json.analysis)
      setData(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading analysis')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchWorkspace()
  }, [fetchWorkspace])

  // Auto-poll if analysis is running
  useEffect(() => {
    if (meta?.status === 'running') {
      const pollInterval = setInterval(() => {
        fetchWorkspace()
      }, 4000)
      return () => clearInterval(pollInterval)
    }
  }, [meta?.status, fetchWorkspace])

  // Trigger Run / Re-run
  const handleRunAnalysis = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyses/${id}/run`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to run analysis')
      }
      if (json.analysis) setMeta(json.analysis)
      if (json.data) setData(json.data)
      await fetchWorkspace()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error executing analysis')
    } finally {
      setRunning(false)
    }
  }

  // Copy Analysis ID
  const copyId = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Compute visible tabs based on selectedModules
  const visibleTabs = useMemo(() => {
    const modules = meta?.selectedModules || []
    const isAll = modules.length === 0

    const list: Array<{ id: string; label: string; icon: any }> = [
      { id: 'overview', label: 'Overview', icon: Layers },
    ]

    if (isAll || modules.includes('product_intelligence')) {
      list.push({ id: 'product', label: 'Product', icon: Sparkles })
    }
    if (isAll || modules.includes('seo')) {
      list.push({ id: 'seo', label: 'SEO', icon: Search })
    }
    if (isAll || modules.includes('sales')) {
      list.push({ id: 'sales', label: 'Sales', icon: DollarSign })
    }
    if (isAll || modules.includes('reviews')) {
      list.push({ id: 'reviews', label: 'Reviews', icon: Star })
    }
    if (isAll || modules.includes('comments')) {
      list.push({ id: 'comments', label: 'Comments', icon: MessageSquare })
    }

    list.push({ id: 'competitors', label: 'Competitors', icon: Users })

    if (isAll || modules.includes('opportunities')) {
      list.push({ id: 'opportunities', label: 'Opportunities', icon: TrendingUp })
    }

    list.push({ id: 'report', label: 'Report', icon: FileText })

    return list
  }, [meta?.selectedModules])

  // Fallback to overview if current tab is hidden
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab('overview')
    }
  }, [visibleTabs, activeTab])

  // Phase 3: Customer Feedback Organized into 13 Categories
  const organizedFeedback = useMemo(() => {
    const commentsList: PublicComment[] = []
    const seen = new Set<string>()

    const addComment = (c: any) => {
      if (!c || !c.comment_text) return
      const key = c.id || c.comment_text.trim().toLowerCase().slice(0, 100)
      if (!seen.has(key)) {
        seen.add(key)
        commentsList.push(c)
      }
    }

    if (data?.comments_analysis?.comments) {
      for (const c of data.comments_analysis.comments) addComment(c)
    }
    if (data?.comments_analysis?.recurring_complaints) {
      for (const rc of data.comments_analysis.recurring_complaints) {
        if (rc.comments) {
          for (const c of rc.comments) addComment(c)
        }
      }
    }

    return organizeFeedbackIntoCategories(commentsList)
  }, [data?.comments_analysis])

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </Badge>
        )
      case 'running':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 text-xs animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Analyzing...</span>
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 gap-1 text-xs">
            <XCircle className="h-3.5 w-3.5" />
            <span>Failed</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30 gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Queued</span>
          </Badge>
        )
    }
  }

  const renderSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return (
          <Badge variant="outline" className="bg-rose-500/15 text-rose-400 border-rose-500/40 text-[10px] uppercase font-bold">
            Critical
          </Badge>
        )
      case 'high':
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/40 text-[10px] uppercase font-semibold">
            High
          </Badge>
        )
      case 'medium':
        return (
          <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/40 text-[10px] uppercase">
            Medium
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-500/15 text-slate-400 border-slate-500/40 text-[10px] uppercase">
            Low
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading analysis workspace...</span>
        </div>
        <div className="h-28 bg-muted/40 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error && !meta) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Workspace Error</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Link href="/analyses">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Analyses</span>
          </Button>
        </Link>
      </div>
    )
  }

  const myProduct = data?.my_product
  const competitorsData = data?.competitors_data || []
  const comparison = data?.comparison
  const seoData = data?.seo_analysis as any
  const commentsData = data?.comments_analysis
  const opportunities = data?.opportunities || []
  const activities = data?.activities || []
  const isCompleted = meta?.status === 'completed' && !!data

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/analyses"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Analyses</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={copyId}
              className="text-[11px] text-muted-foreground hover:text-foreground font-mono flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border"
              title="Copy Analysis ID"
            >
              <span>ID: {id.slice(0, 10)}...</span>
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchWorkspace}
              disabled={loading || running}
              className="text-xs gap-1.5 h-8"
            >
              <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="text-xs gap-1.5 h-8 border-border"
              title="Share executive report"
            >
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Share</span>
              {meta?.shareEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </Button>
            {session?.user?.role === 'admin' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading || running}
                className="text-xs gap-1.5 h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                title="Admin: Permanently delete this workspace"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Workspace</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleRunAnalysis}
              disabled={running || meta?.status === 'running'}
              className="text-xs gap-1.5 h-8 bg-primary font-medium"
            >
              {running || meta?.status === 'running' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>{isCompleted ? 'Re-run Analysis' : 'Run Analysis'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {meta?.name}
              </h1>
              <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                {meta?.platform === 'envato' ? 'Envato' : 'Other / Generic'}
              </Badge>
              {meta?.platform !== 'envato' && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                  Platform connector not available yet.
                </Badge>
              )}
              {renderStatusBadge(meta?.status || 'queued')}
            </div>

            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
              <span>Created {new Date(meta?.createdAt || '').toLocaleDateString()}</span>
              <span>•</span>
              <span>
                Last Updated: {meta?.lastRefreshedAt ? new Date(meta.lastRefreshedAt).toLocaleTimeString() : new Date(meta?.updatedAt || meta?.createdAt || '').toLocaleTimeString()}
              </span>
              <span>•</span>
              <span className="text-foreground/80 font-mono text-[11px]">
                Next update: {meta?.nextRefreshAt ? new Date(meta.nextRefreshAt).toLocaleTimeString() : 'Scheduled hourly'}
              </span>
            </div>
          </div>
        </div>

        {/* Stale / Failed Refresh Warning Banner */}
        {meta?.errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">Refresh Warning: </span>
              <span>{meta.errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Target Product vs Competitors Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
        {/* Own Product */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              My Product
            </span>
            {(myProduct as any)?.version && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                v{(myProduct as any).version}
              </Badge>
            )}
          </div>
          <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span>{meta?.ownProduct?.name || myProduct?.productName || 'Target Product'}</span>
          </div>
          <a
            href={meta?.ownProduct?.url || myProduct?.url || '#'}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-full truncate font-mono"
          >
            <span className="truncate">{meta?.ownProduct?.url || myProduct?.url || '—'}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <div className="pt-1 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            <span>Source: <span className="font-mono text-foreground/80">{myProduct?.provenance?.source || (meta?.platform === 'envato' ? 'envato_api_and_public' : 'generic_web')}</span></span>
            <span>•</span>
            <span>Status: <span className="text-emerald-400 font-medium capitalize">{myProduct?.provenance?.status || 'verified'}</span></span>
          </div>
        </div>

        {/* Competitors */}
        <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Competitors ({meta?.competitors.length || 0})
          </span>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {meta?.competitors.map((comp, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <a
                  href={comp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate font-mono text-[11px]"
                >
                  <span className="truncate">{comp.name || comp.url}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert if Any */}
      {(error || meta?.errorMessage) && (
        <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error || meta?.errorMessage}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleRunAnalysis} className="text-xs h-7">
            Retry Run
          </Button>
        </div>
      )}

      {/* Empty / Queued State */}
      {!isCompleted && meta?.status !== 'running' && (
        <Card className="border-dashed border-border bg-card/60 text-center py-12 px-4">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">Analysis Ready to Run</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Run Analysis&quot; to execute real data extraction for your product and competitors.
              </p>
            </div>
            <Button onClick={handleRunAnalysis} disabled={running} className="gap-2 text-xs">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span>Execute Analysis Now</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Running State */}
      {meta?.status === 'running' && (
        <Card className="border-amber-500/30 bg-amber-500/5 text-center py-12 px-4">
          <CardContent className="space-y-3 max-w-md mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
            <h3 className="font-semibold text-base text-foreground">Analysis in Progress</h3>
            <p className="text-xs text-muted-foreground">
              Collecting website telemetry, SEO structures, sales figures, comments, and AI opportunities.
              This page will update automatically.
            </p>
          </CardContent>
        </Card>
      )}

      {/* WORKSPACE CONTENT TABS */}
      {isCompleted && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Bar controlled by selectedModules */}
          <div className="border-b border-border overflow-x-auto">
            <TabsList className="h-11 bg-transparent p-0 gap-2 border-b-0">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-3.5 py-2 text-xs gap-1.5 font-medium"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* 1. OVERVIEW TAB (Phase 3 Spec)             */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Own Product Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Target Price
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {getProductPrice(myProduct)}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {meta?.platform === 'amazon' || (myProduct?.url && /amazon\.[a-z.]+/i.test(myProduct.url))
                    ? 'Current price'
                    : ((myProduct?.pricingPlans?.[0] as any)?.interval || (myProduct?.envatoSales ? 'Commercial license' : 'Not available'))}
                </span>
              </Card>

              <Card className="border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  {meta?.platform === 'amazon' || (myProduct?.url && /amazon\.[a-z.]+/i.test(myProduct.url)) ? 'Purchase Signal' : 'Total Sales'}
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {meta?.platform === 'amazon' || (myProduct?.url && /amazon\.[a-z.]+/i.test(myProduct.url))
                    ? ((myProduct as any)?.amazonPurchaseBadge || (getProductSales(myProduct) !== 'Not available' ? `${getProductSales(myProduct)}+ bought` : 'Not publicly observed'))
                    : getProductSales(myProduct)}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {meta?.platform === 'amazon' || (myProduct?.url && /amazon\.[a-z.]+/i.test(myProduct.url)) ? 'public Amazon purchase badge' : 'verified units sold'}
                </span>
              </Card>

              <Card className="border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Rating Score
                </span>
                <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>{getProductRating(myProduct)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {getProductReviewCount(myProduct)}
                </span>
              </Card>

              <Card className="border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Detected Features
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {myProduct?.features?.length || 'Not available'}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  specifications verified
                </span>
              </Card>
            </div>

            {/* Executive Strategic Briefing */}
            {meta?.executiveSummary && (
              <Card className="border-border/80 bg-muted/10 p-4 border-l-2 border-l-primary/70">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Executive Strategic Briefing</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {meta.executiveSummary}
                </p>
              </Card>
            )}

            {/* Side-by-Side Competitor Comparison */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Competitor Comparison Matrix
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Side-by-side benchmark comparing your target product against monitored competitors.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-[11px]">
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Price</th>
                      <th className="py-2 px-3">Sales / Est.</th>
                      <th className="py-2 px-3">Rating</th>
                      <th className="py-2 px-3">Features</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr className="bg-primary/5 font-medium">
                      <td className="py-2.5 px-3 text-foreground flex items-center gap-1.5">
                        <Badge className="text-[9px] py-0 px-1 bg-primary text-primary-foreground">Mine</Badge>
                        <span className="truncate max-w-[160px]">{myProduct?.productName || 'My Product'}</span>
                      </td>
                      <td className="py-2.5 px-3">{getProductPrice(myProduct)}</td>
                      <td className="py-2.5 px-3">{getProductSales(myProduct)}</td>
                      <td className="py-2.5 px-3">
                        {getProductRating(myProduct) !== 'Not available' ? `★ ${getProductRating(myProduct)}` : 'Not available'}
                      </td>
                      <td className="py-2.5 px-3">{myProduct?.features?.length || 'Not available'}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-medium">Target</td>
                    </tr>
                    {competitorsData.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 text-foreground truncate max-w-[160px]">
                          {comp.productName || `Competitor ${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3">{getProductPrice(comp)}</td>
                        <td className="py-2.5 px-3">{getProductSales(comp)}</td>
                        <td className="py-2.5 px-3">
                          {getProductRating(comp) !== 'Not available' ? `★ ${getProductRating(comp)}` : 'Not available'}
                        </td>
                        <td className="py-2.5 px-3">{comp.features?.length || 'Not available'}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">Competitor</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Top Customer Problems & Top Opportunities Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Customer Problems */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-rose-400" />
                    <span>Top Customer Problems</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('comments')}
                    className="text-[11px] h-7 px-2"
                  >
                    View All Feedback →
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {organizedFeedback.recurringComplaints.length > 0 ? (
                    organizedFeedback.recurringComplaints.slice(0, 3).map((group, i) => (
                      <div key={i} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{group.category}</span>
                          <div className="flex items-center gap-1.5">
                            {renderSeverityBadge(group.severity)}
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {group.frequency} mentions
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-[11px] line-clamp-2">
                          &quot;{group.representativeEvidence}&quot;
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-xs py-4 text-center">
                      No recurring customer problems detected across monitored products.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Top Opportunities */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>Top Opportunities</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('opportunities')}
                    className="text-[11px] h-7 px-2"
                  >
                    View All Plays →
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {opportunities.length > 0 ? (
                    opportunities.slice(0, 3).map((opp) => (
                      <div key={opp.id} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {opp.issue_category || opp.competitor_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono text-primary">
                            {opp.severity || 'Opportunity'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px] line-clamp-2">
                          {opp.comment_summary || opp.value_proposition}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-xs py-4 text-center">
                      No strategic gap opportunities generated yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Historical Activity Section */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span>Recent Real Changes & Activity Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                {activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.slice(0, 5).map((act, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border">
                        <div>
                          <span className="font-medium text-foreground">{act.activityTitle}</span>
                          <p className="text-[11px] text-muted-foreground">{act.whatChanged}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(act.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-muted/20 border border-border text-center space-y-1">
                    <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-foreground">Historical data not available yet.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Scheduled activity monitoring records price changes, releases, and metric shifts over time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* 2. PRODUCT SECTION (Phase 3 Spec)          */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="product" className="space-y-6">
            {/* Own Product Detailed Profile */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>My Product Intelligence</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {myProduct?.category || 'Category not specified'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Description & Links */}
                <div>
                  <h4 className="font-semibold text-foreground text-xs mb-1">Product Description</h4>
                  <p className="text-muted-foreground leading-relaxed text-xs">
                    {myProduct?.description || 'No description extracted from target website.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Documentation</span>
                    {myProduct?.docsLink && myProduct.docsLink !== 'Not found on the provided website' ? (
                      <a href={myProduct.docsLink} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 font-mono text-[11px] mt-0.5">
                        <span>View Documentation</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[11px] mt-0.5 block">Not available</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Live Demo</span>
                    {myProduct?.contactOrDemoCta && myProduct.contactOrDemoCta !== 'Not found on the provided website' ? (
                      <a href={myProduct.contactOrDemoCta} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 font-mono text-[11px] mt-0.5">
                        <span>Launch Demo</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[11px] mt-0.5 block">Not available</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Free Tier / Trial</span>
                    <span className="text-foreground text-[11px] mt-0.5 block">
                      {myProduct?.hasFreePlan ? 'Free Plan Available' : myProduct?.hasFreeTrial ? 'Free Trial' : (meta?.platform === 'amazon' || (myProduct?.url && /amazon\.[a-z.]+/i.test(myProduct.url)) ? 'Direct Purchase Only' : 'Commercial License Only')}
                    </span>
                  </div>
                </div>

                {/* Features Detected */}
                <div>
                  <h4 className="font-semibold text-foreground text-xs mb-2">
                    Verified Detected Features ({myProduct?.features?.length || 0})
                  </h4>
                  {myProduct?.features && myProduct.features.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {myProduct.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/20 border border-border/60">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-foreground/90">{feat}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No feature specifications detected on target page.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Competitors Information Breakdown */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground">
                Competitor Information ({competitorsData.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {competitorsData.map((comp, idx) => (
                  <Card key={idx} className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold text-foreground">
                            {comp.productName || `Competitor ${idx + 1}`}
                          </CardTitle>
                          <a href={comp.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-mono mt-0.5">
                            <span>{comp.url}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        {comp.category && <Badge variant="outline" className="text-xs">{comp.category}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/20 text-center">
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase">Price</span>
                          <span className="font-bold text-foreground">{getProductPrice(comp)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase">Sales</span>
                          <span className="font-bold text-foreground">{getProductSales(comp)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase">Rating</span>
                          <span className="font-bold text-foreground">
                            {getProductRating(comp) !== 'Not available' ? `★ ${getProductRating(comp)}` : 'Not available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase">Features</span>
                          <span className="font-bold text-foreground">{comp.features?.length || 'Not available'}</span>
                        </div>
                      </div>

                      {comp.features && comp.features.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="font-semibold text-foreground text-[11px] block">Extracted Features:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {comp.features.slice(0, 6).map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                                {f}
                              </Badge>
                            ))}
                            {comp.features.length > 6 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{comp.features.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* 3. COMMENTS / CUSTOMER FEEDBACK (Phase 3)  */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="comments" className="space-y-6">
            {/* Critical Single Issues Alert if Any */}
            {organizedFeedback.criticalSingleIssues.length > 0 && (
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Critical Customer Issue Detected (Immediate Attention Recommended)</span>
                </div>
                {organizedFeedback.criticalSingleIssues.map((issue, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-background/80 border border-rose-500/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{issue.category}</span>
                      {renderSeverityBadge(issue.severity)}
                    </div>
                    <p className="text-foreground text-[11px] italic leading-relaxed">
                      &quot;{issue.representativeEvidence}&quot;
                    </p>
                    {issue.sourceUrl && (
                      <a href={issue.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 font-mono">
                        <span>View Source Feedback</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Header & Metric Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Customer Feedback & Public Discussion Analysis</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organized into standard categories with recurring issues flagged at 2+ mentions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {organizedFeedback.totalFeedback} Total Comments
                </Badge>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {organizedFeedback.recurringComplaints.length} Recurring Issues
                </Badge>
              </div>
            </div>

            {/* Categorized Feedback Groups List */}
            <div className="grid grid-cols-1 gap-4">
              {organizedFeedback.groups.length > 0 ? (
                organizedFeedback.groups.map((group) => {
                  const isExpanded = expandedCategory === group.category
                  return (
                    <Card
                      key={group.category}
                      className={`border transition-colors ${
                        group.isRecurring
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-sm font-semibold text-foreground">
                              {group.category}
                            </CardTitle>
                            {renderSeverityBadge(group.severity)}
                            {group.isRecurring && (
                              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                                Recurring Issue (2+ mentions)
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              Frequency: <strong className="text-foreground">{group.frequency}</strong>
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedCategory(isExpanded ? null : group.category)
                              }
                              className="h-7 w-7 p-0"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                          {group.summary}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3 text-xs">
                        {/* Representative Evidence */}
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/80 space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Representative Customer Evidence:
                          </span>
                          <p className="text-foreground italic text-[11px] leading-relaxed">
                            &quot;{group.representativeEvidence}&quot;
                          </p>
                          {group.sourceUrl && (
                            <a
                              href={group.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 font-mono pt-1"
                            >
                              <span>View Source Discussion</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>

                        {/* Expandable Supporting Comments */}
                        {isExpanded && group.comments.length > 1 && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                              All Supporting Comments ({group.comments.length}):
                            </span>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {group.comments.map((comment, cIdx) => (
                                <div key={cIdx} className="p-2 rounded bg-background border border-border text-[11px] space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="font-semibold text-foreground">{comment.author_name || 'Customer'}</span>
                                    <span>{comment.comment_date || 'Date not recorded'}</span>
                                  </div>
                                  <p className="text-foreground/90">{comment.comment_text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="p-8 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground">No public comments or feedback available for this analysis.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* 4. OPPORTUNITIES SECTION (Phase 3 Spec)     */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="opportunities" className="space-y-6">
            <div className="border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Strategic Market Opportunities & Cold Outreach Plays</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actionable competitive advantages detected strictly from verified customer friction and feature gaps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {opportunities.length > 0 ? (
                opportunities.map((opp) => (
                  <Card key={opp.id} className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-sm font-semibold text-foreground">
                            {opp.issue_category || 'Identified Opportunity'}
                          </CardTitle>
                          {renderSeverityBadge(opp.severity || 'medium')}
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            Status: {opp.status || 'New'}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          Evidence: {opp.mention_count || 1} mentions
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground mt-1">
                        Benchmark against {opp.competitor_name || opp.competitor_url}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs">
                      {/* Customer Problem Summary */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Verified Friction Evidence:
                        </span>
                        <p className="text-foreground text-[11px] leading-relaxed">
                          {opp.comment_summary || 'Customer complaint logged in public discussions.'}
                        </p>
                        {opp.why_relevant && (
                          <p className="text-primary text-[10px] mt-1 font-medium">
                            Why it matters: {opp.why_relevant}
                          </p>
                        )}
                      </div>

                      {/* Suggested Action & Value Proposition */}
                      <div className="space-y-2">
                        <span className="font-semibold text-foreground text-xs block">
                          Suggested Action & Value Proposition:
                        </span>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                          <p className="text-foreground text-[11px]">
                            {opp.value_proposition || 'Highlight our product verified stability and direct support channels.'}
                          </p>
                          {opp.draft_message && (
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                                Pre-Drafted Outreach Pitch:
                              </span>
                              <div className="p-2.5 rounded bg-background border border-border font-mono text-[11px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {opp.draft_message}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-8 rounded-lg bg-muted/20 border border-border text-center space-y-2">
                  <p className="text-xs font-semibold text-foreground">No opportunities identified yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Opportunities are created strictly from actual customer complaint evidence and verified matching features.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* SEO TAB                                     */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="seo" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span>On-Page SEO & Ranking Telemetry</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                    <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                      My Product Title & Meta
                    </span>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Title:</span>
                      <p className="font-medium text-foreground">{(myProduct as any)?.title || myProduct?.productName || 'Not available'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Meta Description:</span>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {(myProduct as any)?.metaDescription || myProduct?.description || 'Not available'}
                      </p>
                    </div>
                  </div>

                  {competitorsData[0] && (
                    <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                      <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                        Competitor 1 Title & Meta
                      </span>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Title:</span>
                        <p className="font-medium text-foreground">{(competitorsData[0] as any)?.title || competitorsData[0].productName || 'Not available'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Meta Description:</span>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {(competitorsData[0] as any)?.metaDescription || competitorsData[0].description || 'Not available'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {seoData?.target_keywords && seoData.target_keywords.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="font-semibold text-foreground block">Target Keywords Tracked:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {seoData.target_keywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs py-0.5 px-2">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical On-Page SEO Telemetry */}
                {seoData?.target_onpage_audit && (
                  <div className="space-y-3 pt-3 border-t border-border/70">
                    <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                      Technical On-Page Audit
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-muted/20 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Image Alt Tags</span>
                        <span className="font-bold text-foreground text-xs">
                          {seoData.target_onpage_audit.image_alts_count}
                          {seoData.target_onpage_audit.total_images_count !== undefined && (
                            <span className="text-muted-foreground font-normal text-[10px]"> / {seoData.target_onpage_audit.total_images_count}</span>
                          )}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Canonical URL</span>
                        <span className={`font-bold text-xs ${seoData.target_onpage_audit.canonical_status === 'valid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {seoData.target_onpage_audit.canonical_status}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Structured Data</span>
                        <span className={`font-bold text-xs ${seoData.target_onpage_audit.has_structured_data ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {seoData.target_onpage_audit.has_structured_data ? 'Detected' : 'None'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-border">
                        <span className="text-[10px] text-muted-foreground block">H1 Hierarchy</span>
                        <span className={`font-bold text-xs ${seoData.target_onpage_audit.h1_status === 'optimal' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {seoData.target_onpage_audit.h1_count} ({seoData.target_onpage_audit.h1_status})
                        </span>
                      </div>
                    </div>
                    {seoData.target_onpage_audit.audit_warnings && seoData.target_onpage_audit.audit_warnings.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {seoData.target_onpage_audit.audit_warnings.map((w: string, idx: number) => (
                          <p key={idx} className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{w}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* SALES TAB                                   */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="sales" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span>Commercial & Marketplace Sales Telemetry</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Sales</span>
                      {data?.my_sales_analysis?.last_sales_increase && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">
                          +1 sale
                        </Badge>
                      )}
                    </div>
                    <div className="text-lg font-bold text-foreground mt-1">
                      {getProductSales(myProduct)}
                    </div>
                    {data?.my_sales_analysis?.last_sales_increase ? (
                      <span className="text-[10px] text-emerald-400 mt-0.5 block flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 inline shrink-0" />
                        <span>+1 Sale recorded {data.my_sales_analysis.time_since_last_increase || 'recently'} ({new Date(data.my_sales_analysis.last_sales_increase).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">units sold</span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">List Price</span>
                    <div className="text-lg font-bold text-foreground mt-1">
                      {getProductPrice(myProduct)}
                    </div>
                    {myProduct?.envatoSales?.discounted_price && (
                      <span className="text-[10px] text-emerald-400">
                        Sale: ${myProduct.envatoSales.discounted_price}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Estimated GMV</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {(() => {
                        const s = myProduct?.envatoSales?.current_total_sales ?? (myProduct?.envatoSales as any)?.totalSales
                        const p = parseFloat(String(myProduct?.envatoSales?.product_price || (myProduct?.envatoSales as any)?.price || '').replace(/[^0-9.]/g, ''))
                        if (s && p) return `$${Math.round(s * p).toLocaleString()}`
                        return 'Not available'
                      })()}
                    </div>
                    <span className="text-[10px] text-muted-foreground">gross merchandise value</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* REVIEWS TAB                                 */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="reviews" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>Buyer Ratings & Reviews Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/20 border border-border">
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-foreground">
                      {getProductRating(myProduct)}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 text-amber-400 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {getProductReviewCount(myProduct)}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 border-l border-border pl-6">
                    <span className="font-semibold text-foreground text-xs block">Verified Telemetry Status</span>
                    <p className="text-muted-foreground text-[11px]">
                      Customer satisfaction score benchmarked against marketplace averages.
                    </p>
                  </div>
                </div>

                {/* Verified Testimonials / Quotes if available */}
                {myProduct?.testimonials && myProduct.testimonials.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold text-xs text-foreground">Verified Customer Quotes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {myProduct.testimonials.map((item, idx) => {
                        const quote = typeof item === 'string' ? item : item.quote
                        const author = typeof item === 'object' && item && 'author' in item ? (item as any).author : null
                        const role = typeof item === 'object' && item && 'role' in item ? (item as any).role : null
                        return (
                          <div key={idx} className="p-3 rounded-lg bg-muted/15 border border-border/70 space-y-1.5">
                            <p className="text-xs text-foreground italic">"{quote}"</p>
                            {(author || role) && (
                              <p className="text-[10px] text-muted-foreground">
                                — {author || 'Verified User'}{role ? `, ${role}` : ''}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-muted/10 border border-border/70 text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2 text-foreground font-medium text-xs">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Individual Review Commentary Unexposed by Platform</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      This platform's public catalog/API exposes verified aggregate ratings and review counts ({getProductRating(myProduct)} / 5.0 across {getProductReviewCount(myProduct)}), but does not expose individual buyer comment text in public feeds. Zero review text is fabricated.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competitor Ratings Benchmark */}
            {competitorsData.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400" />
                    <span>Cross-Competitor Rating Benchmark</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="divide-y divide-border/60">
                    <div className="flex items-center justify-between py-2 text-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Badge className="text-[9px] py-0 px-1 bg-primary text-primary-foreground">Mine</Badge>
                        {myProduct?.productName || 'My Product'}
                      </span>
                      <span className="flex items-center gap-2 font-bold">
                        ★ {getProductRating(myProduct)}
                        <span className="text-[10px] text-muted-foreground font-normal">({getProductReviewCount(myProduct)})</span>
                      </span>
                    </div>
                    {competitorsData.map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 text-muted-foreground">
                        <span>{comp.productName || `Competitor ${idx + 1}`}</span>
                        <span className="flex items-center gap-2 text-foreground">
                          ★ {getProductRating(comp)}
                          <span className="text-[10px] text-muted-foreground font-normal">({getProductReviewCount(comp)})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* COMPETITORS TAB                             */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="competitors" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">
                  Monitored Competitor Profiles ({competitorsData.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {competitorsData.map((comp, idx) => (
                  <Card key={idx} className="border-border bg-card">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span>{comp.productName || `Competitor ${idx + 1}`}</span>
                          {comp.category && (
                            <Badge variant="outline" className="text-[10px]">{comp.category}</Badge>
                          )}
                        </CardTitle>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1 font-mono"
                        >
                          <span className="truncate">{comp.url}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center p-2 rounded bg-muted/30">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Price</span>
                          <span className="font-bold text-foreground">
                            {getProductPrice(comp)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Sales</span>
                          <span className="font-bold text-foreground">
                            {getProductSales(comp)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Rating</span>
                          <span className="font-bold text-foreground">
                            {getProductRating(comp) !== 'Not available' ? `★ ${getProductRating(comp)}` : 'Not available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Features</span>
                          <span className="font-bold text-foreground">{comp.features?.length || 'Not available'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════ */}
          {/* REPORT TAB                                  */}
          {/* ═══════════════════════════════════════════ */}
          <TabsContent value="report" className="space-y-6">
            {/* Share Control Card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-primary" />
                      <span>Shareable Public Report</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Publish a clean, read-only version of this analysis for stakeholders or team members.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      meta?.shareEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {meta?.shareEnabled ? 'Public Link Active' : 'Sharing Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {meta?.shareEnabled && meta?.shareToken ? (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs">
                      Anyone with this unique link can view a sanitized, read-only version of the analysis covering your selected modules. Internal IDs and raw administrative data are stripped.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 px-3 py-1.5 rounded-md bg-muted/40 border border-border font-mono text-[11px] text-foreground truncate select-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/report/${meta.shareToken}` : `/report/${meta.shareToken}`}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const url = `${window.location.origin}/report/${meta.shareToken}`
                            navigator.clipboard.writeText(url)
                          }}
                          className="text-xs gap-1.5 h-8"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy Link</span>
                        </Button>
                        <Link
                          href={`/report/${meta.shareToken}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="default" className="text-xs gap-1.5 h-8">
                            <ExternalLink className="h-3 w-3" />
                            <span>Open Report</span>
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowShareDialog(true)}
                          className="text-xs h-8 text-muted-foreground"
                        >
                          Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground text-xs">Public access is currently disabled</p>
                      <p className="text-muted-foreground text-[11px]">
                        External visitors attempting to access any prior link will see &quot;Report unavailable.&quot;
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowShareDialog(true)}
                      className="text-xs gap-1.5 h-8 shrink-0"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>Enable Public Sharing</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scorecard Overview Card */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Executive Intelligence Report Summary</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Complete printable scorecard across all active dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-bold text-foreground text-sm">{meta?.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      Generated {new Date(meta?.updatedAt || meta?.createdAt || '').toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-xs">
                    This executive intelligence report compiles competitive position, marketplace pricing, on-page SEO indicators,
                    buyer feedback categories, and strategic opportunities for {meta?.ownProduct?.name || 'your target product'}.
                  </p>
                  <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">Included Modules:</span>
                    {(meta?.selectedModules && meta.selectedModules.length > 0
                      ? meta.selectedModules
                      : ['product_intelligence', 'seo', 'sales', 'reviews', 'comments', 'opportunities']
                    ).map((mod) => (
                      <Badge key={mod} variant="secondary" className="text-[10px] uppercase font-mono">
                        {mod.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="text-xs gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Print / Save as PDF</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Share Configuration Dialog */}
      {showShareDialog && (
        <ShareAnalysisDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          analysisId={id}
          analysisName={meta?.name || 'Analysis Workspace'}
          initialShareEnabled={!!meta?.shareEnabled}
          initialShareToken={meta?.shareToken || null}
          onShareUpdated={(enabled: boolean, token: string | null) => {
            setMeta((prev) => (prev ? { ...prev, shareEnabled: enabled, shareToken: token } : null))
          }}
        />
      )}

      {/* Admin Delete Confirmation Dialog with Name Matching */}
      {showDeleteDialog && (
        <DeleteAnalysisDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          analysisId={id}
          analysisName={meta?.name || meta?.ownProduct?.url || 'Analysis Workspace'}
          onDeleted={() => {
            router.push('/analyses')
          }}
        />
      )}
    </div>
  )
}
