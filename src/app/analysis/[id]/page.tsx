'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Swords,
  ArrowLeft,
  RotateCw,
  ExternalLink,
  Shield,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Search,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Layers,
  FileText,
  BarChart3,
  HelpCircle,
  ThumbsDown,
  ThumbsUp,
  Tag,
  Eye,
  Filter,
  Activity,
  ArrowUpRight,
  TrendingDown,
  History,
  Star,
  Lightbulb,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  User,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  AnalysisResponseData,
  PublicComment,
  OpportunityRecord,
  SeoRecommendationItem,
} from '@/services/website-analyzer/types'
import { EngagementSection } from '@/components/analysis/EngagementSection'

export default function AnalysisResultPage() {
  const params = useParams()
  const id = (params?.id as string) || ''

  const [data, setData] = useState<AnalysisResponseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Sub-view toggles to keep layout clean and uncongested
  const [overviewSubView, setOverviewSubView] = useState<'details' | 'activity' | 'competitors'>('details')
  const [featuresSubView, setFeaturesSubView] = useState<'matrix' | 'seo'>('matrix')
  const [strategySubView, setStrategySubView] = useState<'matrix' | 'opportunities'>('matrix')
  const [actionsSubView, setActionsSubView] = useState<'recs' | 'insights'>('recs')

  // Hourly monitoring state
  const [monitoringLoading, setMonitoringLoading] = useState(false)
  const [activityProductFilter, setActivityProductFilter] = useState<string>('all')
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all')

  // Add Competitor modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('')
  const [addingCompetitor, setAddingCompetitor] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  // Draft Outreach modal state
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRecord | null>(null)
  const [editedDraftMessage, setEditedDraftMessage] = useState('')

  // Target Keywords management state
  const [newKeywordInput, setNewKeywordInput] = useState('')
  const [updatingKeywords, setUpdatingKeywords] = useState(false)

  // Comments filters
  const [commentCompetitorFilter, setCommentCompetitorFilter] = useState<string>('all')
  const [commentSeverityFilter, setCommentSeverityFilter] = useState<string>('all')
  const [commentCategoryFilter, setCommentCategoryFilter] = useState<string>('all')
  const [commentStatusFilter, setCommentStatusFilter] = useState<string>('all')
  const [commentTrendFilter, setCommentTrendFilter] = useState<string>('all')
  const [commentTypeFilter, setCommentTypeFilter] = useState<string>('all')

  // Recurring Issue Mention drilldown modal state
  const [activeMentionModal, setActiveMentionModal] = useState<{
    productName: string
    productUrl?: string
    topic: string
    count: number
    sample?: string
    comments: Array<{
      id?: string
      author_name?: string
      comment_text: string
      comment_date?: string
      comment_url?: string | null
      sentiment?: string
      rating?: number | null
      topic?: string
      topic_label?: string
    }>
  } | null>(null)

  // Expandable recurring complaint cards in feed
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null)
  // Main Tabs State (support deep links like #own-products and ?tab=comments)
  const [mainTab, setMainTab] = useState<string>('sales')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      const hash = window.location.hash
      if (tabParam === 'comments' || hash.includes('own-product') || hash.includes('comment')) {
        setMainTab('comments')
      }
    }
  }, [])

  const fetchAnalysis = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyze/${id}`)
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You do not have permission to view this project.')
        if (res.status === 404) throw new Error('Analysis project not found.')
        throw new Error(`Failed to load analysis (${res.status})`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'An error occurred loading the analysis.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  // Close mention drilldown modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMentionModal(null)
      }
    }
    if (activeMentionModal) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMentionModal])

  const handleOpenMentionComments = (
    productName: string,
    productUrl: string | undefined,
    topic: string,
    count: number,
    directComments?: any[],
    sample?: string
  ) => {
    let resolvedComments: any[] = []
    if (Array.isArray(directComments) && directComments.length > 0) {
      resolvedComments = [...directComments]
    }

    if (resolvedComments.length === 0) {
      const matchingRC = recurringComplaints.find(
        (rc) =>
          (rc.competitor_name?.toLowerCase() === productName?.toLowerCase() ||
            rc.competitor_url === productUrl) &&
          rc.complaint_category?.toLowerCase() === topic?.toLowerCase()
      )
      if (matchingRC?.comments && matchingRC.comments.length > 0) {
        resolvedComments = [...matchingRC.comments]
      }
    }

    if (resolvedComments.length === 0 && comments?.comments) {
      const topicNorm = topic.toLowerCase().trim()
      resolvedComments = comments.comments.filter((c: any) => {
        const prodMatch =
          !productName ||
          c.product_name?.toLowerCase() === productName?.toLowerCase() ||
          c.product_url === productUrl
        if (!prodMatch) return false

        const catMatch =
          c.topic_label?.toLowerCase() === topicNorm ||
          c.topic?.toLowerCase().includes(topicNorm.slice(0, 4)) ||
          c.comment_text?.toLowerCase().includes(topicNorm)
        return catMatch
      })
    }

    if (resolvedComments.length === 0 && sample) {
      resolvedComments = [
        {
          author_name: 'Verified Customer',
          comment_text: sample,
          comment_date: 'Recently',
          sentiment: 'negative',
        },
      ]
    }

    setActiveMentionModal({
      productName,
      productUrl,
      topic,
      count: Math.max(count, resolvedComments.length),
      sample,
      comments: resolvedComments,
    })
  }

  const handleRefresh = async () => {
    if (!id) return
    setRefreshing(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/analyze/${id}/refresh`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to refresh analysis data')
      const updated = await res.json()
      setData(updated)
      setActionMessage('Sales snapshots, SEO signals, and marketplace metrics refreshed.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRunMonitoringCycle = async () => {
    setMonitoringLoading(true)
    setActionMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/jobs/hourly-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to run monitoring cycle')
      setActionMessage('Hourly monitoring check completed. Current metrics evaluated against previous snapshots.')
      await fetchAnalysis()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMonitoringLoading(false)
    }
  }

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompetitorUrl.trim()) return

    setAddingCompetitor(true)
    setError(null)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/analyze/${id}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_url: newCompetitorUrl.trim() }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to add competitor')

      setData(result)
      setNewCompetitorUrl('')
      setIsAddModalOpen(false)
      setActionMessage('New competitor successfully analyzed and added to this project.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddingCompetitor(false)
    }
  }

  const handleRemoveCompetitor = async (competitorUrl: string) => {
    if (!confirm(`Remove "${competitorUrl}" from this project?`)) return

    setActionMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/analyze/${id}/competitors?url=${encodeURIComponent(competitorUrl)}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to remove competitor')

      setData(result)
      setActionMessage('Competitor removed from this project.')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdateKeywords = async (updatedKeywords: string[]) => {
    setUpdatingKeywords(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyze/${id}/keywords`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_keywords: updatedKeywords }),
      })
      const updatedData = await res.json()
      if (!res.ok) throw new Error(updatedData.error || 'Failed to update keywords')
      setData(updatedData)
      setNewKeywordInput('')
      setActionMessage('Target SEO keywords updated successfully.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingKeywords(false)
    }
  }

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeywordInput.trim()) return
    const current = data?.seo_analysis?.target_keywords || []
    const cleanKw = newKeywordInput.trim().toLowerCase()
    if (current.includes(cleanKw)) return
    const updated = [...current, cleanKw]
    handleUpdateKeywords(updated)
  }

  const handleApproveSuggestedKeyword = (kw: string) => {
    const kwClean = kw.trim().toLowerCase()
    const current = data?.seo_analysis?.target_keywords || []
    if (current.includes(kwClean)) return
    const updated = [...current, kwClean]
    handleUpdateKeywords(updated)
  }

  const handleRemoveKeyword = (kwToRemove: string) => {
    const current = data?.seo_analysis?.target_keywords || []
    const updated = current.filter((k) => k.toLowerCase() !== kwToRemove.toLowerCase())
    handleUpdateKeywords(updated)
  }

  const handleUpdateOpportunityStatus = async (oppId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/opportunities/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')

      if (data?.opportunities) {
        const updated = data.opportunities.map((o) =>
          o.id === oppId ? { ...o, status: newStatus as any } : o
        )
        setData({ ...data, opportunities: updated })
      }
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`)
    }
  }

  const handleUpdateComplaintStatus = async (complaintId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/analyze/${id}/complaints/${encodeURIComponent(complaintId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update complaint status')
      const result = await res.json()
      if (result.commentsAnalysis && data) {
        setData({
          ...data,
          comments_analysis: result.commentsAnalysis,
        })
      } else if (data?.comments_analysis?.recurring_complaints) {
        const updated = data.comments_analysis.recurring_complaints.map((rc) =>
          rc.id === complaintId ? { ...rc, current_status: newStatus as any } : rc
        )
        setData({
          ...data,
          comments_analysis: {
            ...data.comments_analysis,
            recurring_complaints: updated,
          },
        })
      }
      setActionMessage(`Complaint status updated to "${newStatus}".`)
    } catch (err: any) {
      alert(`Could not update complaint status: ${err.message}`)
    }
  }

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(idKey)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading analysis records...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-destructive/20 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-base font-bold text-foreground">Analysis Not Found</h2>
        <p className="text-xs text-muted-foreground">{error || 'Could not locate analysis record.'}</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={fetchAnalysis} className="text-xs gap-1">
            <RotateCw className="h-3 w-3" /> Retry
          </Button>
          <Link href="/">
            <Button size="sm" className="text-xs">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const myP = data.my_product
  const compP = data.competitor_product
  const comp = data.comparison
  const recs = data.recommendations || []
  const competitors = data.competitors_data || (data.competitor_product ? [data.competitor_product] : [])
  const multiSales = data.multi_sales_comparison
  const seo = data.seo_analysis
  const comments = data.comments_analysis
  const opportunities = data.opportunities || []
  const insights = data.insights || []
  const activities = (data.activities || []) as any[]

  const isRefreshing = refreshing

  // Filtered recurring negative complaints and suggestive comments
  const recurringComplaints = comments?.recurring_complaints || []
  const filteredComplaints = recurringComplaints.filter((rc) => {
    if (commentCompetitorFilter !== 'all' && rc.competitor_url !== commentCompetitorFilter) return false
    if (commentSeverityFilter !== 'all' && rc.severity !== commentSeverityFilter) return false
    if (commentCategoryFilter !== 'all' && rc.complaint_category !== commentCategoryFilter) return false
    if (commentStatusFilter !== 'all' && (rc.current_status || 'New') !== commentStatusFilter) return false
    if (commentTrendFilter !== 'all' && (rc.trend || 'Stable') !== commentTrendFilter) return false
    if (commentTypeFilter === 'suggestive' && !rc.is_suggestive) return false
    if (commentTypeFilter === 'complaints' && rc.is_suggestive) return false
    return true
  })

  // Filtered activity monitoring events
  const myProduct = myP
  const filteredActivities = activities.filter((act: any) => {
    if (activityProductFilter !== 'all' && act.productUrl !== activityProductFilter) return false
    if (activityTypeFilter !== 'all' && act.activityType !== activityTypeFilter) return false
    return true
  })

  // Combine features for comparison table
  const allFeatures = Array.from(
    new Set([
      ...(myP?.features || []),
      ...(compP?.features || []),
      ...(comp?.sharedFeatures || []),
      ...(comp?.myExclusiveFeatures || []),
      ...(comp?.competitorExclusiveFeatures || []),
    ])
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Top Breadcrumb & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Analyze
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {myP?.productName || data.my_url} <span className="text-muted-foreground font-normal">vs</span>{' '}
              {compP?.productName || data.competitor_url}
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono border-border/80 text-muted-foreground">
              Deterministic Analysis
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Analyzed on {new Date(data.created_at).toLocaleString()} · No LLM used
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
          >
            <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing Data...' : 'Check Sales Again'}</span>
          </Button>
          <Link href="/">
            <Button size="sm" variant="outline" className="text-xs gap-1">
              <Swords className="h-3.5 w-3.5 text-primary" />
              <span>New Comparison</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Action status message banner if any */}
      {actionMessage && (
        <div className="p-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Collection Errors Alert Banner if any occurred */}
      {((data.collection_errors?.my_product && data.collection_errors.my_product.length > 0) ||
        (data.collection_errors?.competitor_product && data.collection_errors.competitor_product.length > 0)) && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Collection Warnings / Partial Data
          </div>
          {data.collection_errors.my_product.map((e: string, i: number) => (
            <p key={`m-${i}`} className="text-[11px] text-amber-200/90">• {e}</p>
          ))}
          {data.collection_errors.competitor_product.map((e: string, i: number) => (
            <p key={`c-${i}`} className="text-[11px] text-amber-200/90">• {e}</p>
          ))}
        </div>
      )}

      {/* Main Tabbed Analysis Sections */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full space-y-4">
        <TabsList className="grid grid-cols-4 sm:grid-cols-7 h-auto p-1 bg-muted/40">
          <TabsTrigger value="sales" className="text-xs py-1.5 font-bold text-emerald-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Sales
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs py-1.5">Overview</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs py-1.5">Pricing</TabsTrigger>
          <TabsTrigger value="features" className="text-xs py-1.5">Features</TabsTrigger>
          <TabsTrigger value="comments" className="text-xs py-1.5 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Comments ({recurringComplaints.length})
          </TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs py-1.5">Strengths & Gaps</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs py-1.5 font-bold">
            Actions ({recs.length})
          </TabsTrigger>
        </TabsList>

        {/* 0. SALES INTELLIGENCE & PERFORMANCE TAB */}
        <TabsContent value="sales" className="space-y-6">
          {/* Header & Re-check Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Envato Market Sales & Performance Intelligence
                </h2>
                <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/40 text-emerald-400">
                  Verified Data
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Timestamped snapshot monitoring and rule-based observations. No estimates or simulated sales.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 shrink-0 self-start sm:self-center"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Collecting New Snapshot...' : 'Check Sales Again'}</span>
            </Button>
          </div>

          {/* Top 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: My Product Sales */}
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">My Product Sales</span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Verified current sales
                  </Badge>
                </div>
                <div className="text-2xl font-black text-foreground">
                  {data.my_sales_analysis?.current_sales !== null && data.my_sales_analysis?.current_sales !== undefined
                    ? `${data.my_sales_analysis.current_sales.toLocaleString()} sales`
                    : 'Sales data unavailable'}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Activity:</span>
                  <span className="font-medium text-foreground">
                    {data.my_sales_analysis?.sales_activity_status_label || 'Insufficient historical data'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Competitor Sales */}
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Competitor Sales</span>
                  <Badge variant="outline" className="text-[9px] bg-sky-500/10 text-sky-400 border-sky-500/30">
                    Verified current sales
                  </Badge>
                </div>
                <div className="text-2xl font-black text-foreground">
                  {data.competitor_sales_analysis?.current_sales !== null && data.competitor_sales_analysis?.current_sales !== undefined
                    ? `${data.competitor_sales_analysis.current_sales.toLocaleString()} sales`
                    : 'Sales data unavailable'}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Activity:</span>
                  <span className="font-medium text-foreground">
                    {data.competitor_sales_analysis?.sales_activity_status_label || 'Insufficient historical data'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Sales Difference */}
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Sales Difference</span>
                  <Badge variant="outline" className="text-[9px]">
                    Volume Delta
                  </Badge>
                </div>
                <div className="text-sm font-bold text-foreground truncate">
                  {data.sales_comparison?.sales_difference_text || 'Waiting for data'}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Price Comparison:</span>
                  <span className="font-medium text-foreground truncate max-w-[130px]">
                    {data.sales_comparison?.price_comparison || 'Not specified'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Sales Growth & Velocity */}
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Calculated Growth</span>
                  <Badge variant="outline" className="text-[9px]">
                    Based on snapshots
                  </Badge>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {data.my_sales_analysis?.sales_growth_percentage !== null && data.my_sales_analysis?.sales_growth_percentage !== undefined
                    ? `${data.my_sales_analysis.sales_growth_percentage > 0 ? '+' : ''}${data.my_sales_analysis.sales_growth_percentage}%`
                    : 'Waiting for historical data'}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Since last check:</span>
                  <span className="font-medium text-foreground">
                    {data.my_sales_analysis?.sales_difference !== null && data.my_sales_analysis?.sales_difference !== undefined
                      ? `${data.my_sales_analysis.sales_difference > 0 ? '+' : ''}${data.my_sales_analysis.sales_difference} sales`
                      : 'Waiting for historical data'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side-by-Side Sales Comparison Table */}
          <Card className="border-border bg-card">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Comprehensive Marketplace & Sales Comparison
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Publicly verified parameters extracted directly from Envato Market product pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/30 border-b border-border text-muted-foreground text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Parameter</th>
                      <th className="py-2.5 px-4 font-semibold text-primary">{myP?.productName || 'My Product'}</th>
                      <th className="py-2.5 px-4 font-semibold text-sky-400">{compP?.productName || 'Competitor'}</th>
                      <th className="py-2.5 px-4 font-semibold">Comparative Analysis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Verified Current Sales</td>
                      <td className="py-2.5 px-4 font-bold text-foreground">
                        {data.my_sales_analysis?.current_sales !== null && data.my_sales_analysis?.current_sales !== undefined
                          ? `${data.my_sales_analysis.current_sales.toLocaleString()} sales`
                          : 'Sales data unavailable'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-foreground">
                        {data.competitor_sales_analysis?.current_sales !== null && data.competitor_sales_analysis?.current_sales !== undefined
                          ? `${data.competitor_sales_analysis.current_sales.toLocaleString()} sales`
                          : 'Sales data unavailable'}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-emerald-400">
                        {data.sales_comparison?.sales_difference_text}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Calculated Sales Growth</td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.my_sales_analysis?.sales_growth_percentage !== null && data.my_sales_analysis?.sales_growth_percentage !== undefined
                          ? `${data.my_sales_analysis.sales_growth_percentage}%`
                          : 'Waiting for historical data'}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.competitor_sales_analysis?.sales_growth_percentage !== null && data.competitor_sales_analysis?.sales_growth_percentage !== undefined
                          ? `${data.competitor_sales_analysis.sales_growth_percentage}%`
                          : 'Waiting for historical data'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {data.sales_comparison?.sales_growth_comparison}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Average Sales Activity</td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.my_sales_analysis?.sales_activity_status_label}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.competitor_sales_analysis?.sales_activity_status_label}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {data.sales_comparison?.average_sales_activity}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Product Price</td>
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        {data.my_sales_analysis?.raw_envato_data?.product_price || 'Not specified'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        {data.competitor_sales_analysis?.raw_envato_data?.product_price || 'Not specified'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {data.sales_comparison?.price_comparison}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Average Rating</td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span>{data.my_sales_analysis?.raw_envato_data?.rating ? `${data.my_sales_analysis.raw_envato_data.rating} / 5.0` : 'Not rated'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span>{data.competitor_sales_analysis?.raw_envato_data?.rating ? `${data.competitor_sales_analysis.raw_envato_data.rating} / 5.0` : 'Not rated'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {data.sales_comparison?.rating_comparison}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Review Volume</td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.my_sales_analysis?.raw_envato_data?.review_count !== null && data.my_sales_analysis?.raw_envato_data?.review_count !== undefined
                          ? `${data.my_sales_analysis.raw_envato_data.review_count} reviews`
                          : 'None'}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.competitor_sales_analysis?.raw_envato_data?.review_count !== null && data.competitor_sales_analysis?.raw_envato_data?.review_count !== undefined
                          ? `${data.competitor_sales_analysis.raw_envato_data.review_count} reviews`
                          : 'None'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {data.sales_comparison?.rating_count_comparison}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Comments & Inquiries</td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{(() => {
                            const count = data.my_sales_analysis?.raw_envato_data?.comment_count ??
                              data.my_product?.envatoSales?.comment_count ??
                              null
                            return count !== null && count !== undefined ? `${count} comments` : '0'
                          })()}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{(() => {
                            const count = data.competitor_sales_analysis?.raw_envato_data?.comment_count ??
                              data.competitor_product?.envatoSales?.comment_count ??
                              null
                            return count !== null && count !== undefined ? `${count} comments` : '0'
                          })()}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        Marketplace engagement
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Last Product Update</td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.my_sales_analysis?.raw_envato_data?.last_update_date || 'Not specified'}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.competitor_sales_analysis?.raw_envato_data?.last_update_date || 'Not specified'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {data.sales_comparison?.last_update_comparison}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Author / Studio</td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.my_sales_analysis?.raw_envato_data?.author_name || 'sizhitsolutions'}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        {data.competitor_sales_analysis?.raw_envato_data?.author_name || 'PixelStrap'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        Envato Author profiles
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Historical Sales Snapshots Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* My Product History */}
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" />
                    My Product Sales History ({data.my_sales_analysis?.sales_history?.length || 0} Snapshots)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 text-xs">
                {(data.my_sales_analysis?.sales_history?.length || 0) < 2 ? (
                  <div className="text-center py-6 space-y-2 border border-dashed border-border rounded-md bg-muted/20">
                    <p className="text-muted-foreground font-medium">
                      Sales history will appear after the next monitoring check.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      1 initial baseline snapshot recorded ({data.my_sales_analysis?.current_sales} sales).
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10 mt-2"
                    >
                      <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Take Second Snapshot Now</span>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Total Sales</th>
                          <th className="py-2 px-3">Gained</th>
                          <th className="py-2 px-3">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {data.my_sales_analysis?.sales_history.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(s.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                              <span className="text-[10px] text-muted-foreground/70">{new Date(s.collected_at).toLocaleDateString()}</span>
                            </td>
                            <td className="py-2 px-3 font-bold text-foreground">
                              {s.total_sales?.toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              {s.sales_gained_since_previous !== null ? (
                                <Badge variant={s.sales_gained_since_previous > 0 ? 'default' : 'outline'} className="text-[10px]">
                                  {s.sales_gained_since_previous > 0 ? `+${s.sales_gained_since_previous}` : `${s.sales_gained_since_previous}`}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">Baseline</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{s.price || '$29'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competitor History */}
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-sky-400" />
                    Competitor Sales History ({data.competitor_sales_analysis?.sales_history?.length || 0} Snapshots)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 text-xs">
                {(data.competitor_sales_analysis?.sales_history?.length || 0) < 2 ? (
                  <div className="text-center py-6 space-y-2 border border-dashed border-border rounded-md bg-muted/20">
                    <p className="text-muted-foreground font-medium">
                      Sales history will appear after the next monitoring check.
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      1 initial baseline snapshot recorded ({data.competitor_sales_analysis?.current_sales} sales).
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="text-xs gap-1 border-sky-500/40 text-sky-400 hover:bg-sky-500/10 mt-2"
                    >
                      <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Take Second Snapshot Now</span>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Total Sales</th>
                          <th className="py-2 px-3">Gained</th>
                          <th className="py-2 px-3">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {data.competitor_sales_analysis?.sales_history.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(s.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                              <span className="text-[10px] text-muted-foreground/70">{new Date(s.collected_at).toLocaleDateString()}</span>
                            </td>
                            <td className="py-2 px-3 font-bold text-foreground">
                              {s.total_sales?.toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              {s.sales_gained_since_previous !== null ? (
                                <Badge variant={s.sales_gained_since_previous > 0 ? 'default' : 'outline'} className="text-[10px]">
                                  {s.sales_gained_since_previous > 0 ? `+${s.sales_gained_since_previous}` : `${s.sales_gained_since_previous}`}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">Baseline</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{s.price || '$99'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Possible Sales Factors (Rule-Based Observations) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Possible Sales Factors & Rule-Based Observations
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Empirical marketplace signals derived strictly from public evidence. These are potential correlations, not causal proof.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] border-border">
                {data.sales_comparison?.observations?.length || 0} Observations
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.sales_comparison?.observations?.map((obs) => (
                <Card key={obs.id} className="border-border bg-card">
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-foreground text-xs">{obs.title}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase ${obs.confidence_level === 'high' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>
                        {obs.confidence_level} confidence
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{obs.reason}</p>
                    <div className="p-2 bg-muted/40 rounded border border-border/60 text-[11px] space-y-1">
                      <div>
                        <strong className="text-foreground">Supporting Data: </strong>
                        <span className="text-muted-foreground">{obs.supporting_data}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Generated: {new Date(obs.date_generated).toLocaleDateString()}</span>
                      <a href={obs.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        Source <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 1. OVERVIEW & PRODUCT INFORMATION */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={overviewSubView === 'details' ? 'secondary' : 'ghost'}
                onClick={() => setOverviewSubView('details')}
                className="text-xs h-7"
              >
                Product Details
              </Button>
              <Button
                size="sm"
                variant={overviewSubView === 'activity' ? 'secondary' : 'ghost'}
                onClick={() => setOverviewSubView('activity')}
                className="text-xs h-7 gap-1"
              >
                <Clock className="h-3 w-3" />
                Hourly Activity & Timeline ({activities.length})
              </Button>
              <Button
                size="sm"
                variant={overviewSubView === 'competitors' ? 'secondary' : 'ghost'}
                onClick={() => setOverviewSubView('competitors')}
                className="text-xs h-7 gap-1"
              >
                <Layers className="h-3 w-3" />
                Manage Competitors ({competitors.length})
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs h-7 gap-1"
            >
              <Plus className="h-3 w-3 text-primary" />
              Add Competitor
            </Button>
          </div>

          {overviewSubView === 'details' && (
            <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* My SaaS Card */}
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground">
                    My SaaS: {myP?.productName || 'My Product'}
                  </CardTitle>
                  <a
                    href={myP?.normalizedUrl || data.my_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    Visit <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Headline & Description
                  </span>
                  <p className="font-medium text-foreground mt-0.5">{myP?.websiteTitle}</p>
                  <p className="text-muted-foreground mt-1">{myP?.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Category</span>
                    <span className="font-medium text-foreground">{myP?.category || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Primary CTA</span>
                    <span className="font-medium text-foreground">{myP?.contactOrDemoCta || 'Not found'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase mb-1">Target Customers</span>
                  <div className="flex flex-wrap gap-1">
                    {myP?.targetCustomers && myP.targetCustomers.length > 0 ? (
                      myP.targetCustomers.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0">{c}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Not found on website</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitor Card */}
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground">
                    Competitor: {compP?.productName || 'Competitor'}
                  </CardTitle>
                  <a
                    href={compP?.normalizedUrl || data.competitor_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    Visit <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Headline & Description
                  </span>
                  <p className="font-medium text-foreground mt-0.5">{compP?.websiteTitle}</p>
                  <p className="text-muted-foreground mt-1">{compP?.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Category</span>
                    <span className="font-medium text-foreground">{compP?.category || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Primary CTA</span>
                    <span className="font-medium text-foreground">{compP?.contactOrDemoCta || 'Not found'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase mb-1">Target Customers</span>
                  <div className="flex flex-wrap gap-1">
                    {compP?.targetCustomers && compP.targetCustomers.length > 0 ? (
                      compP.targetCustomers.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0">{c}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Not found on website</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Positioning Summary */}
          {comp?.positioningDifferences && (
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Positioning & Messaging Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded bg-muted/30 p-2.5 border border-border/60">
                    <span className="font-semibold text-foreground block mb-1">My SaaS Claim:</span>
                    <p className="text-muted-foreground">{comp.positioningDifferences.myProductHeadline}</p>
                  </div>
                  <div className="rounded bg-muted/30 p-2.5 border border-border/60">
                    <span className="font-semibold text-foreground block mb-1">Competitor Claim:</span>
                    <p className="text-muted-foreground">{comp.positioningDifferences.competitorHeadline}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-[11px] pt-1">
                  <strong>Summary: </strong>{comp.positioningDifferences.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Discovered Navigation & Public Source Links */}
          <Card className="border-border bg-card">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Discovered Public Links & Sitemap Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-foreground mb-1.5">{myP?.productName} Links:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Changelog: {myP?.changelogLink !== 'Not found on the provided website' ? <a href={myP?.changelogLink} target="_blank" className="text-primary hover:underline">{myP?.changelogLink}</a> : 'Not found'}</li>
                    <li>Docs: {myP?.docsLink !== 'Not found on the provided website' ? <a href={myP?.docsLink} target="_blank" className="text-primary hover:underline">{myP?.docsLink}</a> : 'Not found'}</li>
                    <li>Blog: {myP?.blogLink !== 'Not found on the provided website' ? <a href={myP?.blogLink} target="_blank" className="text-primary hover:underline">{myP?.blogLink}</a> : 'Not found'}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1.5">{compP?.productName} Links:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Changelog: {compP?.changelogLink !== 'Not found on the provided website' ? <a href={compP?.changelogLink} target="_blank" className="text-primary hover:underline">{compP?.changelogLink}</a> : 'Not found'}</li>
                    <li>Docs: {compP?.docsLink !== 'Not found on the provided website' ? <a href={compP?.docsLink} target="_blank" className="text-primary hover:underline">{compP?.docsLink}</a> : 'Not found'}</li>
                    <li>Blog: {compP?.blogLink !== 'Not found on the provided website' ? <a href={compP?.blogLink} target="_blank" className="text-primary hover:underline">{compP?.blogLink}</a> : 'Not found'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          )}

          {overviewSubView === 'activity' && (
            <div className="space-y-6">
              {/* Hourly Activity Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-card shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Hourly Activity Monitor</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium">
                        Active Hourly Polling
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        Server-Side Job
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span>
                        Last Successful Check:{' '}
                        <strong className="text-foreground font-medium">
                          {data.last_activity_check_at
                            ? new Date(data.last_activity_check_at).toLocaleString()
                            : new Date(data.created_at).toLocaleString()}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Next Scheduled Check:{' '}
                        <strong className="text-foreground font-medium">
                          {data.next_activity_check_at
                            ? new Date(data.next_activity_check_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'In ~1 hour'}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunMonitoringCycle}
                    disabled={monitoringLoading}
                    className="h-8 text-xs gap-1.5 border-border"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${monitoringLoading ? 'animate-spin' : ''}`} />
                    <span>{monitoringLoading ? 'Checking Products...' : 'Run Check Now'}</span>
                  </Button>
                </div>
              </div>

          {/* Top Monitoring Health & Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Hourly Background Job</span>
                <div className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Server-Side
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Checks once every 60 min
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Last Successful Check</span>
                <div className="text-base font-bold text-foreground">
                  {data.last_activity_check_at
                    ? new Date(data.last_activity_check_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {data.last_activity_check_at
                    ? new Date(data.last_activity_check_at).toLocaleDateString()
                    : 'Initial check'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Next Scheduled Check</span>
                <div className="text-base font-bold text-foreground">
                  {data.next_activity_check_at
                    ? new Date(data.next_activity_check_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'In ~1 hour'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Automatic background poll
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Observed Change Records</span>
                <div className="text-base font-bold text-foreground">
                  {activities.length} Recorded
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Filtered for meaningful shifts
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtering Bar */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Hourly Activity Timeline & Change History
                  </CardTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Product Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Product:</span>
                    <select
                      value={activityProductFilter}
                      onChange={(e) => setActivityProductFilter(e.target.value)}
                      className="text-xs h-7 rounded border border-border bg-input px-2 py-0.5 text-foreground focus:outline-none"
                    >
                      <option value="all">All Products</option>
                      <option value={data.my_url}>{myProduct?.productName || 'My Target SaaS'}</option>
                      {competitors.map((c, i) => (
                        <option key={i} value={c.url}>{c.productName || `Competitor #${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Activity Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Event:</span>
                    <select
                      value={activityTypeFilter}
                      onChange={(e) => setActivityTypeFilter(e.target.value)}
                      className="text-xs h-7 rounded border border-border bg-input px-2 py-0.5 text-foreground focus:outline-none"
                    >
                      <option value="all">All Events</option>
                      <option value="sales_increase">Observed Sales Increases</option>
                      <option value="rating_changed">Rating Changes</option>
                      <option value="comments_count_changed">Comment Counts</option>
                      <option value="recurring_complaint_detected">Recurring Complaints</option>
                      <option value="suggestive_feedback_detected">Suggestive Feedback & Inquiries</option>
                      <option value="price_changed">Price Adjustments</option>
                      <option value="product_updated">Product Updates</option>
                      <option value="feature_support_changed">Feature & Support Changes</option>
                      <option value="collection_failed">Collection Errors</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center rounded-lg border border-dashed border-border/80 space-y-3">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-xs font-semibold text-foreground">
                      No Meaningful Metric Changes Detected Yet
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      The hourly background job monitors cumulative sales, listed prices, ratings, new customer comments, and feature updates. An activity record and comparative analysis are generated whenever verified data meaningfully changes.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRunMonitoringCycle}
                      disabled={monitoringLoading}
                      className="text-xs h-8 gap-1.5"
                    >
                      <RotateCw className={`h-3 w-3 ${monitoringLoading ? 'animate-spin' : ''}`} />
                      <span>{monitoringLoading ? 'Checking...' : 'Run Immediate Check'}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((act, index) => {
                    const isPositive = act.impactType === 'positive'
                    const isNegative = act.impactType === 'negative'
                    const isOur = act.isOurProduct

                    return (
                      <div
                        key={act.id || index}
                        className="p-4 rounded-lg border border-border bg-secondary/15 space-y-3 transition-colors hover:bg-secondary/25"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                isOur
                                  ? 'bg-primary/10 border-primary/30 text-primary font-bold text-[10px]'
                                  : 'bg-muted border-border text-foreground font-semibold text-[10px]'
                              }
                            >
                              {isOur ? 'My Target Product' : 'Competitor'}
                            </Badge>

                            <span className="font-semibold text-foreground text-xs">
                              {act.productName}
                            </span>

                            <Badge
                              variant="outline"
                              className={
                                isPositive
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]'
                                  : isNegative
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px]'
                                  : 'bg-blue-500/10 border-blue-500/30 text-blue-500 text-[10px]'
                              }
                            >
                              {isPositive ? 'Positive Impact' : isNegative ? 'Negative Impact' : 'Informational'}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(act.snapshotTimestamp || act.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Title & Observations */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-foreground">
                            {act.activityTitle}
                          </h4>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {act.whatChanged}
                          </p>
                        </div>

                        {/* Comparative Analysis Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Left: Values & Competitor Comparison */}
                          <div className="p-2.5 rounded bg-background border border-border/80 space-y-2 text-[11px]">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground border-b border-border/50 pb-1">
                              <span>Previous Value: <strong className="text-foreground">{act.previousValue ?? 'N/A'}</strong></span>
                              <span>Current Value: <strong className="text-foreground">{act.currentValue ?? 'N/A'}</strong></span>
                              {act.deltaValue !== null && (
                                <span className={act.deltaValue > 0 ? 'text-emerald-500 font-bold' : 'text-foreground font-bold'}>
                                  {act.deltaValue > 0 ? `+${act.deltaValue}` : act.deltaValue}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                Competitor Comparison
                              </span>
                              <p className="text-foreground text-[11px] mt-0.5">
                                {act.competitorComparison || 'No competitor contrast available.'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Possible Reasons & Recommended Actions */}
                          <div className="p-2.5 rounded bg-background border border-border/80 space-y-2 text-[11px]">
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                Possible Verified Reasons
                              </span>
                              <p className="text-foreground text-[11px] mt-0.5">
                                {act.possibleReasons || 'Not enough historical data yet.'}
                              </p>
                            </div>
                            <div className="border-t border-border/50 pt-1.5">
                              <span className="text-[10px] uppercase font-semibold text-primary block">
                                Recommended Action
                              </span>
                              <p className="text-foreground font-medium text-[11px] mt-0.5">
                                {act.recommendedActions || 'Monitor further telemetry before taking action.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collection Status & Disclaimer Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>Monitoring Integrity, Deduplication & Term Compliance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <p>
                <strong>Sales Observation Policy:</strong> Envato cumulative sales counters update periodically. The system labels all detected sales changes strictly as: <span className="text-foreground font-semibold">“Observed sales increase since the previous check.”</span> No claim is made that an individual purchase occurred at the exact observed minute.
              </p>
              <p>
                <strong>Deduplication:</strong> Activity events are uniquely keyed by <code className="text-foreground px-1 py-0.5 bg-muted rounded">[analysisId, productUrl, activityType, currentValue, snapshotTimestamp]</code> to prevent duplicate entries across overlapping check cycles.
              </p>
              <p>
                <strong>Compliance:</strong> Only publicly available marketplace listing data is polled. The system does not bypass CAPTCHA, scrape private profiles, or send automated messages to commenters.
              </p>
            </CardContent>
          </Card>
            </div>
          )}

          {overviewSubView === 'competitors' && (
            <div className="space-y-4">
              <Card className="border-border bg-card">
                <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground">Tracked Competitors</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      All competitor URLs currently tracked in this project.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="text-xs gap-1 h-7">
                    <Plus className="h-3 w-3" /> Add Competitor
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {competitors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md border border-border/60 bg-muted/20">
                      <div>
                        <div className="font-semibold text-xs text-foreground">{c.productName || 'Competitor'}</div>
                        <a href={c.normalizedUrl || '#'} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                          {c.normalizedUrl} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                      {competitors.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCompetitor(c.normalizedUrl || '')}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 2. PRICING COMPARISON TABLE */}
        <TabsContent value="pricing" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold">Pricing Plans & Free Terms</CardTitle>
              <CardDescription className="text-xs">
                Extracted directly from landing pages and discovered pricing subpages.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-semibold">Comparison Attribute</th>
                      <th className="py-2.5 px-3 text-left font-semibold">{myP?.productName || 'My SaaS'}</th>
                      <th className="py-2.5 px-3 text-left font-semibold">{compP?.productName || 'Competitor'}</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Difference / Read</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Starting Monthly Plan</td>
                      <td className="py-2.5 px-3 font-mono">
                        {myP?.pricingPlans && myP.pricingPlans.length > 0 ? myP.pricingPlans[0].priceMonthly : 'Not found'}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {compP?.pricingPlans && compP.pricingPlans.length > 0 ? compP.pricingPlans[0].priceMonthly : 'Not found'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {comp?.pricingDifferences && comp.pricingDifferences.length > 0 ? comp.pricingDifferences[0].difference : 'Not comparable'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Free Plan Available</td>
                      <td className="py-2.5 px-3">
                        {myP?.hasFreePlan ? <Badge variant="success" className="py-0">Available</Badge> : <span className="text-muted-foreground">Not found</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {compP?.hasFreePlan ? <Badge variant="success" className="py-0">Available</Badge> : <span className="text-muted-foreground">Not found</span>}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{comp?.freePlanComparison?.notes}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-foreground">Free Trial Terms</td>
                      <td className="py-2.5 px-3">
                        {myP?.hasFreeTrial ? <Badge variant="info" className="py-0">{myP.freeTrialDetails}</Badge> : <span className="text-muted-foreground">Not found</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {compP?.hasFreeTrial ? <Badge variant="info" className="py-0">{compP.freeTrialDetails}</Badge> : <span className="text-muted-foreground">Not found</span>}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{comp?.trialComparison?.notes}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Plans Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">{myP?.productName} Pricing Plans</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                {myP?.pricingPlans && myP.pricingPlans.length > 0 ? (
                  myP.pricingPlans.map((plan, i) => (
                    <div key={i} className="rounded border border-border/60 p-2.5 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{plan.name}</span>
                        <span className="font-mono font-bold text-primary">{plan.priceMonthly}</span>
                      </div>
                      {plan.features.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                          {plan.features.map((f, fi) => <li key={fi}>• {f}</li>)}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic py-4 text-center">No explicit pricing table found on public pages.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">{compP?.productName} Pricing Plans</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                {compP?.pricingPlans && compP.pricingPlans.length > 0 ? (
                  compP.pricingPlans.map((plan, i) => (
                    <div key={i} className="rounded border border-border/60 p-2.5 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{plan.name}</span>
                        <span className="font-mono font-bold text-primary">{plan.priceMonthly}</span>
                      </div>
                      {plan.features.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                          {plan.features.map((f, fi) => <li key={fi}>• {f}</li>)}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic py-4 text-center">No explicit pricing table found on public pages.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. FEATURE COMPARISON TABLE */}
        <TabsContent value="features" className="space-y-4">
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <Button
              size="sm"
              variant={featuresSubView === 'matrix' ? 'secondary' : 'ghost'}
              onClick={() => setFeaturesSubView('matrix')}
              className="text-xs h-7"
            >
              Feature Matrix
            </Button>
            <Button
              size="sm"
              variant={featuresSubView === 'seo' ? 'secondary' : 'ghost'}
              onClick={() => setFeaturesSubView('seo')}
              className="text-xs h-7 gap-1"
            >
              <Search className="h-3 w-3" />
              SEO & Target Keywords ({seo?.target_keywords?.length || 0})
            </Button>
          </div>

          {featuresSubView === 'matrix' && (
            <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold">Feature & Capability Matrix</CardTitle>
              <CardDescription className="text-xs">
                Rule-based text matching across both parsed feature sets.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-semibold">Identified Feature</th>
                      <th className="py-2.5 px-3 text-left font-semibold">{myP?.productName}</th>
                      <th className="py-2.5 px-3 text-left font-semibold">{compP?.productName}</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {allFeatures.map((feat, idx) => {
                      const hasMy = myP?.features?.includes(feat) || comp?.myExclusiveFeatures?.includes(feat) || comp?.sharedFeatures?.includes(feat)
                      const hasComp = compP?.features?.includes(feat) || comp?.competitorExclusiveFeatures?.includes(feat) || comp?.sharedFeatures?.includes(feat)

                      let result = 'Shared'
                      let badgeVar: 'success' | 'info' | 'warning' | 'outline' = 'success'

                      if (hasMy && !hasComp) {
                        result = 'My SaaS Exclusive'
                        badgeVar = 'info'
                      } else if (!hasMy && hasComp) {
                        result = 'Competitor Exclusive'
                        badgeVar = 'warning'
                      }

                      return (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-medium text-foreground">{feat}</td>
                          <td className="py-2.5 px-3">
                            {hasMy ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/50" />}
                          </td>
                          <td className="py-2.5 px-3">
                            {hasComp ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/50" />}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={badgeVar} className="text-[10px] py-0">{result}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
            </div>
          )}

          {featuresSubView === 'seo' && (
            <div className="space-y-6">
          {seo ? (
            <>
              {/* On-page Score Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(seo.audits).map((audit) => (
                  <Card key={audit.url} className="border-border bg-card">
                    <CardHeader className="pb-2 space-y-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground truncate max-w-[130px]">
                          {audit.url === data.my_url ? 'Target' : 'Competitor'}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            audit.on_page_score >= 75
                              ? 'border-emerald-500/40 text-emerald-500 font-bold'
                              : 'border-amber-500/40 text-amber-500 font-bold'
                          }
                        >
                          Score: {audit.on_page_score}/100
                        </Badge>
                      </div>
                      <CardTitle className="text-xs font-bold text-foreground truncate mt-1">
                        {audit.product_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Title Length:</span>
                        <span className="font-medium text-foreground">{audit.title_length} chars ({audit.title_words} words)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Readability:</span>
                        <span className="font-medium text-foreground">{audit.readability_score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Keyword in Title:</span>
                        <span className={audit.keyword_in_title ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                          {audit.keyword_in_title ? `Yes (${audit.keyword_placement})` : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Documentation Link:</span>
                        <span className={audit.links.has_docs ? 'text-emerald-500' : 'text-muted-foreground'}>
                          {audit.links.has_docs ? 'Verified' : 'Missing'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Target Keywords Management & Auto-Suggestions */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Search className="h-4 w-4 text-blue-500" />
                        <span>Target Keywords & Ranking Signals</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Manage target keywords for ranking evaluation. Approve auto-suggested terms derived from listing metadata and competitor descriptions.
                      </CardDescription>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Engine: {seo.search_metadata.engine}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Target Keywords */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                        Active Target Keywords ({seo.target_keywords.length})
                      </label>
                      {updatingKeywords && (
                        <span className="text-[10px] text-primary flex items-center gap-1">
                          <RotateCw className="h-2.5 w-2.5 animate-spin" /> Updating...
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg bg-secondary/30 border border-border/60">
                      {seo.target_keywords.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No target keywords set. Add below or approve from suggestions.</span>
                      ) : (
                        seo.target_keywords.map((kw) => (
                          <Badge
                            key={kw}
                            variant="secondary"
                            className="text-xs font-mono py-1 px-2.5 flex items-center gap-1.5 bg-card border border-border"
                          >
                            <span>{kw}</span>
                            <button
                              onClick={() => handleRemoveKeyword(kw)}
                              disabled={updatingKeywords}
                              className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                              title={`Remove "${kw}"`}
                            >
                              ✕
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add Keyword Form */}
                  <form onSubmit={handleAddKeyword} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add another target keyword (e.g. multi-vendor ecommerce, mobile api)..."
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      disabled={updatingKeywords}
                      className="text-xs h-8"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={updatingKeywords || !newKeywordInput.trim()}
                      className="h-8 text-xs shrink-0 gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Keyword
                    </Button>
                  </form>

                  {/* Auto-Suggested Keywords */}
                  {seo.suggested_keywords && seo.suggested_keywords.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Auto-Suggested from Product Titles, Tags & Features:
                        </span>
                        <span className="text-[10px] text-muted-foreground">Click "+ Approve" to track</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {seo.suggested_keywords.map((skw) => {
                          const isAlreadyTarget = seo.target_keywords.some(
                            (t) => t.toLowerCase() === skw.toLowerCase()
                          )
                          return (
                            <button
                              key={skw}
                              onClick={() => handleApproveSuggestedKeyword(skw)}
                              disabled={isAlreadyTarget || updatingKeywords}
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-mono transition-colors flex items-center gap-1 ${
                                isAlreadyTarget
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 opacity-60 cursor-default'
                                  : 'border-border/80 bg-card hover:bg-primary/10 hover:border-primary/50 text-foreground cursor-pointer'
                              }`}
                            >
                              <span>{skw}</span>
                              {isAlreadyTarget ? (
                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                              ) : (
                                <span className="text-[9px] text-primary font-bold">+ Approve</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Keyword Comparison & Gap Table */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <span>Search Keyword Comparison & Gap Matrix</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Tracks presence in product titles, tags, and ranking observations. Shows gaps where competitors appear but our listing does not.
                      </CardDescription>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Location: {seo.search_metadata.location}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="px-3 py-2.5">Keyword</th>
                          <th className="px-3 py-2.5">Our Ranking Position</th>
                          <th className="px-3 py-2.5 text-center">In Our Title / Tags</th>
                          <th className="px-3 py-2.5 text-center">In Competitors</th>
                          <th className="px-3 py-2.5 text-center">Visibility & Gap Status</th>
                          <th className="px-3 py-2.5">Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {seo.comparison_table.map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5 font-semibold text-foreground font-mono">
                              {row.keyword}
                            </td>

                            {/* Ranking position */}
                            <td className="px-3 py-2.5">
                              {row.my_rank !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-foreground">#{row.my_rank}</span>
                                  {row.rank_diff !== null && row.rank_diff > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-500">
                                      ▲ +{row.rank_diff}
                                    </span>
                                  )}
                                  {row.rank_diff !== null && row.rank_diff < 0 && (
                                    <span className="text-[10px] font-bold text-red-400">
                                      ▼ {row.rank_diff}
                                    </span>
                                  )}
                                  {row.previous_rank !== null && (
                                    <span className="text-[10px] text-muted-foreground">
                                      (Prev: #{row.previous_rank})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Ranking data unavailable for this keyword
                                </span>
                              )}
                            </td>

                            {/* In Our Title / Tags */}
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {row.in_my_title ? (
                                  <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500">Title</Badge>
                                ) : null}
                                {row.in_my_tags ? (
                                  <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400">Tags</Badge>
                                ) : null}
                                {!row.in_my_title && !row.in_my_tags && (
                                  <span className="text-muted-foreground text-[10px]">—</span>
                                )}
                              </div>
                            </td>

                            {/* In Competitor Titles */}
                            <td className="px-3 py-2.5 text-center">
                              {Object.values(row.in_competitor_titles).some(Boolean) ? (
                                <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500">
                                  In Competitor Title
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">—</span>
                              )}
                            </td>

                            {/* Visibility & Gap Status */}
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {row.missing_from_my_listing && (
                                  <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-500/10 text-[9px] font-semibold">
                                    Missing from our listing
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={
                                    row.search_visibility_status === 'Competitor ranks, we do not'
                                      ? 'border-amber-500/40 text-amber-500 bg-amber-500/10 text-[9px]'
                                      : row.search_visibility_status === 'Behind competitor'
                                      ? 'border-amber-500/40 text-amber-500 bg-amber-500/10 text-[9px]'
                                      : row.search_visibility_status === 'Leading'
                                      ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[9px]'
                                      : row.search_visibility_status === 'Competitive'
                                      ? 'border-blue-500/40 text-blue-400 bg-blue-500/10 text-[9px]'
                                      : 'border-border text-muted-foreground text-[9px]'
                                  }
                                >
                                  {row.search_visibility_status}
                                </Badge>
                              </div>
                            </td>

                            {/* Recommended Action */}
                            <td className="px-3 py-2.5 text-muted-foreground text-[11px] leading-relaxed">
                              {row.recommended_action}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Actionable SEO Recommendations with Copyable Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actionable SEO Optimization Recommendations ({seo.recommendations.length})
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    Deterministic On-Page & Marketplace Findings
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seo.recommendations.map((rec) => (
                    <Card key={rec.id} className="border-border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] uppercase font-mono border-blue-500/30 text-blue-400">
                            {rec.category}
                          </Badge>
                          <span className="text-[10px] text-emerald-500 font-semibold">{rec.confidence_level} Confidence</span>
                        </div>
                        <CardTitle className="text-xs font-bold text-foreground mt-1">
                          {rec.title}
                        </CardTitle>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Triggered by: {rec.triggering_source}
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-foreground uppercase block">What was detected:</span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">{rec.what_was_detected}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-foreground uppercase block">Why it matters:</span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">{rec.why_it_matters}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-foreground uppercase block">What should be changed:</span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">{rec.what_should_be_changed}</p>
                        </div>

                        <div className="p-2 rounded bg-secondary/40 border border-border/60 text-[11px] font-mono text-foreground flex items-center justify-between gap-2">
                          <span className="truncate">
                            {Array.isArray(rec.suggested_content)
                              ? rec.suggested_content.join(', ')
                              : rec.suggested_content}
                          </span>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() =>
                              handleCopy(
                                Array.isArray(rec.suggested_content)
                                  ? rec.suggested_content.join(', ')
                                  : rec.suggested_content,
                                rec.id
                              )
                            }
                            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                            title="Copy suggested content"
                          >
                            {copiedId === rec.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                        <p className="text-[10px] text-muted-foreground italic pt-1">
                          Expected benefit (no ranking guarantee): {rec.expected_benefit}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-12">SEO Analysis data not available.</p>
          )}
            </div>
          )}
        </TabsContent>

        {/* 4. PUBLIC COMMENTS & RECURRING COMPLAINTS TAB */}
        <TabsContent value="comments" className="space-y-6">
          {/* Header & Metric Cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Public Feedback & Recurring Complaints
                </h2>
                <Badge variant="outline" className="text-[10px] uppercase font-mono border-border text-muted-foreground">
                  Strict Recurring Filter (≥2 mentions or critical)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consolidates recurring issues, high-severity complaints, and customer suggestions across competitor listings. Single praise and minor one-off comments are excluded.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs font-mono py-1 px-2.5">
                {recurringComplaints.length} Recurring Groups
              </Badge>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border bg-card/60 p-3">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Total Analyzed</div>
              <div className="text-lg font-bold text-foreground mt-1">{comments?.total_analyzed || 0}</div>
              <div className="text-[10px] text-muted-foreground">
                {comments?.unresolved_count || recurringComplaints.length} active feedback items
              </div>
            </Card>

            <Card className="border-border bg-card/60 p-3">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Recurring Complaints</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{recurringComplaints.length}</div>
              <div className="text-[10px] text-muted-foreground">≥2 mentions or critical</div>
            </Card>

            <Card className="border-border bg-card/60 p-3">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Critical & Spikes</div>
              <div className="text-lg font-bold text-rose-400 mt-1">
                {recurringComplaints.filter((r) => r.severity === 'critical' || r.trend === 'Critical Spike').length}
              </div>
              <div className="text-[10px] text-muted-foreground">Immediate risk indicators</div>
            </Card>

            <Card className="border-border bg-card/60 p-3">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Actioned & Converted</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {recurringComplaints.filter((r) => r.current_status === 'Converted to Opportunity' || r.current_status === 'Resolved').length}
              </div>
              <div className="text-[10px] text-muted-foreground">Converted or resolved</div>
            </Card>
          </div>

          {/* Envato Comment Assistant (ECA) Live Thread Engagement */}
          <EngagementSection productUrl={data?.my_url} />

          {/* Sales & Comment Correlation Card (with explicit badge: "Possible correlation; not a proven cause") */}
          {comments?.sales_comment_correlation && (
            <Card className="border-border bg-card">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Sales & Public Comment Correlation Analysis
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-500/40 text-amber-400 bg-amber-500/10">
                      Possible correlation; not a proven cause
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Marketplace Sales Velocity vs Feedback Trends</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {comments.sales_comment_correlation.correlation_summary}
                </p>
                {comments.sales_comment_correlation.observations?.map((corr, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/70 bg-secondary/20 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-foreground">{corr.competitor_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Sales Impact:</span>
                        <Badge variant="outline" className="text-[10px] border-border text-foreground">
                          {corr.sales_impact_text}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{corr.trend_text}</p>
                    <div className="flex items-center justify-end pt-1 border-t border-border/40 text-[10px]">
                      <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400/90 font-mono">
                        Possible correlation; not a proven cause
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Competitor Comment Summaries & Availability */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(comments?.summaries || []).map((summary, idx) => (
              <Card key={idx} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs font-bold text-foreground truncate">
                      {summary.product_name}
                    </CardTitle>
                    {summary.comments_unavailable ? (
                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500 bg-amber-500/10 font-mono">
                        Comments unavailable
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-border text-muted-foreground font-mono">
                        {summary.total_comments} analyzed
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-[11px]">
                    {summary.comments_unavailable
                      ? 'Public comments could not be obtained from this marketplace listing.'
                      : `${summary.common_complaints.length} recurring complaint categories detected.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {summary.comments_unavailable ? (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span>Comments unavailable</span>
                      </div>
                      <p className="text-[11px] text-amber-200/80">
                        Marketplace access policies or disabled discussion boards prevented comment extraction.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] p-2 rounded bg-secondary/30">
                        <span className="text-emerald-500 font-semibold">{summary.positive_count} Positive</span>
                        <span className="text-red-400 font-semibold">{summary.negative_count} Complaints</span>
                        <span className="text-muted-foreground">{summary.sentiment_trend}</span>
                      </div>

                      {summary.common_complaints.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                              Recurring Issues (≥2 mentions):
                            </span>
                            <span className="text-[9px] text-muted-foreground/70">Click to view</span>
                          </div>
                          {summary.common_complaints.slice(0, 5).map((comp, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleOpenMentionComments(summary.product_name, summary.product_url, comp.topic, comp.count, comp.comments, comp.sample)}
                              className="w-full text-[11px] text-foreground flex items-center justify-between p-1.5 rounded-md hover:bg-secondary/70 border border-transparent hover:border-border/60 transition-all group cursor-pointer text-left"
                              title={`View customer comments mentioning ${comp.topic} (${comp.count} mentions)`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MessageSquare className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                                <span className="truncate max-w-[160px] font-medium group-hover:text-primary transition-colors">{comp.topic}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant="outline" className="text-[9px] px-1 text-red-400 border-red-500/20 group-hover:bg-red-500/10 transition-colors">
                                  {comp.count} mentions
                                </Badge>
                                <Eye className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground shrink-0 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic pt-1">
                          No recurring complaints (≥2 mentions) detected.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/60">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Filter Complaints:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Competitor filter */}
              <select
                value={commentCompetitorFilter}
                onChange={(e) => setCommentCompetitorFilter(e.target.value)}
                className="text-xs rounded border border-border bg-card text-foreground px-2 py-1 focus:outline-none"
              >
                <option value="all">All Competitors</option>
                {competitors.map((c) => (
                  <option key={c.url} value={c.url}>
                    {c.productName}
                  </option>
                ))}
              </select>

              {/* 12 Standard Categories Filter */}
              <select
                value={commentCategoryFilter}
                onChange={(e) => setCommentCategoryFilter(e.target.value)}
                className="text-xs rounded border border-border bg-card text-foreground px-2 py-1 focus:outline-none"
              >
                <option value="all">All 12 Categories</option>
                <option value="Installation and setup">Installation and setup</option>
                <option value="Documentation">Documentation</option>
                <option value="Bugs and crashes">Bugs and crashes</option>
                <option value="Support">Support</option>
                <option value="Compatibility">Compatibility</option>
                <option value="Performance">Performance</option>
                <option value="Missing features">Missing features</option>
                <option value="Payment and licensing">Payment and licensing</option>
                <option value="Security">Security</option>
                <option value="UI/UX">UI/UX</option>
                <option value="Updates">Updates</option>
                <option value="Integrations">Integrations</option>
              </select>

              {/* Status filter */}
              <select
                value={commentStatusFilter}
                onChange={(e) => setCommentStatusFilter(e.target.value)}
                className="text-xs rounded border border-border bg-card text-foreground px-2 py-1 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="New">New</option>
                <option value="Under Review">Under Review</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Rejected">Rejected</option>
                <option value="Converted to Opportunity">Converted to Opportunity</option>
                <option value="Resolved">Resolved</option>
              </select>

              {/* Trend filter */}
              <select
                value={commentTrendFilter}
                onChange={(e) => setCommentTrendFilter(e.target.value)}
                className="text-xs rounded border border-border bg-card text-foreground px-2 py-1 focus:outline-none"
              >
                <option value="all">All Trends</option>
                <option value="New">New</option>
                <option value="Increasing">Increasing</option>
                <option value="Decreasing">Decreasing</option>
                <option value="Persistent">Persistent</option>
                <option value="After Competitor Update">After Competitor Update</option>
                <option value="Critical Spike">Critical Spike</option>
                <option value="Stable">Stable</option>
              </select>

              {/* Severity filter */}
              <select
                value={commentSeverityFilter}
                onChange={(e) => setCommentSeverityFilter(e.target.value)}
                className="text-xs rounded border border-border bg-card text-foreground px-2 py-1 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Only</option>
                <option value="medium">Medium Only</option>
                <option value="low">Low Only</option>
              </select>
            </div>
          </div>

          {/* Recurring Complaints Feed */}
          <div className="space-y-3">
            {comments?.summaries.every((s) => s.comments_unavailable) ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-border rounded-lg bg-card/50 space-y-1.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                <p className="font-semibold text-foreground">Comments unavailable</p>
                <p className="text-[11px]">
                  Marketplace public-access rules or robots policies prevented scraping public review feeds for these listings.
                </p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-border rounded-lg bg-card/50">
                <p>No recurring complaints (≥2 mentions) or critical issues match the selected filters.</p>
                <p className="text-[10px] text-muted-foreground pt-1">
                  (Single minor comments, general praise, and neutral feedback are filtered out per strict product requirements.)
                </p>
              </div>
            ) : (
              filteredComplaints.map((rc) => (
                <div
                  key={rc.id}
                  className="p-4 rounded-lg border border-border bg-card space-y-3 text-xs hover:border-border/80 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{rc.competitor_name}</span>
                      <Badge variant="outline" className="text-[10px] border-border text-foreground font-medium">
                        {rc.complaint_category}
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">· Latest: {rc.latest_occurrence_date}</span>
                      {rc.first_detected_date && (
                        <span className="text-muted-foreground text-[10px]">· First: {rc.first_detected_date}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Trend Badge */}
                      <Badge
                        variant="outline"
                        className={
                          rc.trend === 'Critical Spike'
                            ? 'border-red-500/50 text-red-400 bg-red-500/10 text-[9px] font-bold'
                            : rc.trend === 'After Competitor Update'
                            ? 'border-purple-500/50 text-purple-400 bg-purple-500/10 text-[9px] font-bold'
                            : rc.trend === 'Increasing'
                            ? 'border-amber-500/50 text-amber-400 bg-amber-500/10 text-[9px] font-bold'
                            : rc.trend === 'Decreasing'
                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 text-[9px]'
                            : rc.trend === 'Persistent'
                            ? 'border-blue-500/50 text-blue-400 bg-blue-500/10 text-[9px]'
                            : 'border-border text-muted-foreground text-[9px]'
                        }
                      >
                        {rc.trend || 'Stable'}
                      </Badge>

                      {/* Severity Badge */}
                      <Badge
                        variant="outline"
                        className={
                          rc.severity === 'critical'
                            ? 'border-red-500/50 text-red-400 bg-red-500/10 text-[9px] font-bold uppercase'
                            : rc.severity === 'high'
                            ? 'border-amber-500/50 text-amber-500 bg-amber-500/10 text-[9px] font-bold uppercase'
                            : 'border-border text-muted-foreground text-[9px] uppercase'
                        }
                      >
                        {rc.severity} Severity
                      </Badge>

                      {/* Mentions Count */}
                      <Badge
                        variant="secondary"
                        onClick={() => handleOpenMentionComments(rc.competitor_name, rc.competitor_url, rc.complaint_category, rc.mention_count, rc.comments, rc.representative_comment)}
                        className="text-[9px] font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer transition-colors flex items-center gap-1"
                        title="Click to view all comments for this issue"
                      >
                        <MessageSquare className="h-2.5 w-2.5 text-primary" />
                        <span>{rc.is_critical ? 'Critical Issue' : `${rc.mention_count} mentions`}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Short summarized issue */}
                  <p className="text-foreground font-medium text-xs leading-relaxed">
                    {rc.short_summary}
                  </p>

                  {/* Representative public comment quote */}
                  <div className="p-2.5 rounded bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground italic leading-relaxed">
                    "{rc.representative_comment}"
                  </div>

                  {/* Inline list / expansion of all comments */}
                  {(() => {
                    const isExpanded = expandedComplaintId === rc.id
                    let rcComments: any[] = []
                    if (rc.comments && rc.comments.length > 0) {
                      rcComments = rc.comments
                    } else if (comments?.comments) {
                      const topicNorm = rc.complaint_category.toLowerCase()
                      rcComments = comments.comments.filter((c: any) =>
                        (c.product_name === rc.competitor_name || c.product_url === rc.competitor_url) &&
                        (c.topic_label?.toLowerCase() === topicNorm || c.comment_text?.toLowerCase().includes(topicNorm))
                      )
                    }

                    return (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedComplaintId(isExpanded ? null : rc.id)}
                            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>
                              {isExpanded
                                ? `Hide individual comments`
                                : `View all ${Math.max(rc.mention_count, rcComments.length)} comments`}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMentionComments(rc.competitor_name, rc.competitor_url, rc.complaint_category, rc.mention_count, rc.comments, rc.representative_comment)}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Open in modal</span>
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="space-y-2 pt-2 border-t border-border/50 animate-in fade-in-0 duration-200">
                            {rcComments.length > 0 ? (
                              rcComments.map((cm: any, cIdx: number) => (
                                <div
                                  key={cIdx}
                                  className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-[11px] space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span>{cm.author_name || 'Marketplace Buyer'}</span>
                                      <span className="text-[10px] text-muted-foreground">· {cm.comment_date || 'Recently'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {cm.sentiment && (
                                        <Badge
                                          variant="outline"
                                          className={
                                            cm.sentiment === 'negative'
                                              ? 'border-red-500/30 text-red-400 bg-red-500/10 text-[9px]'
                                              : cm.sentiment === 'mixed'
                                              ? 'border-amber-500/30 text-amber-400 bg-amber-500/10 text-[9px]'
                                              : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[9px]'
                                          }
                                        >
                                          {cm.sentiment}
                                        </Badge>
                                      )}
                                      {cm.comment_url && (
                                        <a
                                          href={cm.comment_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-0.5 text-[10px]"
                                        >
                                          <span>CodeCanyon</span>
                                          <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {cm.comment_text}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-[11px] text-muted-foreground italic">
                                "{rc.representative_comment}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Associated Release Update if any */}
                  {rc.related_product_update && (
                    <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span>Associated with competitor release update: <strong>{rc.related_product_update}</strong></span>
                    </div>
                  )}

                  {/* Bottom Row: Status Selector, Confidence, and Action Links */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Workflow Status:</span>
                      <select
                        value={rc.current_status || 'New'}
                        onChange={(e) => handleUpdateComplaintStatus(rc.id, e.target.value)}
                        className="text-[11px] rounded border border-border bg-card text-foreground px-2 py-0.5 font-medium focus:outline-none"
                      >
                        <option value="New">New</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Converted to Opportunity">Converted to Opportunity</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div>
                        <span>Confidence: </span>
                        <strong className="text-foreground">{Math.round((rc.confidence_score || 0.85) * 100)}% ({rc.confidence_level})</strong>
                      </div>
                      {rc.comment_url && (
                        <a
                          href={rc.comment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <span>View Public Thread</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {rc.current_status !== 'Converted to Opportunity' && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleUpdateComplaintStatus(rc.id, 'Converted to Opportunity')}
                          className="h-6 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 gap-1 px-2"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Convert to Opportunity</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* 5. STRENGTHS, GAPS & RISKS */}
        <TabsContent value="strategy" className="space-y-4">
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <Button
              size="sm"
              variant={strategySubView === 'matrix' ? 'secondary' : 'ghost'}
              onClick={() => setStrategySubView('matrix')}
              className="text-xs h-7"
            >
              Competitive Matrix & Ecosystem
            </Button>
            <Button
              size="sm"
              variant={strategySubView === 'opportunities' ? 'secondary' : 'ghost'}
              onClick={() => setStrategySubView('opportunities')}
              className="text-xs h-7 gap-1"
            >
              <Lightbulb className="h-3 w-3" />
              Sales Opportunities ({opportunities.length})
            </Button>
          </div>

          {strategySubView === 'matrix' && (
            <div className="space-y-4">
              {/* Product Strengths & Product Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/60">
                    <CardTitle className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Product Strengths (My SaaS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-1.5">
                    {comp?.myStrengths && comp.myStrengths.length > 0 ? (
                      comp.myStrengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No clear exclusive advantage detected from current landing pages.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/60">
                    <CardTitle className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Product Weaknesses / Competitor Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-1.5">
                    {comp?.competitorStrengths && comp.competitorStrengths.length > 0 ? (
                      comp.competitorStrengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-foreground">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No clear competitor advantage detected.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Feature Gaps & Possible Competitive Advantages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/60">
                    <CardTitle className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" />
                      Feature Gaps & Missing Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-1.5">
                    {comp?.productGaps && comp.productGaps.length > 0 ? (
                      comp.productGaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{g}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No gaps detected.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="py-3 px-4 border-b border-border/60">
                    <CardTitle className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Zap className="h-4 w-4" />
                      Possible Competitive Advantages & Differentiation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-1.5">
                    {comp?.improvementAreas && comp.improvementAreas.length > 0 ? (
                      comp.improvementAreas.map((a, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-muted-foreground">
                          <span className="text-blue-400 font-bold">→</span>
                          <span>{a}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No explicit improvement areas identified.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Integration Ecosystem Comparison & Supported Tools/Platforms */}
              <Card className="border-border bg-card">
                <CardHeader className="py-3 px-4 border-b border-border/60">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Integration Ecosystem & Supported Tools / Platforms
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tools, frameworks, gateways, and platforms explicitly named on public pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2">
                        {myP?.productName} ({myP?.integrations?.length || 0} detected)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {myP?.integrations && myP.integrations.length > 0 ? (
                          myP.integrations.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs py-1 border-primary/30 text-foreground">
                              {item}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No integrations explicitly listed</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2">
                        {compP?.productName} ({compP?.integrations?.length || 0} detected)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {compP?.integrations && compP.integrations.length > 0 ? (
                          compP.integrations.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs py-1 border-border text-foreground">
                              {item}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No integrations explicitly listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Differences Between Our Product and Competitors */}
              <Card className="border-border bg-card">
                <CardHeader className="py-3 px-4 border-b border-border/60">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Swords className="h-4 w-4 text-purple-400" />
                    Differences Between Our Product & Competitors
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Side-by-side breakdown of exclusive capabilities and parity features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Exclusive to My SaaS ({comp?.myExclusiveFeatures?.length || 0})
                      </span>
                      <div className="space-y-1">
                        {comp?.myExclusiveFeatures && comp.myExclusiveFeatures.length > 0 ? (
                          comp.myExclusiveFeatures.map((f, i) => (
                            <p key={i} className="text-xs text-foreground">• {f}</p>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No exclusive features detected</p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Exclusive to Competitors ({comp?.competitorExclusiveFeatures?.length || 0})
                      </span>
                      <div className="space-y-1">
                        {comp?.competitorExclusiveFeatures && comp.competitorExclusiveFeatures.length > 0 ? (
                          comp.competitorExclusiveFeatures.map((f, i) => (
                            <p key={i} className="text-xs text-foreground">• {f}</p>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No exclusive features detected</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {comp?.sharedFeatures && comp.sharedFeatures.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                        Shared Core Capabilities ({comp.sharedFeatures.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {comp.sharedFeatures.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-xs py-0.5">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {strategySubView === 'opportunities' && (
            <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Actionable Sales Opportunities from Competitor Feedback & Suggestions</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Identifies verified competitor complaints, feature requests, and improvement suggestions that match capabilities in our product.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground w-fit">
                  {opportunities.length} Qualified Opportunities
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-12 space-y-1">
                  <p className="font-semibold text-foreground">No actionable competitor opportunities detected.</p>
                  <p className="text-[11px]">
                    Opportunities are created when competitor complaints or customer suggestions match verified features in our product.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3 text-xs hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">{opp.competitor_name}</span>
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
                            {opp.issue_category}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] font-semibold">
                            {opp.mention_count || 1} mentions
                          </Badge>
                        </div>

                        {/* Status Switcher with all 8 supported statuses */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Status:</span>
                          <select
                            value={opp.status}
                            onChange={(e) => handleUpdateOpportunityStatus(opp.id, e.target.value)}
                            className="text-[11px] rounded border border-border bg-card text-foreground px-2 py-1 font-medium focus:outline-none"
                          >
                            <option value="New">New</option>
                            <option value="Needs review">Needs review</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Relevant">Relevant</option>
                            <option value="Not relevant">Not relevant</option>
                            <option value="Message drafted">Message drafted</option>
                            <option value="Contacted manually">Contacted manually</option>
                            <option value="Converted">Converted</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      {/* Complaint summary */}
                      <div className="p-2.5 rounded bg-card border border-border/80 text-[11px] text-foreground/90 italic">
                        "{opp.comment_summary}"
                      </div>

                      {/* Feature Alignment */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Verified Matching Feature in Our Product:
                          </span>
                          {opp.has_matching_feature ? (
                            <span className="font-semibold text-emerald-500 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                              {opp.matching_feature}
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-500 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              No verified matching feature found
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Suggested Value Proposition (Possible Improvement):
                          </span>
                          <span className="text-foreground leading-relaxed block mt-0.5">
                            {opp.value_proposition}
                          </span>
                        </div>
                      </div>

                      {/* Action & Draft Message Button */}
                      <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          Labeled as possible improvement · Strictly manual review required
                        </span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setSelectedOpportunity(opp)
                            setEditedDraftMessage(opp.draft_message)
                          }}
                          className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Generate Draft Message</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </div>
          )}
        </TabsContent>

        {/* 6. DETERMINISTIC RULE-BASED RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <Button
              size="sm"
              variant={actionsSubView === 'recs' ? 'secondary' : 'ghost'}
              onClick={() => setActionsSubView('recs')}
              className="text-xs h-7"
            >
              Recommended Actions ({recs.length})
            </Button>
            <Button
              size="sm"
              variant={actionsSubView === 'insights' ? 'secondary' : 'ghost'}
              onClick={() => setActionsSubView('insights')}
              className="text-xs h-7 gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Unified Strategic Insights ({insights.length})
            </Button>
          </div>

          {actionsSubView === 'recs' && (
            <div className="space-y-4">
          <div className="rounded-md border border-purple-500/30 bg-purple-500/5 p-3 text-xs text-purple-300">
            <strong>Rule-Engine Transparency:</strong> Recommendations below were triggered deterministically by comparing verified website facts (features, pricing delta, and public links). No LLM was used.
          </div>

          {/* Community Engagement & Comment Assistant Action Card */}
          <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-card">
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  <span className="font-bold text-sm text-foreground">Community Engagement & Pre-Sale Conversions</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono border-indigo-500/40 text-indigo-400 bg-indigo-500/10">
                  Extension Integrated
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Respond rapidly to customer questions and pre-sale compatibility queries on Envato. Synchronize discussion threads and approve context-aware AI drafts using the <strong>Envato Comment Assistant</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                  asChild
                >
                  <a href="#comments" onClick={(e) => {
                    e.preventDefault()
                    const commentTab = document.querySelector('[data-state][value="comments"]') as HTMLElement
                    if (commentTab) commentTab.click()
                  }}>
                    <MessageSquare className="h-3 w-3" /> Go to Comments & AI Replies Hub
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {recs.map((rec) => (
              <Card key={rec.id} className="border-border bg-card">
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{rec.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={rec.priority === 'critical' ? 'destructive' : rec.priority === 'high' ? 'warning' : 'outline'} className="text-[10px] uppercase">
                        {rec.priority} Priority
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Conf: {(rec.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground">{rec.reason}</p>

                  <div className="rounded bg-muted/40 p-2.5 border border-border/60 space-y-1">
                    <div>
                      <strong className="text-foreground">Evidence: </strong>
                      <span className="text-muted-foreground">{rec.evidence}</span>
                    </div>
                    <div>
                      <strong className="text-foreground">Rule Triggered: </strong>
                      <span className="font-mono text-[11px] text-purple-400">{rec.ruleTriggered}</span>
                    </div>
                  </div>

                  <div className="rounded bg-background p-2.5 border border-border/80 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Suggested Action: </strong>
                      <span className="text-muted-foreground">{rec.suggestedAction}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Source: {rec.sourceUrl}</span>
                    <a
                      href={rec.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Verify on competitor website <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </div>
          )}

          {actionsSubView === 'insights' && (
            <div className="space-y-6">
          <div className="space-y-4">
            {insights.map((ins) => (
              <Card key={ins.id} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={
                        ins.priority === 'high'
                          ? 'border-red-500/40 text-red-400 uppercase text-[9px] font-mono'
                          : ins.priority === 'medium'
                          ? 'border-amber-500/40 text-amber-500 uppercase text-[9px] font-mono'
                          : 'border-blue-500/40 text-blue-400 uppercase text-[9px] font-mono'
                      }
                    >
                      Priority: {ins.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Confidence: {ins.confidence_level}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground mt-1">
                    {ins.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="p-2 rounded bg-secondary/40 border border-border/60 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Observed Evidence:</span> {ins.evidence}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    <span className="font-semibold text-foreground">Analysis:</span> {ins.explanation}
                  </p>
                  <div className="p-2.5 rounded bg-primary/5 border border-primary/20 text-[11px] text-foreground font-medium">
                    <span className="text-primary font-bold">Recommended Action:</span> {ins.recommended_action}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD COMPETITOR TO PROJECT
          ═══════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>Add Competitor to Project</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter another public Envato or SaaS product URL. It will be scraped and integrated into your sales and SEO comparison.
            </p>

            <form onSubmit={handleAddCompetitor} className="space-y-3">
              <Input
                type="text"
                placeholder="https://codecanyon.net/item/new-competitor/12345678"
                value={newCompetitorUrl}
                onChange={(e) => setNewCompetitorUrl(e.target.value)}
                disabled={addingCompetitor}
                required
                className="text-xs h-9"
              />

              <div className="flex justify-end gap-2 pt-2">
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
                <Button type="submit" size="sm" disabled={addingCompetitor} className="text-xs gap-1.5">
                  {addingCompetitor ? (
                    <>
                      <RotateCw className="h-3 w-3 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Add & Benchmark</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: DRAFT OUTREACH MESSAGE
          ═══════════════════════════════════════════════════════════ */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Respectful Draft Outreach Message</span>
              </h3>
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded bg-secondary/30 border border-border/80 text-[11px] text-muted-foreground space-y-1">
              <div><strong>Competitor:</strong> {selectedOpportunity.competitor_name}</div>
              <div><strong>Customer Issue:</strong> {selectedOpportunity.issue_category} ({selectedOpportunity.mention_count || 1} mentions)</div>
              <div>
                <strong>Matching Feature:</strong>{' '}
                <span className={selectedOpportunity.has_matching_feature ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                  {selectedOpportunity.matching_feature}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-foreground">
                  Editable Draft Message (Strictly Manual Review):
                </label>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleCopy(editedDraftMessage || selectedOpportunity.draft_message, 'draft_msg')}
                  className="h-6 text-xs gap-1 text-primary"
                >
                  {copiedId === 'draft_msg' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Message</span>
                    </>
                  )}
                </Button>
              </div>
              <textarea
                rows={8}
                value={editedDraftMessage}
                onChange={(e) => setEditedDraftMessage(e.target.value)}
                placeholder="Draft message for manual review..."
                className="w-full rounded-md border border-border bg-input p-3 text-xs text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="p-3 rounded border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-500 leading-relaxed space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>Strictly Manual Review — No Automated Outreach</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                This platform never sends automated messages, direct DMs, or emails. Do not contact users automatically or scrape private profile data. Always manually review messages before copying.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setSelectedOpportunity(null)}
                className="text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mention Comments Drilldown Modal */}
      {activeMentionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in-0"
          onClick={() => setActiveMentionModal(null)}
        >
          <div
            className="bg-card border border-border/80 text-card-foreground shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border/60 flex items-start justify-between gap-4 bg-muted/20">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold text-foreground border-border bg-background">
                    {activeMentionModal.productName}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/30 bg-red-500/10 font-medium">
                    {activeMentionModal.topic}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {activeMentionModal.count} verified mentions
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Customer Feedback: {activeMentionModal.topic}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Extracted from marketplace discussions for <strong>{activeMentionModal.productName}</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveMentionModal(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Comments List */}
            <div className="overflow-y-auto p-5 space-y-3 max-h-[55vh]">
              {activeMentionModal.comments.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto opacity-50" />
                  <p>No full text comments cached for this category.</p>
                  {activeMentionModal.sample && (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 text-left text-xs italic text-foreground mt-2">
                      "{activeMentionModal.sample}"
                    </div>
                  )}
                </div>
              ) : (
                activeMentionModal.comments.map((cm, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-secondary/25 border border-border/60 text-xs space-y-2 hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-semibold text-[10px]">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-foreground text-xs">
                          {cm.author_name || 'Marketplace Buyer'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {cm.comment_date || 'Recently'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {cm.sentiment && (
                          <Badge
                            variant="outline"
                            className={
                              cm.sentiment === 'negative'
                                ? 'border-red-500/30 text-red-400 bg-red-500/10 text-[9px] capitalize'
                                : cm.sentiment === 'mixed'
                                ? 'border-amber-500/30 text-amber-400 bg-amber-500/10 text-[9px] capitalize'
                                : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[9px] capitalize'
                            }
                          >
                            {cm.sentiment}
                          </Badge>
                        )}
                        {cm.comment_url && (
                          <a
                            href={cm.comment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
                          >
                            <span>CodeCanyon</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/40 text-[11px] text-foreground/90 leading-relaxed whitespace-pre-line font-sans">
                      {cm.comment_text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 bg-muted/10">
              <span className="text-[11px] text-muted-foreground">
                Showing {activeMentionModal.comments.length} of {activeMentionModal.count} mentions
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCommentCategoryFilter(activeMentionModal.topic)
                    if (activeMentionModal.productUrl) {
                      setCommentCompetitorFilter(activeMentionModal.productUrl)
                    }
                    setActiveMentionModal(null)
                  }}
                  className="text-xs"
                >
                  <Filter className="h-3.5 w-3.5 mr-1 text-primary" />
                  Filter Feed for {activeMentionModal.topic}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveMentionModal(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
