'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building,
  ExternalLink,
  DollarSign,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  ShieldCheck,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  History,
  Calendar,
  RotateCw,
  Clock,
  ArrowUpRight,
  Eye,
  MessageSquare,
  Star as StarIcon,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts'

function formatPriceString(val: any): string {
  if (!val) return 'Not available'
  const str = String(val).trim()
  if (/^(\$|₹|€|£|Rs\.?|¥)/i.test(str)) return str
  return typeof val === 'number' ? `$${val}` : `$${str}`
}

function parseNumericPrice(val: any): number {
  if (!val) return 0
  const cleaned = String(val).replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
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

function getProductNumericPrice(prod?: any): number {
  if (!prod) return 0
  const ep = prod.envatoSales?.product_price || prod.envatoSales?.price
  const p = prod.envatoSales?.product_price || prod.price
  if (typeof p === 'number') return p
  if (!p) return 0
  const match = String(p).match(/[\d,.]+(\.\d+)?/)
  if (!match) return 0
  return parseFloat(match[0].replace(/,/g, '')) || 0
}

function getProductSales(prod?: any, salesAnalysis?: any): string {
  if (!prod && !salesAnalysis) return 'Not available'
  const s = prod?.envatoSales?.total_sales ?? prod?.sales ?? prod?.current_sales
  if (s !== null && s !== undefined && !isNaN(Number(s))) {
    return `${Number(s).toLocaleString()} sales`
  }
  // Fallback: use current_sales or total_sales from the sales analysis snapshot
  const cs = salesAnalysis?.current_sales ?? salesAnalysis?.total_sales ?? prod?.current_sales
  if (cs !== null && cs !== undefined && !isNaN(Number(cs))) {
    return `${Number(cs).toLocaleString()} sales`
  }
  return 'Not available'
}

function getProductNumericSales(prod?: any, salesAnalysis?: any): number {
  if (!prod && !salesAnalysis) return 0
  const s = prod?.envatoSales?.total_sales ?? prod?.sales ?? prod?.current_sales
  if (s !== null && s !== undefined && !isNaN(Number(s))) {
    return Number(s)
  }
  const cs = salesAnalysis?.current_sales ?? salesAnalysis?.total_sales ?? prod?.current_sales
  if (cs !== null && cs !== undefined && !isNaN(Number(cs))) {
    return Number(cs)
  }
  return 0
}

function getProductRating(prod?: any): string {
  if (!prod) return 'Not available'
  const r = prod.envatoSales?.rating
  if (r !== null && r !== undefined && typeof r === 'number') {
    return r.toFixed(1)
  }
  return 'Not available'
}

function getProductNumericRating(prod?: any): number {
  if (!prod) return 0
  const r = prod.envatoSales?.rating
  if (r !== null && r !== undefined && typeof r === 'number') {
    return r
  }
  return 0
}

export default function MySaaSPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects, refreshProjects } = useProject()
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d')
  const [chartMetric, setChartMetric] = useState<'price' | 'sales' | 'rating'>('sales')
  const [selectedProductKey, setSelectedProductKey] = useState<string>('target')

  const [eventsModalOpen, setEventsModalOpen] = useState(false)
  const [showBsrModal, setShowBsrModal] = useState(false)
  const [eventsModalFilter, setEventsModalFilter] = useState<string>('all')
  const [eventsModalTypeFilter, setEventsModalTypeFilter] = useState<'all'|'sale'|'review'|'comment'>('all')
  const [eventsModalSearch, setEventsModalSearch] = useState<string>('')
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'sale' | 'review' | 'comment'>('all')
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showDailyLogsModal, setShowDailyLogsModal] = useState(false)
  const [dailyLogsData, setDailyLogsData] = useState<any>(null)
  const [dailyLogsLoading, setDailyLogsLoading] = useState(false)
  const [dailyLogsProduct, setDailyLogsProduct] = useState<string>('__own__')

  const handleTimeRangeChange = (range: 'today' | '7d' | '30d' | 'all') => {
    setTimeRange(range)
    setChartMetric('sales')
  }

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Close modal on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEventsModalOpen(false)
        setShowBsrModal(false)
        setShowDailyLogsModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function openDailyLogs() {
    if (!currentProjectId) return
    setShowDailyLogsModal(true)
    if (dailyLogsData) return // already loaded — keep cache
    setDailyLogsLoading(true)
    try {
      const res = await fetch(`/api/analyses/${currentProjectId}/daily-sales`)
      if (res.ok) {
        const json = await res.json()
        setDailyLogsData(json)
        setDailyLogsProduct('__own__')
      }
    } catch (e) {
      console.error('[DailyLogs] fetch error', e)
    } finally {
      setDailyLogsLoading(false)
    }
  }

  // ── Derived data (with safe fallbacks so all hooks run before any early return) ──
  const myProduct = currentProjectData?.my_product || {}
  const competitorRows: any[] = currentProjectData?.multi_sales_comparison?.competitor_rows || []
  const competitors: any[] = (currentProjectData?.competitors_data && currentProjectData.competitors_data.length > 0)
    ? currentProjectData.competitors_data
    : (competitorRows.length > 0 ? competitorRows : (currentProjectData?.competitor_product ? [currentProjectData.competitor_product] : []))
  const allCompetitorList: any[] = competitors.length > 0 ? competitors : competitorRows
  const seoData = currentProjectData?.seo_analysis || {}
  const mySalesAnalysis = currentProjectData?.my_sales_analysis || currentProjectData?.multi_sales_comparison?.my_sales || null
  const activityComparisons: any[] = currentProjectData?.multi_sales_comparison?.activity_comparisons || currentProjectData?.sales_comparison?.activity_comparisons || []
  const salesTimeline = mySalesAnalysis?.sales_activity_timeline || null
  const targetName = currentProjectMeta?.ownProduct?.name || (myProduct as any).productName || (myProduct as any).websiteTitle || currentProjectMeta?.name || 'Target Product'
  const targetUrl = currentProjectMeta?.ownProduct?.url || (myProduct as any).url || '#'
  
  const isAmazonWorkspace =
    currentProjectMeta?.platform === 'amazon' ||
    Boolean(myProduct.url && /amazon\.[a-z.]+/i.test(myProduct.url))
  const marketPosition = currentProjectData?.comparison?.marketPosition
  const hasBsr = Boolean(
    isAmazonWorkspace &&
    marketPosition &&
    (marketPosition.myRank !== null || marketPosition.competitorBsrs?.some((c: any) => c.rank !== null))
  )

  const commentsAnalysis = currentProjectData?.comments_analysis || null
  const allComments: any[] = commentsAnalysis?.all_comments || commentsAnalysis?.comments || []
  const summaries: any[] = commentsAnalysis?.summaries || commentsAnalysis?.competitor_summaries || []
  const ownSummary = summaries.find((s: any) =>
    (targetUrl && s.product_url === targetUrl) ||
    (s.product_name && s.product_name.toLowerCase().includes('rideon')) ||
    (targetName && s.product_name && s.product_name.toLowerCase().includes(targetName.toLowerCase().slice(0, 15)))
  )
  const ownCommentsCount = ownSummary?.total_comments || (myProduct as any).comments?.length || (allComments.filter((c: any) => (c.product_name && c.product_name.toLowerCase().includes('rideon')) || (targetUrl && c.product_url === targetUrl)).length) || 0
  const ownMarketplaceComments = (myProduct as any)?.envatoSales?.comment_count || ownCommentsCount

  // ── Helper: convert a PublicComment → unified timeline event ──
  const commentToEvent = (c: any, isTarget: boolean, pName: string, pUrl: string, idx: number, prefix: string) => {
    const isReview = c.rating != null
    // Safely parse timestamp to avoid NaN in sorting
    let timestamp = ''
    let formattedDate = 'Recent comment'

    if (c.collected_at) {
      const d = new Date(c.collected_at)
      if (!isNaN(d.getTime())) {
        timestamp = d.toISOString()
        formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }

    if (c.comment_date) {
      const rawDateStr = String(c.comment_date).trim()
      const relMatch = rawDateStr.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i)
      if (relMatch) {
        const num = parseInt(relMatch[1], 10)
        const unit = relMatch[2].toLowerCase()
        const targetDate = new Date()
        if (unit.startsWith('minute')) targetDate.setMinutes(targetDate.getMinutes() - num)
        else if (unit.startsWith('hour')) targetDate.setHours(targetDate.getHours() - num)
        else if (unit.startsWith('day')) targetDate.setDate(targetDate.getDate() - num)
        else if (unit.startsWith('week')) targetDate.setDate(targetDate.getDate() - num * 7)
        else if (unit.startsWith('month')) targetDate.setMonth(targetDate.getMonth() - num)
        else if (unit.startsWith('year')) targetDate.setFullYear(targetDate.getFullYear() - num)
        timestamp = targetDate.toISOString()
        formattedDate = rawDateStr
      } else {
        const d = new Date(rawDateStr)
        if (!isNaN(d.getTime())) {
          timestamp = d.toISOString()
          formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
        } else if (!timestamp) {
          timestamp = new Date().toISOString()
          formattedDate = rawDateStr
        }
      }
    }

    if (!timestamp) {
      timestamp = new Date().toISOString()
    }

    return {
      id: c.id || `${prefix}-${idx}`,
      type: isReview ? 'review' : 'comment',
      timestamp,
      formattedDate,
      relativeTime: '',
      productName: pName,
      isTarget,
      url: pUrl,
      // review-specific
      rating: c.rating ?? null,
      sentiment: c.sentiment || 'neutral',
      // comment-specific
      comment_text: c.comment_text || '',
      author_name: c.author_name || 'Anonymous',
      topic_label: c.topic_label || '',
      severity: c.severity || 'low',
      detected_issue: c.detected_issue || '',
      feedback_type: c.feedback_type || '',
      // keep these null so sale-specific renders skip cleanly
      salesGained: null,
      newTotalSales: null,
      price: null,
      intervalFromPreviousFormatted: null,
      velocityPerDay: null,
    }
  }

  // ── Target unified events (sales + reviews + comments) ──
  const targetEvents = React.useMemo(() => {
    const sales = (salesTimeline?.events || []).map((ev: any, idx: number) => ({
      ...ev,
      type: 'sale',
      id: ev.id || `target-ev-${idx}`,
      productName: targetName,
      isTarget: true,
      url: targetUrl,
    }))
    const myComments = allComments
      .filter((c: any) => {
        const u = (c.product_url || '').toLowerCase()
        const tUrl = targetUrl.toLowerCase()
        const pName = (c.product_name || '').toLowerCase()
        const tName = targetName.toLowerCase()
        return (tUrl && (u === tUrl || tUrl.includes(u) || u.includes(tUrl))) || (pName.includes('rideon') || (tName && pName.includes(tName.slice(0, 15))))
      })
      .map((c: any, idx: number) => commentToEvent(c, true, targetName, targetUrl, idx, 'target-c'))
    return [...sales, ...myComments].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesTimeline, targetName, targetUrl, allComments])

  // ── Competitor unified events ──
  const competitorEvents = React.useMemo(() => {
    return allCompetitorList.flatMap((c: any, cIdx: number) => {
      const compRow = competitorRows.find((r: any) => r.url === c?.url || r.productName === c?.productName) || c
      const cTimeline = compRow.activity_timeline || compRow.salesAnalysis?.sales_activity_timeline || c.activity_timeline || c.salesAnalysis?.sales_activity_timeline
      const sales = (cTimeline?.events || []).map((ev: any, idx: number) => ({
        ...ev,
        type: 'sale',
        id: ev.id || `comp-${cIdx}-ev-${idx}`,
        productName: c.productName || `Competitor ${cIdx + 1}`,
        isTarget: false,
        url: c.url,
      }))
      const compComments = allComments
        .filter((cm: any) => {
          if (cm.is_target === true) return false
          const u = (cm.product_url || '').toLowerCase()
          const cUrl = (c.url || '').toLowerCase()
          const pName = (cm.product_name || '').toLowerCase()
          const cName = (c.productName || '').toLowerCase()
          return (cUrl && (u === cUrl || u.includes(cUrl) || cUrl.includes(u))) || (cName && (pName === cName || pName.includes(cName.slice(0, 15)) || cName.includes(pName.slice(0, 15))))
        })
        .map((cm: any, idx: number) => commentToEvent(cm, false, c.productName || `Competitor ${cIdx + 1}`, c.url, idx, `comp-${cIdx}-c`))
      return [...sales, ...compComments]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCompetitorList, competitorRows, allComments])

  // ── All events sorted newest-first ──
  const allMarketplaceEvents = React.useMemo(() => {
    return [...targetEvents, ...competitorEvents].sort((a, b) =>
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    )
  }, [targetEvents, competitorEvents])

  // ── Selected competitor ──
  const selectedCompetitor = React.useMemo(() => {
    if (selectedProductKey === 'target' || selectedProductKey === 'all') return null
    return allCompetitorList.find(
      (r: any) => r.url === selectedProductKey || r.productName === selectedProductKey
    ) || null
  }, [selectedProductKey, allCompetitorList])

  // ── Active timeline for the card (sales-only events for the telemetry metrics) ──
  const activeTimeline = React.useMemo(() => {
    const saleEventsOnly = allMarketplaceEvents.filter((e: any) => e.type === 'sale')
    if (selectedProductKey === 'all') {
      return {
        has_enough_history: saleEventsOnly.length > 0,
        total_observed_events: saleEventsOnly.length,
        events: allMarketplaceEvents, // mixed for display
        activity_trend_label: saleEventsOnly.length > 0 ? 'Marketplace Verified' : 'Awaiting data',
        activity_trend: 'stable' as const,
        activity_trend_reason: `${allMarketplaceEvents.length} total events (sales, reviews, comments) across all monitored products.`,
        last_observed_activity: saleEventsOnly[0] || null,
        previous_observed_activity: saleEventsOnly[1] || null,
        interval_between_last_two: salesTimeline?.interval_between_last_two || null,
        average_observed_interval: salesTimeline?.average_observed_interval || null,
      }
    }
    if (selectedCompetitor) {
      return selectedCompetitor.activity_timeline || selectedCompetitor.salesAnalysis?.sales_activity_timeline || null
    }
    return salesTimeline
  }, [selectedProductKey, allMarketplaceEvents, selectedCompetitor, salesTimeline])

  const activeProductName = React.useMemo(() => {
    if (selectedProductKey === 'all') return 'All Market Competitors & You'
    if (selectedCompetitor) return selectedCompetitor.productName
    return targetName
  }, [selectedProductKey, selectedCompetitor, targetName])

  // ── Active events for the visible timeline list (respects selected product & type filter) ──
  const activeEvents = React.useMemo(() => {
    let list = allMarketplaceEvents
    if (selectedProductKey === 'target') {
      list = targetEvents
    } else if (selectedCompetitor) {
      const cUrl = (selectedCompetitor.url || '').toLowerCase()
      const cName = (selectedCompetitor.productName || '').toLowerCase()
      list = allMarketplaceEvents.filter((e: any) => {
        const eUrl = (e.url || '').toLowerCase()
        const eName = (e.productName || '').toLowerCase()
        if (cUrl && (eUrl === cUrl || eUrl.includes(cUrl) || cUrl.includes(eUrl))) return true
        if (cName && (eName === cName || eName.includes(cName.slice(0, 15)) || cName.includes(eName.slice(0, 15)))) return true
        return false
      })
    }
    if (eventTypeFilter !== 'all') {
      list = list.filter((e: any) => e.type === eventTypeFilter)
    }
    return list
  }, [selectedProductKey, allMarketplaceEvents, selectedCompetitor, targetEvents, eventTypeFilter])

  const totalSaleEvents = React.useMemo(() => allMarketplaceEvents.filter((e: any) => e.type === 'sale').length, [allMarketplaceEvents])
  const totalReviewEvents = React.useMemo(() => allMarketplaceEvents.filter((e: any) => e.type === 'review').length, [allMarketplaceEvents])
  const totalCommentEvents = React.useMemo(() => allMarketplaceEvents.filter((e: any) => e.type === 'comment').length, [allMarketplaceEvents])

  // ── Filtered events for the modal ──
  const filteredModalEvents = React.useMemo(() => {
    let list = allMarketplaceEvents
    // product filter
    if (eventsModalFilter === 'target') {
      list = targetEvents
    } else if (eventsModalFilter !== 'all') {
      list = allMarketplaceEvents.filter((e: any) => e.url === eventsModalFilter || e.productName === eventsModalFilter)
    }
    // type filter
    if (eventsModalTypeFilter !== 'all') {
      list = list.filter((e: any) => e.type === eventsModalTypeFilter)
    }
    // search
    if (!eventsModalSearch.trim()) return list
    const q = eventsModalSearch.toLowerCase()
    return list.filter((e: any) => {
      const p = (e.productName || '').toLowerCase()
      const d = (e.formattedDate || '').toLowerCase()
      const text = (e.comment_text || '').toLowerCase()
      const topic = (e.topic_label || '').toLowerCase()
      const price = String(e.price || '').toLowerCase()
      const gained = e.salesGained != null ? `+${e.salesGained} unit` : ''
      return p.includes(q) || d.includes(q) || text.includes(q) || topic.includes(q) || price.includes(q) || gained.includes(q)
    })
  }, [allMarketplaceEvents, targetEvents, eventsModalFilter, eventsModalTypeFilter, eventsModalSearch])

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading target SaaS telemetry...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Building className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Create or run an analysis on your target product to monitor its features, pricing, SEO, and competitive posture.
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

  const isShowingAllMarket = selectedProductKey === 'all'
  const isSelectedCompetitor = Boolean(selectedCompetitor)

  // Helper to compute sales volume based on timeRange
  const getSalesVolumeByTimeRange = (isTarget: boolean, item: any, compIdx?: number): number => {
    if (timeRange === 'all') {
      // For target: prefer envatoSales.total_sales → mySalesAnalysis.current_sales
      // For competitors: prefer envatoSales.total_sales → salesAnalysis.current_sales / compRow.current_sales
      if (isTarget) return getProductNumericSales(myProduct, mySalesAnalysis)
      const compRow = competitorRows.find(
        (r: any) => r.url === item?.url || r.productName === item?.productName
      ) || (typeof compIdx === 'number' ? competitorRows[compIdx] : null)
      return getProductNumericSales(
        item,
        item?.salesAnalysis || compRow?.salesAnalysis || compRow || currentProjectData?.competitor_sales_analysis
      )
    }

    if (isTarget) {
      if (mySalesAnalysis) {
        if (timeRange === 'today') {
          const v = mySalesAnalysis.sales_gained_24h
          if (v !== null && v !== undefined) return v
          if (mySalesAnalysis.last_sales_increase) {
            const diffHours = (Date.now() - new Date(mySalesAnalysis.last_sales_increase).getTime()) / (1000 * 60 * 60)
            if (diffHours <= 24) return Math.max(1, mySalesAnalysis.sales_difference || 1)
          }
          return mySalesAnalysis.sales_difference ? Math.max(0, mySalesAnalysis.sales_difference) : 0
        }
        if (timeRange === '7d') {
          const v = mySalesAnalysis.sales_gained_7d
          if (v !== null && v !== undefined) return v
          if (mySalesAnalysis.last_sales_increase) {
            const diffDays = (Date.now() - new Date(mySalesAnalysis.last_sales_increase).getTime()) / (1000 * 60 * 60 * 24)
            if (diffDays <= 7) return Math.max(1, mySalesAnalysis.sales_difference || 1)
          }
          return mySalesAnalysis.sales_difference ? Math.max(0, mySalesAnalysis.sales_difference) : 0
        }
        if (timeRange === '30d') {
          const v = mySalesAnalysis.sales_gained_30d
          if (v !== null && v !== undefined) return v
          if (mySalesAnalysis.last_sales_increase) {
            const diffDays = (Date.now() - new Date(mySalesAnalysis.last_sales_increase).getTime()) / (1000 * 60 * 60 * 24)
            if (diffDays <= 30) return Math.max(1, mySalesAnalysis.sales_difference || 1)
          }
          return mySalesAnalysis.sales_difference ? Math.max(0, mySalesAnalysis.sales_difference) : 0
        }
      }
      return 0
    } else {
      // Find matching competitor row
      const compRow = competitorRows.find(
        (r: any) => r.url === item?.url || r.productName === item?.productName
      ) || (typeof compIdx === 'number' ? competitorRows[compIdx] : null)

      if (compRow) {
        if (timeRange === 'today') return compRow.sales_24h ?? compRow.salesAnalysis?.sales_gained_24h ?? 0
        if (timeRange === '7d') return compRow.sales_7d ?? compRow.salesAnalysis?.sales_gained_7d ?? 0
        if (timeRange === '30d') return compRow.sales_30d ?? compRow.salesAnalysis?.sales_gained_30d ?? 0
      }
      const directAnalysis = item?.salesAnalysis || currentProjectData?.competitor_sales_analysis
      if (directAnalysis) {
        if (timeRange === 'today') return directAnalysis.sales_gained_24h ?? 0
        if (timeRange === '7d') return directAnalysis.sales_gained_7d ?? 0
        if (timeRange === '30d') return directAnalysis.sales_gained_30d ?? 0
      }
      return 0
    }
  }

  // Build Comparative Chart Data for Target vs Competitors
  const comparisonChartData = [
    {
      name: `${targetName.slice(0, 16)} (You)`,
      fullName: targetName,
      isTarget: true,
      price: getProductNumericPrice(myProduct),
      sales: getSalesVolumeByTimeRange(true, myProduct),
      rating: getProductNumericRating(myProduct),
      timeline: salesTimeline,
    },
    ...competitors.map((c: any, idx: number) => {
      const compRow = competitorRows.find(
        (r: any) => r.url === c?.url || r.productName === c?.productName
      ) || (typeof idx === 'number' ? competitorRows[idx] : null)
      const compTimeline = compRow?.activity_timeline || compRow?.salesAnalysis?.sales_activity_timeline || c?.salesAnalysis?.sales_activity_timeline || null

      return {
        name: `${c.productName || `Competitor ${idx + 1}`}`,
        fullName: c.productName || `Competitor ${idx + 1}`,
        isTarget: false,
        price: getProductNumericPrice(c),
        sales: getSalesVolumeByTimeRange(false, c, idx),
        rating: getProductNumericRating(c),
        timeline: compTimeline,
        _salesAnalysis: c.salesAnalysis || compRow?.salesAnalysis || compRow || null,
      }
    }),
  ]

  // 1. Key Takeaway calculation
  const targetSalesCount = getProductSales(myProduct, mySalesAnalysis)
  const targetPriceStr = getProductPrice(myProduct)
  const amzPurchaseBadge = (myProduct as any)?.amazonPurchaseBadge || (targetSalesCount !== 'Not available' ? `${targetSalesCount}+ bought in past month` : null)
  const keyTakeaway = isAmazonWorkspace
    ? (amzPurchaseBadge
        ? `Public purchase signal: ${amzPurchaseBadge} at a list price of ${targetPriceStr}.`
        : `Public pricing cataloged at ${targetPriceStr}. Public monthly purchase badge not observed on listing.`)
    : (targetSalesCount !== 'Not available'
        ? `Your product has accumulated ${targetSalesCount} verified sales at a list price of ${targetPriceStr}.`
        : `Public pricing cataloged at ${targetPriceStr}. Historical sales telemetry waiting for marketplace connector verification.`)

  // 3. Main Insight calculation
  const mainInsightTitle = competitors.length > 0
    ? `Commercial Positioning vs ${competitors.length} Monitored Rival${competitors.length === 1 ? '' : 's'}`
    : `Single Product Commercial Baseline`

  const mainInsightDesc = isAmazonWorkspace
    ? (competitors.length > 0
        ? `List price (${targetPriceStr}) and public purchase signals benchmarked directly against indexed competitor landing pages.`
        : `Catalog telemetry captured from public landing page and commercial specification tables.`)
    : (competitors.length > 0
        ? `List price (${targetPriceStr}) and unit volume (${targetSalesCount}) benchmarked directly against indexed competitor landing pages.`
        : `Catalog telemetry captured from public landing page and commercial specification tables.`)

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
              Sales & Commercial Intelligence
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {currentProjectMeta?.platform || 'generic'} platform
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-400 shrink-0" />
            <span>{targetName} — Sales & Pricing</span>
          </h1>
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-mono"
          >
            <span className="truncate max-w-md">{targetUrl}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        {/* Time Range Selector & Action Links */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range pill selector */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs">
            <button
              onClick={() => handleTimeRangeChange('today')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                timeRange === 'today' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleTimeRangeChange('7d')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                timeRange === '7d' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleTimeRangeChange('30d')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                timeRange === '30d' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleTimeRangeChange('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                timeRange === 'all' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={async () => {
              if (!currentProjectId || refreshing) return
              setRefreshing(true)
              try {
                const res = await fetch(`/api/analyses/${currentProjectId}/run`, { method: 'POST' })
                if (res.ok) {
                  await refreshProjects()
                }
              } catch (err) {
                console.error('Failed to live refresh:', err)
              } finally {
                setRefreshing(false)
              }
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
            title="Scan live website & official catalog right now"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Scanning Live...' : 'Check Live Sales'}</span>
          </button>

          <Link href={`/analyses/${currentProjectId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Full Matrix</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. KEY TAKEAWAY */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Key Takeaway</span>
            <p className="text-xs text-foreground font-semibold leading-relaxed">
              {keyTakeaway}
            </p>
          </div>
        </div>
      </Card>

      {/* 1b. MARKET POSITION (Strictly Amazon workspaces with BSR telemetry) */}
      {hasBsr && marketPosition && (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
                  Market Position (BSR)
                </Badge>
                {marketPosition?.myCategory && (
                  <Badge variant="secondary" className="text-[10px]">
                    {marketPosition.myCategory}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1">
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

      {/* 2. KEY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            List Price
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {getProductPrice(myProduct)}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {isAmazonWorkspace
              ? 'Current price'
              : ((myProduct?.pricingPlans?.[0] as any)?.interval || (myProduct?.envatoSales ? 'Commercial license' : 'Catalog price'))}
          </span>
        </Card>

        <Card className="border-border bg-card p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {isAmazonWorkspace ? 'Purchase Signal (Past Month)' : (timeRange === 'all' ? 'Verified Sales' : `Sales (${timeRange === 'today' ? 'Today' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`)}
            </span>
            {!isAmazonWorkspace && mySalesAnalysis?.last_sales_increase && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">
                +1 sale
              </Badge>
            )}
          </div>
          <div className="text-xl font-bold text-foreground mt-1 flex items-baseline gap-2">
            {isAmazonWorkspace ? (
              <span className="text-base font-bold text-foreground">
                {amzPurchaseBadge || (targetSalesCount !== 'Not available' ? `${targetSalesCount}+ bought` : 'Not publicly observed')}
              </span>
            ) : (
              timeRange === 'all' ? (
                <span>{getProductSales(myProduct, mySalesAnalysis)}</span>
              ) : (
                <>
                  <span className="text-emerald-400 font-extrabold">
                    {getSalesVolumeByTimeRange(true, myProduct) >= 0 ? `+${getSalesVolumeByTimeRange(true, myProduct)}` : getSalesVolumeByTimeRange(true, myProduct)}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    units ({getProductSales(myProduct, mySalesAnalysis)} total)
                  </span>
                </>
              )
            )}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {isAmazonWorkspace
              ? 'Public Amazon purchase badge'
              : (mySalesAnalysis?.last_sales_increase ? 'Marketplace sales increases' : 'Verified marketplace sales count')}
          </span>
          {mySalesAnalysis?.last_sales_increase ? (
            <div className="mt-1 pt-1 border-t border-border/40 text-[10px] text-muted-foreground flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span>+{mySalesAnalysis.sales_difference || 1} Sale recorded {mySalesAnalysis.time_since_last_increase || 'recently'}</span>
              </span>
              <span className="text-[9px] font-mono opacity-80">
                {new Date(mySalesAnalysis.last_sales_increase).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {mySalesAnalysis ? 'verified units sold' : 'Waiting for 2nd snapshot'}
            </span>
          )}
        </Card>

        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Rating Score
          </span>
          <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>{getProductRating(myProduct)}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            customer satisfaction
          </span>
        </Card>

        <Link href="/dashboard/comments" className="block group">
          <Card className="border-border bg-card p-3.5 h-full group-hover:border-primary/60 group-hover:bg-muted/20 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Total Comments
              </span>
              <span className="text-[9px] text-muted-foreground/70 group-hover:text-primary">
                Feedback →
              </span>
            </div>
            <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-1.5 text-primary">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>{ownMarketplaceComments && ownMarketplaceComments > ownCommentsCount ? `${ownCommentsCount} / ${ownMarketplaceComments}` : ownCommentsCount}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {ownSummary?.positive_count ? `${ownSummary.positive_count} pos · ` : ''}{ownSummary?.negative_count ? `${ownSummary.negative_count} complaints` : 'analyzed discussions'}
            </span>
          </Card>
        </Link>

        <Card className="border-border bg-card p-3.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Detected Features
          </span>
          <div className="text-xl font-bold text-foreground mt-1">
            {myProduct?.features?.length || 0}
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            verified specifications
          </span>
        </Card>
      </div>

      {/* 3. MAIN INSIGHT */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span>Main Insight: {mainInsightTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
          {mainInsightDesc}
        </CardContent>
      </Card>

      {/* 4. EVIDENCE / DETAILS (Chart & Pricing Tables) */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Evidence: Competitive Sales & Pricing Comparison</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Direct comparison of your product against rival products for {timeRange === 'today' ? 'today' : timeRange === '7d' ? 'the last 7 days' : timeRange === '30d' ? 'the last 30 days' : 'all recorded time'}.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
            <button
              onClick={() => setChartMetric('price')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                chartMetric === 'price' ? 'bg-background text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Price ($)
            </button>
            <button
              onClick={() => setChartMetric('sales')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                chartMetric === 'sales' ? 'bg-background text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {timeRange === 'all' ? 'Units Sold' : `Units Gained (${timeRange === 'today' ? 'Today' : timeRange === '7d' ? '7d' : '30d'})`}
            </button>
            <button
              onClick={() => setChartMetric('rating')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                chartMetric === 'rating' ? 'bg-background text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rating (★)
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}

              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  unit={chartMetric === 'price' ? '$' : ''}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem', fontSize: '12px' }}
                  labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                  formatter={(value: any) => [
                    chartMetric === 'price'
                      ? `$${value}`
                      : chartMetric === 'sales'
                      ? `${value} units ${timeRange === 'all' ? '(Total)' : `(in ${timeRange === 'today' ? 'today' : timeRange === '7d' ? 'last 7 days' : 'last 30 days'})`}`
                      : `${value} ★`,
                    chartMetric === 'price'
                      ? 'List Price'
                      : chartMetric === 'sales'
                      ? (timeRange === 'all' ? 'All-Time Sales' : `Sales Gained (${timeRange})`)
                      : 'Rating'
                  ]}
                />
                <Bar
                  dataKey={chartMetric}
                  radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fill: '#e4e4e7', fontSize: 11, fontWeight: 'bold' }}
                  name={
                    chartMetric === 'price'
                      ? 'Price ($)'
                      : chartMetric === 'sales'
                      ? (timeRange === 'all' ? 'Total Units Sold' : `Units Gained (${timeRange === 'today' ? 'Today' : timeRange === '7d' ? '7d' : '30d'})`)
                      : 'Rating Score'
                  }
                >
                  {comparisonChartData.map((entry, index) => {
                    const isSelected = entry.isTarget
                      ? selectedProductKey === 'target'
                      : selectedProductKey === (entry.timeline?.source_url || entry.fullName || entry.name)
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isTarget ? '#6366f1' : isSelected ? '#10b981' : '#059669'}
                        opacity={isSelected ? 1 : 0.75}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedProductKey(entry.isTarget ? 'target' : (entry.timeline?.source_url || entry.fullName || entry.name))
                        }}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedProductKey('target')}>
              <span className="h-3 w-3 rounded bg-indigo-500" />
              <span>Your Product ({targetName})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              <span>Competitors (Click any bar to view sales timeline)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. SALES ACTIVITY TIMELINE */}
      <Card className={`border-border bg-card transition-all duration-300 ${isSelectedCompetitor ? 'ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/5' : isShowingAllMarket ? 'ring-1 ring-primary/40 shadow-lg shadow-primary/5' : ''}`}>
        <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Sales Activity Timeline</span>
              {isShowingAllMarket ? (
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px] flex items-center gap-1.5 font-mono py-0.5 px-2">
                  <span>All Marketplace Products</span>
                </Badge>
              ) : isSelectedCompetitor ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] flex items-center gap-1.5 font-mono py-0.5 px-2 animate-in fade-in">
                  <span>Viewing Rival: {activeProductName.slice(0, 32)}</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0 px-2 text-indigo-400 border-indigo-500/30">
                  {targetName} (You)
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {isShowingAllMarket
                ? `Combined verified sales timeline across ${1 + allCompetitorList.length} monitored marketplace products (${allMarketplaceEvents.length} events).`
                : isSelectedCompetitor
                ? `Showing telemetry for competitor ${activeProductName}. Click any row in the comparison table below to change.`
                : 'Deterministic observation intervals and momentum between verified sales increases.'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {activeTimeline?.activity_trend === 'accelerating' ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 text-[11px] font-mono font-medium">
                <TrendingUp className="h-3 w-3" />
                <span>Accelerating Cadence</span>
              </Badge>
            ) : activeTimeline?.activity_trend === 'slowing' ? (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1.5 text-[11px] font-mono font-medium">
                <TrendingDown className="h-3 w-3" />
                <span>Slowing Cadence</span>
              </Badge>
            ) : activeTimeline?.activity_trend === 'stable' ? (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1.5 text-[11px] font-mono font-medium">
                <Activity className="h-3 w-3" />
                <span>Stable Cadence</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                Insufficient sales history
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4 text-xs">
          {/* Telemetry Metrics Grid (4 items) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Last Observed Activity */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Last Observed Activity
                </span>
                <div className="text-lg font-bold text-foreground mt-1 flex items-baseline gap-1.5">
                  {activeTimeline?.last_observed_activity ? (
                    <>
                      <span className="text-emerald-400">+{activeTimeline.last_observed_activity.salesGained} unit{activeTimeline.last_observed_activity.salesGained > 1 ? 's' : ''}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({activeTimeline.last_observed_activity.newTotalSales} total)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">No activity observed</span>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                {activeTimeline?.last_observed_activity ? (
                  <span className="truncate block font-mono">
                    {activeTimeline.last_observed_activity.formattedDate}
                  </span>
                ) : (
                  <span>Awaiting initial sales increase</span>
                )}
              </div>
            </div>

            {/* 2. Previous Observed Activity */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Previous Observed Activity
                </span>
                <div className="text-lg font-bold text-foreground mt-1 flex items-baseline gap-1.5">
                  {activeTimeline?.previous_observed_activity ? (
                    <>
                      <span className="text-emerald-400">+{activeTimeline.previous_observed_activity.salesGained} unit{activeTimeline.previous_observed_activity.salesGained > 1 ? 's' : ''}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({activeTimeline.previous_observed_activity.newTotalSales} total)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">Insufficient sales history</span>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                {activeTimeline?.previous_observed_activity ? (
                  <span className="truncate block font-mono">
                    {activeTimeline.previous_observed_activity.formattedDate}
                  </span>
                ) : (
                  <span>Requires at least 2 observed events</span>
                )}
              </div>
            </div>

            {/* 3. Time Between Observations */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Time Between Observations
                </span>
                <div className="text-lg font-bold text-foreground mt-1">
                  {activeTimeline?.interval_between_last_two ? (
                    <span className="text-primary font-mono">{activeTimeline.interval_between_last_two.formatted}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">Insufficient sales history</span>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                {activeTimeline?.interval_between_last_two ? (
                  <span>{activeTimeline.interval_between_last_two.days} days elapsed between last 2 events</span>
                ) : (
                  <span>Awaiting 2nd observed increase</span>
                )}
              </div>
            </div>

            {/* 4. Average Observed Interval */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Average Observed Interval
                </span>
                <div className="text-lg font-bold text-foreground mt-1">
                  {activeTimeline?.average_observed_interval ? (
                    <span className="text-emerald-400 font-mono">{activeTimeline.average_observed_interval.formatted}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">Insufficient sales history</span>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                {activeTimeline?.average_observed_interval ? (
                  <span>Across {activeTimeline.total_observed_events} observed activity events</span>
                ) : (
                  <span>Requires &ge; 2 observed intervals</span>
                )}
              </div>
            </div>
          </div>

          {/* Activity Trend Explanation Banner */}
          <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs transition-colors ${
            activeTimeline?.activity_trend === 'accelerating'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
              : activeTimeline?.activity_trend === 'slowing'
              ? 'bg-amber-500/10 border-amber-500/30 text-foreground'
              : activeTimeline?.activity_trend === 'stable'
              ? 'bg-blue-500/10 border-blue-500/30 text-foreground'
              : 'bg-muted/15 border-border/60 text-muted-foreground'
          }`}>
            <Activity className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-xs block">
                Activity Trend ({activeProductName}): {activeTimeline?.activity_trend_label || 'Insufficient sales history'}
              </span>
              <p className="text-[11px] leading-relaxed opacity-90">
                {activeTimeline?.activity_trend_reason || 'Requires at least 2 distinct observed sales increase events to evaluate velocity and cadence trends.'}
              </p>
            </div>
          </div>

          {/* Marketplace Events & Chronological Timeline */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            {/* Header row with controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <History className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">
                    Marketplace Events & Activity Feed
                  </span>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono">
                    {activeEvents.length} shown of {allMarketplaceEvents.length} total
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Chronological log of verified sales increases, buyer reviews, and public comments.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEventsModalFilter(selectedProductKey === 'all' ? 'all' : (selectedCompetitor?.url || selectedCompetitor?.productName || 'target'))
                    setEventsModalTypeFilter(eventTypeFilter)
                    setEventsModalOpen(true)
                  }}
                  className="h-7 text-xs gap-1.5 border-border hover:bg-muted/30"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Full Event Modal ({allMarketplaceEvents.length})</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openDailyLogs}
                  className="h-7 text-xs gap-1.5 border-violet-500/40 bg-violet-500/5 text-violet-400 hover:bg-violet-500/15 hover:text-violet-300"
                  title="View actual day-by-day records saved in your database"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Daily DB Logs</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimelineOpen((o) => !o)}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                >
                  <span>{timelineOpen ? 'Collapse' : 'Expand'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform duration-200 ${timelineOpen ? 'rotate-180' : 'rotate-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </Button>
              </div>

            </div>

            {/* Event Type Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setEventTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  eventTypeFilter === 'all'
                    ? 'border-primary bg-primary/20 text-primary font-bold shadow-xs'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>All Events</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/50 font-mono">
                  {allMarketplaceEvents.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEventTypeFilter('sale')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  eventTypeFilter === 'sale'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-xs'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-emerald-400'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                <span>Sales</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/50 font-mono">
                  {totalSaleEvents}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEventTypeFilter('review')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  eventTypeFilter === 'review'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-xs'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-amber-400'
                }`}
              >
                <StarIcon className="h-3 w-3" />
                <span>Reviews</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/50 font-mono">
                  {totalReviewEvents}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEventTypeFilter('comment')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  eventTypeFilter === 'comment'
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300 font-bold shadow-xs'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-sky-400'
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                <span>Comments</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/50 font-mono">
                  {totalCommentEvents}
                </span>
              </button>
            </div>

            {timelineOpen && (
            <>
            {/* Product selection tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/40 scrollbar-none">
              <button
                onClick={() => setSelectedProductKey('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 border ${
                  selectedProductKey === 'all'
                    ? 'border-primary bg-primary/15 text-foreground font-bold shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                <span>All Market Events</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                  {allMarketplaceEvents.length}
                </span>
              </button>
              <button
                onClick={() => setSelectedProductKey('target')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 border ${
                  selectedProductKey === 'target'
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-bold shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                <span>{targetName.split('–')[0].split('-')[0].trim()} (You)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                  {targetEvents.length}
                </span>
              </button>
              {allCompetitorList.map((c: any, cIdx: number) => {
                const isSelected = selectedProductKey === (c.url || c.productName)
                const shortName = (c.productName || `Competitor ${cIdx + 1}`).split('–')[0].split('-')[0].trim()
                const cUrl = (c.url || '').toLowerCase()
                const cName = (c.productName || '').toLowerCase()
                const compEventsCount = allMarketplaceEvents.filter((e: any) => {
                  const eUrl = (e.url || '').toLowerCase()
                  const eName = (e.productName || '').toLowerCase()
                  if (cUrl && (eUrl === cUrl || eUrl.includes(cUrl) || cUrl.includes(eUrl))) return true
                  if (cName && (eName === cName || eName.includes(cName.slice(0, 15)) || cName.includes(eName.slice(0, 15)))) return true
                  return false
                }).length

                return (
                  <button
                    key={c.url || cIdx}
                    onClick={() => setSelectedProductKey(c.url || c.productName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 border ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold shadow-xs'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }`}
                  >
                    <span>{shortName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                      {compEventsCount}
                    </span>
                  </button>
                )
              })}
            </div>

            {activeEvents.length > 0 ? (
              <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden bg-muted/5">
                {activeEvents.map((event: any, idx: number) => {
                  const isYou = event.isTarget || event.productName === targetName
                  const isSale = event.type === 'sale' || event.type == null
                  const isReview = event.type === 'review'
                  const isComment = event.type === 'comment'

                  // Icon & color per type
                  const iconBg = isSale
                    ? (isYou ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400')
                    : isReview
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-sky-500/20 text-sky-400'

                  const EventIcon = isSale ? TrendingUp : isReview ? StarIcon : MessageSquare

                  // Sentiment colour for reviews/comments
                  const sentimentColor = event.sentiment === 'positive' ? 'text-emerald-400'
                    : event.sentiment === 'negative' ? 'text-red-400'
                    : event.sentiment === 'mixed' ? 'text-amber-400'
                    : 'text-muted-foreground'

                  return (
                    <div
                      key={event.id || idx}
                      onClick={() => {
                        setEventsModalFilter(isYou ? 'target' : (event.url || event.productName))
                        setEventsModalTypeFilter(isSale ? 'sale' : isReview ? 'review' : 'comment')
                        setEventsModalOpen(true)
                      }}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                          <EventIcon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isSale ? (
                              <span className="font-semibold text-foreground text-xs">
                                Observed sales increase: +{event.salesGained} unit{event.salesGained > 1 ? 's' : ''}
                              </span>
                            ) : isReview ? (
                              <span className="font-semibold text-foreground text-xs flex items-center gap-1">
                                <span>New Review</span>
                                {event.rating != null && (
                                  <span className="text-amber-400 font-mono">{event.rating}★</span>
                                )}
                              </span>
                            ) : (
                              <span className="font-semibold text-foreground text-xs">
                                {event.topic_label || 'New Comment'}
                              </span>
                            )}
                            {event.productName && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 font-medium ${
                                  isYou ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                }`}
                              >
                                {event.productName.split('–')[0].split('-')[0].trim()} {isYou ? '(You)' : ''}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 capitalize ${isSale ? 'bg-background font-mono' : isReview ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/30'}`}>
                              {isSale ? `${event.newTotalSales} total sales` : isReview ? 'Review' : 'Comment'}
                            </Badge>
                            {!isSale && event.sentiment && (
                              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 capitalize ${sentimentColor} bg-transparent border-current/30`}>
                                {event.sentiment}
                              </Badge>
                            )}
                            {!isSale && event.severity && event.severity !== 'low' && (
                              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 capitalize ${
                                event.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10'
                                : event.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                              }`}>
                                {event.severity}
                              </Badge>
                            )}
                            {isSale && event.intervalFromPreviousFormatted && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                                +{event.intervalFromPreviousFormatted}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{event.formattedDate}</span>
                            {event.relativeTime && <><span>&bull;</span><span>{event.relativeTime}</span></>}
                            {isSale && event.velocityPerDay != null && event.velocityPerDay > 0 && (
                              <><span>&bull;</span><span className="text-emerald-400 font-mono">~{event.velocityPerDay} units/day</span></>
                            )}
                            {!isSale && event.author_name && (
                              <><span>&bull;</span><span className="truncate max-w-[120px]">{event.author_name}</span></>
                            )}
                            {!isSale && event.detected_issue && (
                              <><span>&bull;</span><span className="truncate max-w-[160px] italic opacity-80">{event.detected_issue}</span></>
                            )}
                            <span>&bull;</span>
                            <span className="text-primary group-hover:underline text-[9px]">Click for details &rarr;</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-muted-foreground font-mono self-end sm:self-auto shrink-0">
                        {isSale ? (event.price || 'Marketplace price') : (event.feedback_type || event.topic_label || '')}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-5 rounded-lg bg-muted/15 border border-dashed border-border/80 text-center text-muted-foreground space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Insufficient sales history for {activeProductName}
                </p>
                <p className="text-[11px] max-w-md mx-auto">
                  No sales increases observed across recorded snapshots yet. Verified events will populate here as new sales are logged.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedProductKey('all')}
                    className="text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>View all {allMarketplaceEvents.length} events observed across marketplace competitors &rarr;</span>
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/80 italic pt-1">
              * Note: Events denote marketplace snapshot observation checks. Exact customer checkout seconds are not fabricated.
            </p>
            </>
            )}
          </div>


        </CardContent>
      </Card>

      {/* ML Sales Forecasting & Trend Projection */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Short-Term Sales Forecast (7-Day Trend Projection)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Predictive run-rate estimation based on chronological sales velocity across historical snapshots.
            </CardDescription>
          </div>
          {mySalesAnalysis?.forecast?.is_available ? (
            <Badge variant="success" className="text-[10px] self-start sm:self-auto">
              Confidence: {mySalesAnalysis.forecast.confidence_label} ({Math.round((mySalesAnalysis.forecast.confidence_score ?? 0.7) * 100)}%)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground self-start sm:self-auto">
              Awaiting 7+ Snapshots
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-3">
          {mySalesAnalysis?.forecast?.is_available ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Expected 7-Day Total
                  </span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {mySalesAnalysis.forecast.forecasted_sales_expected} units
                  </div>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block">
                    +{mySalesAnalysis.forecast.projected_units_gain} projected sales gain
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Prediction Variance Range
                  </span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {mySalesAnalysis.forecast.forecasted_sales_low} – {mySalesAnalysis.forecast.forecasted_sales_high}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    statistical confidence interval (80% CI)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Model Training Base
                  </span>
                  <div className="text-xl font-bold text-purple-400 mt-1">
                    {mySalesAnalysis.forecast.historical_data_points} snapshots
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {mySalesAnalysis.forecast.model_type}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Observed Fact vs Prediction: Real verified sales volume is {mySalesAnalysis.current_sales ?? 'recorded'} units. Projections extrapolate daily velocity and will automatically adapt as new hourly snapshots are logged.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/15 border border-border/60 flex items-start gap-3 text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-foreground text-xs block">
                  Sales Forecasting Model Unavailable (Insufficient Historical Data)
                </span>
                <p className="text-xs leading-relaxed">
                  {mySalesAnalysis?.forecast?.reason || 'Predictive forecasting requires at least 7 distinct historical snapshot observations to prevent false extrapolations. Background monitoring continues to collect hourly snapshots.'}
                </p>
                <span className="text-[10px] text-muted-foreground block pt-1 font-mono">
                  Current Snapshots: {mySalesAnalysis?.sales_history?.length || 0} / 7 minimum required
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Data Provenance Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Verified from public landing page & catalog data. Zero fabricated metrics.</span>
        </span>
        <span>Last Analyzed: {currentProjectMeta?.updatedAt ? new Date(currentProjectMeta.updatedAt).toLocaleDateString() : 'Recent'}</span>
      </div>
      {/* Events Modal — shows ALL events when clicking event triggers */}
      {eventsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setEventsModalOpen(false)}
        >
          <div
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  All Events Listed
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {filteredModalEvents.length} event{filteredModalEvents.length !== 1 ? 's' : ''} · Click any row to view source
                </p>
              </div>
              <button
                onClick={() => setEventsModalOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Filter + Search Bar */}
            <div className="px-5 py-3 border-b border-border/50 space-y-2">
              {/* Product filter pills */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {[
                  { key: 'all', label: `All Products (${allMarketplaceEvents.length})` },
                  { key: 'target', label: `${targetName.split('–')[0].trim()} · You (${targetEvents.length})` },
                  ...allCompetitorList.map((c: any) => {
                    const cUrl = (c.url || '').toLowerCase()
                    const cName = (c.productName || '').toLowerCase()
                    const count = allMarketplaceEvents.filter((e: any) => {
                      const eUrl = (e.url || '').toLowerCase()
                      const eName = (e.productName || '').toLowerCase()
                      if (cUrl && (eUrl === cUrl || eUrl.includes(cUrl) || cUrl.includes(eUrl))) return true
                      if (cName && (eName === cName || eName.includes(cName.slice(0, 15)) || cName.includes(eName.slice(0, 15)))) return true
                      return false
                    }).length
                    return {
                      key: c.url || c.productName,
                      label: `${(c.productName || 'Competitor').split('–')[0].split('-')[0].trim()} (${count})`,
                    }
                  }),
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setEventsModalFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 border transition-colors ${
                      eventsModalFilter === f.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Event type filter pills */}
              <div className="flex items-center gap-1.5">
                {(['all', 'sale', 'review', 'comment'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEventsModalTypeFilter(t)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border transition-colors ${
                      eventsModalTypeFilter === t
                        ? t === 'sale' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : t === 'review' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : t === 'comment' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-muted text-foreground border-border'
                        : 'border-border/50 text-muted-foreground hover:bg-muted/20'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t === 'sale' ? '📈 Sales' : t === 'review' ? '⭐ Reviews' : '💬 Comments'}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by date, product, topic, text..."
                  value={eventsModalSearch}
                  onChange={(e) => setEventsModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border/60 rounded-lg outline-none focus:border-primary/50 focus:bg-muted/50 transition-colors placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {filteredModalEvents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No events found</p>
                  <p className="text-[11px] mt-1 opacity-70">Try changing the filter or search term.</p>
                </div>
              ) : (
                filteredModalEvents.map((event: any, idx: number) => {
                  const isYou = event.isTarget || event.productName === targetName
                  const isSale = event.type === 'sale' || event.type == null
                  const isReview = event.type === 'review'
                  const iconBg = isSale
                    ? (isYou ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400')
                    : isReview ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                  const EventIcon = isSale ? TrendingUp : isReview ? StarIcon : MessageSquare
                  const sentimentColor = event.sentiment === 'positive' ? 'text-emerald-400'
                    : event.sentiment === 'negative' ? 'text-red-400'
                    : event.sentiment === 'mixed' ? 'text-amber-400'
                    : 'text-muted-foreground'
                  return (
                    <div
                      key={event.id || idx}
                      className="px-5 py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-muted/15 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                          <EventIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isSale ? (
                              <span className="font-semibold text-foreground text-xs">
                                +{event.salesGained} unit{event.salesGained > 1 ? 's' : ''} sale increase
                              </span>
                            ) : isReview ? (
                              <span className="font-semibold text-foreground text-xs flex items-center gap-1">
                                New Review {event.rating != null && <span className="text-amber-400 font-mono">{event.rating}★</span>}
                              </span>
                            ) : (
                              <span className="font-semibold text-foreground text-xs">{event.topic_label || 'New Comment'}</span>
                            )}
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${
                              isYou ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                            }`}>
                              {(event.productName || '').split('–')[0].split('-')[0].trim()}{isYou ? ' (You)' : ''}
                            </Badge>
                            {isSale ? (
                              <>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono bg-background">{event.newTotalSales} total</Badge>
                                {event.intervalFromPreviousFormatted && (
                                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">+{event.intervalFromPreviousFormatted} since prev</Badge>
                                )}
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className={`text-[10px] py-0 px-1.5 capitalize ${sentimentColor} border-current/30 bg-transparent`}>{event.sentiment}</Badge>
                                {event.severity && event.severity !== 'low' && (
                                  <Badge variant="outline" className={`text-[10px] py-0 px-1.5 capitalize ${
                                    event.severity === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10'
                                    : event.severity === 'high' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                                    : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                  }`}>{event.severity}</Badge>
                                )}
                              </>
                            )}
                          </div>
                          {!isSale && event.comment_text && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic max-w-sm">
                              &ldquo;{event.comment_text}&rdquo;
                            </p>
                          )}
                          {!isSale && event.detected_issue && (
                            <p className="text-[10px] text-muted-foreground/70 truncate max-w-sm">Issue: {event.detected_issue}</p>
                          )}
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span className="font-mono">{event.formattedDate}</span>
                            {event.relativeTime && <><span>·</span><span>{event.relativeTime}</span></>}
                            {isSale && event.velocityPerDay != null && event.velocityPerDay > 0 && (
                              <><span>·</span><span className="text-emerald-400 font-mono">~{event.velocityPerDay} units/day</span></>
                            )}
                            {!isSale && event.author_name && <><span>·</span><span className="font-medium">{event.author_name}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono self-end sm:self-start shrink-0 mt-0.5">
                        {isSale ? (event.price || 'Marketplace') : (event.feedback_type || event.topic_label || '')}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Showing {filteredModalEvents.length} of {allMarketplaceEvents.length} total events
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEventsModalOpen(false)}
                className="h-7 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BSR MARKET POSITION DETAILS MODAL (Phase 2 - Platform Gated) */}
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DAILY DB LOGS MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showDailyLogsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Daily Database Logs"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDailyLogsModal(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border border-border/80 bg-background shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border/80 bg-muted/20 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h2 className="font-bold text-base text-foreground">Daily Database Logs</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 font-mono uppercase tracking-wide">Live DB</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-9">
                  Actual rows saved in your database per day — this is what the Vercel Cron collects nightly.
                </p>
              </div>
              <button
                onClick={() => setShowDailyLogsModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Loading */}
            {dailyLogsLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <div className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                <p className="text-sm text-muted-foreground">Fetching database records…</p>
              </div>
            )}

            {/* Content */}
            {!dailyLogsLoading && dailyLogsData && (() => {
              const dlProducts: any[] = dailyLogsData.products || []
              const dlOwn = dlProducts.find((p: any) => p.isOwnProduct)
              const dlComps = dlProducts.filter((p: any) => !p.isOwnProduct)
              const dlSelected = dlProducts.find((p: any) =>
                dailyLogsProduct === '__own__' ? p.isOwnProduct : p.url === dailyLogsProduct
              ) || dlOwn

              return (
                <>
                  {/* Product Tabs */}
                  <div className="flex items-center gap-0.5 px-4 pt-3 pb-0 overflow-x-auto scrollbar-none shrink-0 border-b border-border/40">
                    {dlOwn && (
                      <button
                        onClick={() => setDailyLogsProduct('__own__')}
                        className={`px-3 py-2 rounded-t-lg text-xs font-medium transition-all shrink-0 border-b-2 -mb-px ${
                          dailyLogsProduct === '__own__'
                            ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 rounded bg-violet-500/20 text-violet-400 font-bold uppercase">You</span>
                          {(dlOwn.productName || 'Your Product').split('–')[0].split('-')[0].trim().slice(0, 22)}
                          <span className="text-[10px] font-mono text-muted-foreground">{dlOwn.days_with_data}d</span>
                        </span>
                      </button>
                    )}
                    {dlComps.map((p: any) => (
                      <button
                        key={p.url}
                        onClick={() => setDailyLogsProduct(p.url)}
                        className={`px-3 py-2 rounded-t-lg text-xs font-medium transition-all shrink-0 border-b-2 -mb-px ${
                          dailyLogsProduct === p.url
                            ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {(p.productName || p.url).split('–')[0].split('-')[0].trim().slice(0, 22)}
                          <span className="text-[10px] font-mono text-muted-foreground">{p.days_with_data}d</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Summary bar */}
                  {dlSelected && (
                    <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-muted/10 border-b border-border/40 text-xs shrink-0">
                      <span className="text-muted-foreground">
                        <span className="font-bold text-foreground">{dlSelected.total_snapshots}</span> total DB snapshots
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-bold text-foreground">{dlSelected.days_with_data}</span> days with data
                      </span>
                      {dlSelected.first_ever && (
                        <span className="text-muted-foreground">
                          First collected: <span className="font-bold text-foreground">{dlSelected.first_ever.split('T')[0]}</span>
                        </span>
                      )}
                      {dlSelected.latest && (
                        <span className="text-muted-foreground">
                          Latest: <span className="font-bold text-foreground">{dlSelected.latest.split('T')[0]}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Table */}
                  <div className="flex-1 overflow-y-auto">
                    {dlSelected && dlSelected.days.length > 0 ? (
                      <div className="divide-y divide-border/40">
                        {(() => {
                          // Inject gap rows for non-consecutive dates
                          const rows: any[] = []
                          const dayEntries: any[] = dlSelected.days
                          for (let i = 0; i < dayEntries.length; i++) {
                            rows.push({ type: 'data', entry: dayEntries[i] })
                            if (i < dayEntries.length - 1) {
                              const curr = new Date(dayEntries[i].date)
                              const next = new Date(dayEntries[i + 1].date)
                              const diffDays = Math.round((curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
                              if (diffDays > 1) {
                                rows.push({ type: 'gap', from: dayEntries[i + 1].date, to: dayEntries[i].date, days: diffDays - 1 })
                              }
                            }
                          }
                          return rows.map((row: any, idx: number) => {
                            if (row.type === 'gap') {
                              const fromStr = new Date(row.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              const toStr = new Date(row.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              return (
                                <div key={`gap-${idx}`} className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-l-2 border-amber-500/30">
                                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                                  <span className="text-[11px] text-amber-400">
                                    {fromStr}–{toStr}: <span className="font-semibold">{row.days}-day gap</span> — no data collected (Vercel Cron or app not triggered)
                                  </span>
                                </div>
                              )
                            }

                            const e = row.entry
                            const growth = e.daily_growth
                            const growthColor = growth === null ? 'text-muted-foreground'
                              : growth > 0 ? 'text-emerald-400'
                              : growth < 0 ? 'text-red-400'
                              : 'text-muted-foreground'
                            const growthLabel = growth === null ? '—'
                              : growth > 0 ? `+${growth}`
                              : growth < 0 ? `${growth}`
                              : '±0'

                            const localDate = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                            const firstTime = new Date(e.first_captured_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
                            const lastTime = new Date(e.last_captured_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

                            return (
                              <div key={e.date} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  {/* Date */}
                                  <div className="flex items-center gap-2 shrink-0 min-w-[170px]">
                                    <div className="p-1.5 rounded-md bg-muted/40">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-foreground">{localDate}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono">
                                        {e.snapshots_saved} snapshot{e.snapshots_saved !== 1 ? 's' : ''} saved
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sales */}
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Sales</span>
                                      <span className="text-sm font-bold text-foreground">
                                        {e.closing_sales ?? '—'}
                                      </span>
                                    </div>
                                    {e.opening_sales !== e.closing_sales && e.opening_sales !== null && (
                                      <span className="text-xs text-muted-foreground">from {e.opening_sales}</span>
                                    )}
                                    <span className={`text-xs font-bold font-mono ${growthColor}`}>{growthLabel}</span>
                                  </div>

                                  {/* Price & Rating */}
                                  <div className="flex items-center gap-4">
                                    {e.price && (
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Price</span>
                                        <span className="text-xs font-semibold text-foreground">{e.price}</span>
                                      </div>
                                    )}
                                    {e.rating !== null && e.rating !== undefined && (
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rating</span>
                                        <span className="text-xs font-semibold text-amber-400">★ {e.rating}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Timestamps */}
                                  <div className="text-right shrink-0">
                                    <div className="text-[10px] text-muted-foreground">First: <span className="font-mono text-foreground">{firstTime}</span></div>
                                    <div className="text-[10px] text-muted-foreground">Last: <span className="font-mono text-foreground">{lastTime}</span></div>
                                  </div>
                                </div>

                                {/* Activity events on that day */}
                                {e.activities && e.activities.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5 ml-9">
                                    {e.activities.map((act: any) => (
                                      <span
                                        key={act.id}
                                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                          act.impact === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                          : act.impact === 'negative' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                          : 'bg-muted/30 text-muted-foreground border-border/40'
                                        }`}
                                        title={act.title}
                                      >
                                        {act.title}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        })()}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <div className="p-3 rounded-full bg-muted/30">
                          <Calendar className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No database records for this product yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs text-center">
                          The Vercel Cron collects data nightly at 00:00 UTC (5:30 AM IST). Click "Check Live Sales" to save a snapshot now.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-3 sm:p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Source: <span className="font-mono text-foreground">envato_sales_snapshots</span> & <span className="font-mono text-foreground">product_activity_records</span> in Supabase
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDailyLogsData(null); openDailyLogs() }}
                        className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCw className="h-3 w-3" />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDailyLogsModal(false)}
                        className="text-xs"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Error / no data */}
            {!dailyLogsLoading && !dailyLogsData && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <p className="text-sm text-muted-foreground">Could not load data. Please try again.</p>
                <Button variant="outline" size="sm" onClick={openDailyLogs} className="text-xs">
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
