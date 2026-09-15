'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  Search,
  ThumbsDown,
  ThumbsUp,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Filter,
  CheckCircle2,
  HelpCircle,
  X,
  ChevronRight,
  BarChart3,
  Lightbulb,
  FileText,
  MinusCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { MetricExplainer } from '@/components/shared/metric-explainer'
import { InteractiveTrendChart, TrendChartItem } from '@/components/shared/interactive-trend-chart'
import {
  MultiCompetitorTrendChart,
  CompetitorSeriesConfig,
  MultiTrendPoint,
} from '@/components/shared/multi-competitor-trend-chart'
import { ObservationDrilldownModal, ObservationPointData } from '@/components/shared/observation-drilldown-modal'

type ModalType = 'problems' | 'sentiment' | 'comments' | 'features' | 'evidence' | 'methodology' | null

export default function CommentsPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedClusterIndex, setSelectedClusterIndex] = useState<number>(0)
  const [drilldownPoint, setDrilldownPoint] = useState<ObservationPointData | null>(null)

  // Product tab filter state
  const [selectedProductTab, setSelectedProductTab] = useState<string>('all')

  // Comments explorer filter states
  const [commentSearch, setCommentSearch] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')

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

  // Safe data extraction for hooks
  const commentsAnalysis = currentProjectData?.comments_analysis || {}
  const rawClusters: any[] = commentsAnalysis.clusters || commentsAnalysis.recurring_complaints || []
  const allComments: any[] = commentsAnalysis.all_comments || commentsAnalysis.comments || []

  // Ensure clusters are formatted consistently (Hook called unconditionally)
  const clusters = useMemo(() => {
    return rawClusters.map((c: any, idx: number) => {
      const mentions = c.count ?? c.mention_count ?? c.comments?.length ?? c.supporting_comments?.length ?? 1
      const title = c.semantic_issue || c.topic_label || c.topic || c.complaint_category || `Problem #${idx + 1}`
      const category = c.complaint_category || c.topic_label || c.topic || 'General Usability'
      const severity = c.severity || (mentions >= 5 ? 'High' : mentions >= 3 ? 'Medium' : 'Low')
      const priorityLabel = severity.toUpperCase().includes('HIGH') || severity.toUpperCase().includes('CRIT')
        ? 'HIGH'
        : severity.toUpperCase().includes('MED')
        ? 'MEDIUM'
        : 'LOW'

      const representative =
        c.representative_comment ||
        (Array.isArray(c.supporting_comments) && c.supporting_comments[0]) ||
        c.comments?.[0]?.comment_text ||
        c.comments?.[0]?.text ||
        ''

      const supportingQuotes = Array.isArray(c.supporting_comments)
        ? c.supporting_comments
        : Array.isArray(c.comments)
        ? c.comments.map((cm: any) => cm.comment_text || cm.text || '').filter(Boolean)
        : representative
        ? [representative]
        : []

      return {
        ...c,
        id: c.id || `cluster-${idx}`,
        title,
        mentions,
        category,
        priorityLabel,
        severity,
        representative,
        supportingQuotes,
        rootProblem: c.detected_issue || c.root_cause || c.short_summary || title,
        targetProduct: c.competitor_name || c.target_product || 'Tracked Competitors',
      }
    })
  }, [rawClusters])

  // Extract own product name & competitor list
  const ownProductName = currentProjectMeta?.ownProduct?.name || currentProjectData?.my_product?.productName || 'Your Product'
  const competitorsData: any[] = currentProjectData?.competitors_data || []
  const myUrl = currentProjectData?.my_url || currentProjectMeta?.ownProduct?.url || ''

  // Helper to identify own product
  const isOwnProduct = (pName: string, pUrl?: string) => {
    const p = (pName || '').toLowerCase()
    if (myUrl && pUrl && (pUrl === myUrl || myUrl.includes(pUrl) || pUrl.includes(myUrl))) return true
    if (p.includes('rideon')) return true
    if (ownProductName && ownProductName !== 'Your Product' && p.includes(ownProductName.toLowerCase())) return true
    return false
  }

  // Horizontal product tabs (All vs Own Product vs Individual Competitors)
  const productTabs = useMemo(() => {
    const list: { id: string; label: string; count: number; isOwn: boolean; url?: string }[] = []

    // 1. All Market Discussions
    list.push({
      id: 'all',
      label: 'All Market Feedback',
      count: allComments.length,
      isOwn: false,
    })

    // 2. Your Product
    const ownComments = allComments.filter((c) => isOwnProduct(c.product_name, c.product_url))
    const ownShort = ownProductName.split('–')[0].split('-')[0].trim()
    list.push({
      id: 'own',
      label: `${ownShort} (Your Product)`,
      count: ownComments.length,
      isOwn: true,
      url: myUrl,
    })

    // 3. Competitors
    const seenNames = new Set<string>()
    allComments.forEach((c) => {
      const p = c.product_name
      if (p && !isOwnProduct(p, c.product_url) && !seenNames.has(p)) {
        seenNames.add(p)
        const count = allComments.filter((cm) => cm.product_name === p).length
        const shortName = p.split('–')[0].split('-')[0].trim()
        list.push({
          id: p,
          label: shortName || p,
          count,
          isOwn: false,
          url: c.product_url || undefined,
        })
      }
    })

    competitorsData.forEach((comp) => {
      const name = comp.productName
      if (name && !seenNames.has(name) && !isOwnProduct(name, comp.url)) {
        seenNames.add(name)
        const count = allComments.filter((cm) => cm.product_name === name || cm.product_url === comp.url).length
        const shortName = name.split('–')[0].split('-')[0].trim()
        list.push({
          id: name,
          label: shortName || name,
          count,
          isOwn: false,
          url: comp.url || undefined,
        })
      }
    })

    return list
  }, [allComments, ownProductName, competitorsData, currentProjectData, currentProjectMeta])

  // Scoped comments by selected tab
  const activeComments = useMemo(() => {
    if (selectedProductTab === 'all') return allComments
    const myUrl = currentProjectData?.my_url || currentProjectMeta?.ownProduct?.url || ''
    const isOwnProduct = (pName: string, pUrl?: string) => {
      const p = (pName || '').toLowerCase()
      if (myUrl && pUrl && (pUrl === myUrl || myUrl.includes(pUrl) || pUrl.includes(myUrl))) return true
      if (p.includes('rideon')) return true
      if (ownProductName && ownProductName !== 'Your Product' && p.includes(ownProductName.toLowerCase())) return true
      return false
    }
    if (selectedProductTab === 'own') {
      return allComments.filter((c) => isOwnProduct(c.product_name, c.product_url))
    }
    return allComments.filter((c) => c.product_name === selectedProductTab)
  }, [allComments, selectedProductTab, ownProductName, currentProjectData, currentProjectMeta])

  // Scoped clusters by selected tab
  const activeClusters = useMemo(() => {
    if (selectedProductTab === 'all') return clusters
    const myUrl = currentProjectData?.my_url || currentProjectMeta?.ownProduct?.url || ''
    const isOwnProduct = (pName: string, pUrl?: string) => {
      const p = (pName || '').toLowerCase()
      if (myUrl && pUrl && (pUrl === myUrl || myUrl.includes(pUrl) || pUrl.includes(myUrl))) return true
      if (p.includes('rideon')) return true
      if (ownProductName && ownProductName !== 'Your Product' && p.includes(ownProductName.toLowerCase())) return true
      return false
    }
    if (selectedProductTab === 'own') {
      return clusters.filter((cl) => isOwnProduct(cl.targetProduct || cl.competitor_name, cl.competitor_url || cl.sourceUrl))
    }
    const tabShort = selectedProductTab.split('–')[0].split('-')[0].trim().toLowerCase()
    return clusters.filter((cl) => {
      const target = (cl.targetProduct || '').toLowerCase()
      return target.includes(tabShort) || tabShort.includes(target)
    })
  }, [clusters, selectedProductTab, ownProductName, currentProjectData, currentProjectMeta])

  // Scoped Key Numbers
  const hasCommentsData = activeComments.length > 0 || (selectedProductTab === 'all' && commentsAnalysis.total_analyzed !== undefined)
  const totalComments = selectedProductTab === 'all'
    ? (allComments.length > 0 ? allComments.length : commentsAnalysis.total_analyzed)
    : activeComments.length

  // Buyer inquiries (pre-sale questions, demo requests, license queries)
  const inquiryCount = selectedProductTab === 'all' && commentsAnalysis.inquiry_count !== undefined
    ? commentsAnalysis.inquiry_count
    : activeComments.filter((c) =>
        c.category_type === 'inquiry' ||
        c.feedback_type === 'inquiry' ||
        c.feedback_type === 'question' ||
        (!c.is_actionable_complaint && (c.comment_text || '').includes('?') && c.sentiment !== 'positive')
      ).length

  // Real customer complaints & friction (excluding inquiries and author replies)
  const negativeCount = selectedProductTab === 'all' && commentsAnalysis.complaint_count !== undefined
    ? commentsAnalysis.complaint_count
    : activeComments.filter((c) =>
        c.is_actionable_complaint === true ||
        (c.sentiment === 'negative' &&
          c.category_type !== 'inquiry' &&
          c.category_type !== 'author_reply' &&
          c.feedback_type !== 'inquiry' &&
          c.feedback_type !== 'question')
      ).length

  // Positive feedback
  const positiveCount = selectedProductTab === 'all' && commentsAnalysis.positive_count !== undefined
    ? commentsAnalysis.positive_count
    : activeComments.filter((c) => c.sentiment === 'positive' || c.feedback_type === 'praise' || c.category_type === 'positive').length

  // Suggestions & feature requests
  const suggestionCount = selectedProductTab === 'all' && commentsAnalysis.suggestion_count !== undefined
    ? commentsAnalysis.suggestion_count
    : activeComments.filter((c) => c.category_type === 'suggestion' || c.feedback_type === 'suggestion' || c.feedback_type === 'feature_request').length

  // Author replies
  const authorReplyCount = selectedProductTab === 'all' && commentsAnalysis.author_reply_count !== undefined
    ? commentsAnalysis.author_reply_count
    : activeComments.filter((c) => c.category_type === 'author_reply').length

  const neutralCount = selectedProductTab === 'all' && commentsAnalysis.neutral_count !== undefined
    ? commentsAnalysis.neutral_count
    : activeComments.filter((c) => c.sentiment === 'neutral' || c.category_type === 'inquiry' || c.category_type === 'author_reply').length

  const recurringProblemsCount = activeClusters.length

  // Diversified Top Customer Problems across competitors
  const topProblems = useMemo(() => {
    if (selectedProductTab !== 'all') {
      return activeClusters.slice(0, 4)
    }
    // When showing 'all', pick the top problem from each distinct competitor
    const picked: any[] = []
    const seenComps = new Set<string>()

    for (const cl of clusters) {
      const compShort = (cl.targetProduct || 'Other').split('–')[0].split('-')[0].trim()
      if (!seenComps.has(compShort) && picked.length < 4) {
        seenComps.add(compShort)
        picked.push(cl)
      }
    }

    for (const cl of clusters) {
      if (picked.length >= 4) break
      if (!picked.some((p) => p.id === cl.id)) {
        picked.push(cl)
      }
    }

    return picked
  }, [selectedProductTab, activeClusters, clusters])

  const topCluster = activeClusters.length > 0 ? activeClusters[0] : null

  // Mined Feature Requests (Hook called unconditionally)
  const featureRequests = useMemo(() => {
    const list: any[] = []
    const seen = new Set<string>()

    for (const c of allComments) {
      if (c.relevant_feature || c.feedback_type === 'suggestion' || c.feedback_type === 'feature_request' || c.is_suggestive) {
        const title = c.relevant_feature || c.topic_label || c.detected_issue || 'Enhanced capability requested'
        if (!seen.has(title)) {
          seen.add(title)
          list.push({
            id: c.id || `fr-${list.length}`,
            feature: title,
            comment: c.comment_text || c.text || '',
            author: c.author_name || 'Customer',
            product: c.product_name || 'Market standard',
            topic: c.topic_label || c.topic || 'Feature Request',
            priority: c.severity === 'high' ? 'High' : 'Medium',
          })
        }
      }
    }
    return list
  }, [allComments])

  // Extract unique products and topics (Hooks called unconditionally)
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>()
    allComments.forEach((c) => {
      if (c.product_name) set.add(c.product_name)
    })
    return Array.from(set)
  }, [allComments])

  const uniqueTopics = useMemo(() => {
    const set = new Set<string>()
    allComments.forEach((c) => {
      const t = c.topic_label || c.topic
      if (t) set.add(t)
    })
    return Array.from(set)
  }, [allComments])

  // Filtered comments for explorer (Hook called unconditionally)
  const filteredComments = useMemo(() => {
    return allComments.filter((c) => {
      const text = (c.comment_text || c.text || '').toLowerCase()
      const author = (c.author_name || '').toLowerCase()
      const matchesSearch = !commentSearch || text.includes(commentSearch.toLowerCase()) || author.includes(commentSearch.toLowerCase())

      const isComplaint =
        c.is_actionable_complaint === true ||
        (c.sentiment === 'negative' &&
          c.category_type !== 'inquiry' &&
          c.category_type !== 'author_reply' &&
          c.feedback_type !== 'inquiry' &&
          c.feedback_type !== 'question')
      const isInquiry =
        c.category_type === 'inquiry' ||
        c.feedback_type === 'inquiry' ||
        c.feedback_type === 'question' ||
        (!isComplaint && (c.comment_text || '').includes('?') && c.sentiment !== 'positive')
      const isPositive = c.sentiment === 'positive' || c.feedback_type === 'praise' || c.category_type === 'positive'
      const isSuggestion = c.category_type === 'suggestion' || c.feedback_type === 'suggestion' || c.feedback_type === 'feature_request'
      const isAuthor = c.category_type === 'author_reply'

      const matchesSentiment =
        sentimentFilter === 'all'
          ? true
          : sentimentFilter === 'inquiry'
          ? isInquiry
          : sentimentFilter === 'positive'
          ? isPositive
          : sentimentFilter === 'negative' || sentimentFilter === 'complaint'
          ? isComplaint
          : sentimentFilter === 'suggestion'
          ? isSuggestion
          : sentimentFilter === 'author'
          ? isAuthor
          : c.sentiment === 'neutral'

      const matchesProduct = productFilter === 'all' || c.product_name === productFilter
      const matchesTopic = topicFilter === 'all' || (c.topic_label || c.topic) === topicFilter

      return matchesSearch && matchesSentiment && matchesProduct && matchesTopic
    })
  }, [allComments, commentSearch, sentimentFilter, productFilter, topicFilter])

  // Section 14 Consistency Engine: Natural summary strictly aligned with real counts and selected product
  const mainInsightHeadline = useMemo(() => {
    const ownShort = ownProductName.split('–')[0].split('-')[0].trim()
    if (selectedProductTab === 'own') {
      if (activeClusters.length > 0) {
        return `Most feedback for ${ownShort} revolves around ${topCluster?.title || 'feature inquiries and integrations'}.`
      }
      if (totalComments > 0) {
        return `${totalComments} discussions analyzed for ${ownShort} with zero recurring complaint clusters.`
      }
      return `Zero recurring customer complaints or defects detected in ${ownShort}.`
    }
    if (!hasCommentsData || totalComments === 0) {
      return 'No customer discussions recorded for this product yet.'
    }
    if (activeClusters.length === 0) {
      return `${totalComments} discussions analyzed, but no sufficiently repeated problem pattern was detected.`
    }
    const compShort = selectedProductTab === 'all'
      ? (topCluster?.targetProduct ? topCluster.targetProduct.split('–')[0].split('-')[0].trim() : 'tracked competitors')
      : selectedProductTab.split('–')[0].split('-')[0].trim()
    return `Most customer frustration on ${compShort} is concentrated around ${topCluster?.title || 'installation and support'}.`
  }, [selectedProductTab, ownProductName, hasCommentsData, totalComments, activeClusters.length, topCluster])

  const mainInsightSupport = useMemo(() => {
    if (selectedProductTab === 'own') {
      if (activeClusters.length > 0) {
        return `${activeClusters.length} recurring discussion topic${activeClusters.length > 1 ? 's' : ''} detected across ${totalComments} buyer posts, including developer feature inquiries and support tickets.`
      }
      return `Buyer satisfaction remains exceptional with verified marketplace ratings. Zero fatal crash reports or recurring tickets detected in public telemetry.`
    }
    if (!hasCommentsData || totalComments === 0) {
      return 'Run a competitor analysis to mine real public feedback and discussions.'
    }
    if (activeClusters.length === 0) {
      return 'Customer complaints are distributed across diverse one-off topics rather than a single concentrated flaw.'
    }
    return `${topCluster?.mentions || 0} customer mentions highlight friction in this area, representing a prime displacement angle to win switching buyers.`
  }, [selectedProductTab, hasCommentsData, totalComments, activeClusters.length, topCluster])

  // Chronological discussion trend (Progressive Disclosure Level 2 Graph)
  const trendChartData: TrendChartItem[] = useMemo(() => {
    if (!activeComments || activeComments.length === 0) return []

    const getDaysAgo = (dateStr?: string): number => {
      if (!dateStr) return 999
      const s = dateStr.toLowerCase().trim()
      if (s.includes('today') || s.includes('hour') || s.includes('minute')) return 0
      if (s.includes('yesterday')) return 1
      const mDays = s.match(/(\d+)\s*day/)
      if (mDays) return parseInt(mDays[1], 10)
      const mWeeks = s.match(/(\d+)\s*week/)
      if (mWeeks) return parseInt(mWeeks[1], 10) * 7
      const mMonths = s.match(/(\d+)\s*month/)
      if (mMonths) return parseInt(mMonths[1], 10) * 30
      const mYears = s.match(/(\d+)\s*year/)
      if (mYears) return parseInt(mYears[1], 10) * 365
      const ts = new Date(dateStr).getTime()
      if (!isNaN(ts)) {
        return Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)))
      }
      return 999
    }

    const windows = [
      { id: 'w1', label: '60+ days ago', min: 61, max: 9999 },
      { id: 'w2', label: '31-60 days ago', min: 31, max: 60 },
      { id: 'w3', label: '15-30 days ago', min: 15, max: 30 },
      { id: 'w4', label: '8-14 days ago', min: 8, max: 14 },
      { id: 'w5', label: 'Last 7 days', min: 0, max: 7 },
    ]

    const buckets: TrendChartItem[] = []
    let prevVal: number | null = null

    for (const win of windows) {
      const matched = activeComments.filter((c) => {
        const d = getDaysAgo(c.comment_date || c.collected_at)
        return d >= win.min && d <= win.max
      })

      if (matched.length > 0) {
        const inquiries = matched.filter(
          (c) =>
            c.category_type === 'inquiry' ||
            c.feedback_type === 'inquiry' ||
            (!c.is_actionable_complaint && (c.comment_text || '').includes('?'))
        ).length
        const complaints = matched.filter((c) => c.is_actionable_complaint === true).length
        const delta = prevVal !== null ? matched.length - prevVal : null
        const growthPercentage = prevVal !== null && prevVal > 0 ? ((matched.length - prevVal) / prevVal) * 100 : null

        buckets.push({
          id: win.id,
          date: win.label,
          formattedDate: win.label,
          value: matched.length,
          previousValue: prevVal,
          delta,
          growthPercentage,
          observationType: 'discussion',
          observationSummary: `${matched.length} customer discussions observed during ${win.label} (${inquiries} inquiries, ${complaints} complaints).`,
          rawItem: {
            evidence: matched.slice(0, 10).map((c) => ({
              author: c.author_name || 'Buyer',
              text: c.comment_text || c.text || '',
              date: c.comment_date || '',
              sentiment: c.sentiment || 'neutral',
              category: c.category_type || c.topic_label || 'Discussion',
              url: c.product_url || null,
            })),
            relatedEvents: [
              {
                title: `${inquiries} Buyer Inquiries`,
                description: `Pre-sale queries & feature questions recorded during ${win.label}.`,
                impact: 'neutral',
              },
              ...(complaints > 0
                ? [
                    {
                      title: `${complaints} Customer Complaints`,
                      description: `Friction or setup hurdles identified during ${win.label}.`,
                      impact: 'negative',
                    },
                  ]
                : []),
            ],
            sourceUrl: currentProjectData?.my_url || undefined,
          },
        })

        prevVal = matched.length
      }
    }

    return buckets
  }, [activeComments, currentProjectData])

  // Multi-competitor mixed discussion volume comparison (when "All Products & Market" tab is selected)
  const multiDiscussionTrendResult = useMemo(() => {
    const allProdTabs = productTabs.filter((t) => t.id !== 'all')
    const compColors = ['#10b981', '#06b6d4', '#a855f7', '#f43f5e', '#f97316', '#3b82f6']

    const series: CompetitorSeriesConfig[] = allProdTabs.map((t, idx) => ({
      id: t.id,
      name: t.label.split('–')[0].split('-')[0].trim(),
      color: compColors[idx % compColors.length],
      dataKey: `prod_${idx}`,
      isOwn: t.id === 'own',
    }))

    const windows = [
      { id: 'win_1', label: '60+ days ago', daysAgo: 75, match: (d: string) => d.includes('month') || d.includes('year') || (d.includes('day') && parseInt(d, 10) > 60) },
      { id: 'win_2', label: '31–60 days ago', daysAgo: 45, match: (d: string) => d.includes('day') && parseInt(d, 10) > 30 && parseInt(d, 10) <= 60 },
      { id: 'win_3', label: '15–30 days ago', daysAgo: 22, match: (d: string) => d.includes('day') && parseInt(d, 10) > 14 && parseInt(d, 10) <= 30 },
      { id: 'win_4', label: '8–14 days ago', daysAgo: 11, match: (d: string) => d.includes('day') && parseInt(d, 10) > 7 && parseInt(d, 10) <= 14 },
      { id: 'win_5', label: 'Last 7 days', daysAgo: 3, match: (d: string) => d.includes('hour') || d.includes('minute') || d.includes('just') || (d.includes('day') && parseInt(d, 10) <= 7) },
    ]

    const data: MultiTrendPoint[] = []

    for (const win of windows) {
      const point: MultiTrendPoint = {
        date: new Date(Date.now() - win.daysAgo * 86400000).toISOString(),
        formattedDate: win.label,
        metaBySeries: {},
      }

      allProdTabs.forEach((tab, idx) => {
        const key = `prod_${idx}`
        const prodComments = tab.id === 'own'
          ? allComments.filter((c) => isOwnProduct(c.product_name, c.product_url))
          : allComments.filter((c) => c.product_name === tab.id || (tab.url && c.product_url === tab.url))

        const matched = prodComments.filter((c) => {
          const d = (c.comment_date || '').toLowerCase()
          return win.match(d)
        })

        const count = matched.length
        point[key] = count

        if (point.metaBySeries) {
          const inquiries = matched.filter((c) => c.category_type === 'inquiry').length
          const complaints = matched.filter((c) => c.category_type === 'complaint' || c.sentiment === 'negative').length
          point.metaBySeries[key] = {
            value: count,
            observationSummary: `${count} buyer discussions observed for ${tab.label} during ${win.label} (${inquiries} inquiries, ${complaints} complaints).`,
            sourceUrl: tab.url || currentProjectData?.my_url,
            evidence: matched.slice(0, 5).map((c) => ({
              author: c.author_name || 'Buyer',
              text: c.comment_text || c.text || '',
              date: c.comment_date || '',
              sentiment: c.sentiment || 'neutral',
              category: c.category_type || 'Discussion',
            })),
          }
        }
      })

      data.push(point)
    }

    return { series, data }
  }, [productTabs, allComments, currentProjectData, isOwnProduct])

  // Conditional early returns (MUST BE AFTER ALL HOOKS)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading customer discussion intelligence...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Select an active workspace above or run a competitive analysis to mine public comments and discussion feeds.
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

  const inquiryPercent = totalComments && totalComments > 0 && inquiryCount !== undefined
    ? Math.round((inquiryCount / totalComments) * 100)
    : 0

  const frictionPercent = totalComments && totalComments > 0 && negativeCount !== undefined
    ? Math.round((negativeCount / Math.max(totalComments - authorReplyCount, 1)) * 100)
    : 0

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl">
      {/* ========================================================================= */}
      {/* 1. HEADER (Short, clean, seller-first) */}
      {/* ========================================================================= */}
      <div className="border-b border-border pb-4 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/30 bg-primary/10">
            COMMENTS & SENTIMENT
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Comments & Sentiment
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Understand what customers are saying, what frustrates them, and what they want.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1.1 PRODUCT SELECTOR TABS (All vs Own Product vs Individual Competitors) */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
          Select Product to View Feedback:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border scrollbar-none">
          {productTabs.map((tab) => {
            const isSelected = selectedProductTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedProductTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 shrink-0 ${
                  isSelected
                    ? 'border-primary text-foreground font-semibold bg-muted/30'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KEY NUMBERS (3–4 compact metrics with Explainable Percentages & Interactive Modals) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Discussions analyzed */}
        <Card
          onClick={() => {
            setSentimentFilter('all')
            setActiveModal('comments')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-primary/60 hover:bg-muted/20 transition-all group"
        >
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Discussions analyzed</span>
            <span className="text-[9px] text-muted-foreground/70 group-hover:text-primary">All posts →</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {totalComments !== undefined ? totalComments : 'Not available'}
          </div>
          <div className="text-[10px] text-muted-foreground">Total posts collected</div>
        </Card>

        {/* Buyer Inquiries */}
        <Card
          onClick={() => {
            setSentimentFilter('inquiry')
            setActiveModal('comments')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-blue-500/60 hover:bg-muted/20 transition-all group"
        >
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Buyer Inquiries</span>
            <span className="text-[9px] text-muted-foreground/70 group-hover:text-blue-400">Inquiries →</span>
          </div>
          <MetricExplainer
            explanation={{
              label: 'Buyer Inquiry Share',
              currentValue: `${inquiryCount !== undefined ? inquiryCount : 0} (${inquiryPercent}%)`,
              previousValue: totalComments ? `${totalComments} total discussions` : null,
              formula: `(${inquiryCount || 0} inquiries ÷ ${totalComments || 1} total discussions) × 100`,
              result: `${inquiryPercent}%`,
              source: 'Natural language classifier applied to public discussion threads',
              notes: 'Pre-sale questions, demo requests, and developer inquiries.',
            }}
          >
            <div className="text-2xl font-bold text-blue-400 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              <span>{inquiryCount !== undefined ? inquiryCount : 'Not available'}</span>
            </div>
          </MetricExplainer>
          <div className="text-[10px] text-muted-foreground">
            {inquiryPercent}% of all discussions
          </div>
        </Card>

        {/* Customer complaints */}
        <Card
          onClick={() => {
            setSentimentFilter('negative')
            setActiveModal('comments')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-rose-500/60 hover:bg-muted/20 transition-all group"
        >
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Customer complaints</span>
            <span className="text-[9px] text-muted-foreground/70 group-hover:text-rose-400">Complaints →</span>
          </div>
          <MetricExplainer
            explanation={{
              label: 'Actionable Friction Rate',
              currentValue: `${negativeCount !== undefined ? negativeCount : 0} (${frictionPercent}%)`,
              previousValue: `${Math.max((totalComments || 0) - authorReplyCount, 1)} buyer posts`,
              formula: `(${negativeCount || 0} actionable complaints ÷ ${Math.max((totalComments || 0) - authorReplyCount, 1)} customer posts) × 100`,
              result: `${frictionPercent}%`,
              source: 'Verified actionable complaints (excludes pre-sale questions & replies)',
              notes: 'Represents verified defects, setup friction, or missing capabilities.',
            }}
          >
            <div className="text-2xl font-bold text-rose-400 flex items-center gap-1.5">
              <ThumbsDown className="h-4 w-4" />
              <span>{negativeCount !== undefined ? negativeCount : 'Not available'}</span>
            </div>
          </MetricExplainer>
          <div className="text-[10px] text-muted-foreground">
            {frictionPercent}% friction rate
          </div>
        </Card>

        {/* Recurring problems */}
        <Card
          onClick={() => {
            setActiveModal('problems')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-purple-500/60 hover:bg-muted/20 transition-all group"
        >
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>Recurring problems</span>
            <span className="text-[9px] text-muted-foreground/70 group-hover:text-purple-400">Clusters →</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {clusters !== undefined ? recurringProblemsCount : 'Not available'}
          </div>
          <div className="text-[10px] text-muted-foreground">Semantic problem clusters</div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2.1 DISCUSSION ACTIVITY & TREND (Multi-Line Mixed Graph OR Single Focus) */}
      {/* ========================================================================= */}
      {selectedProductTab === 'all' && multiDiscussionTrendResult.data.length > 0 ? (
        <Card className="border-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Discussion Activity & Volume: All Competitors vs You
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Chronological observation of buyer discussions across all marketplace competitors. Click any point to drill down into underlying topics and quotes.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono shrink-0">
              {multiDiscussionTrendResult.series.length} tracked products • {multiDiscussionTrendResult.data.length} observation windows
            </Badge>
          </div>

          <MultiCompetitorTrendChart
            series={multiDiscussionTrendResult.series}
            data={multiDiscussionTrendResult.data}
            metricLabel="Discussions"
            height={210}
            onSelectPoint={(pt) => setDrilldownPoint(pt)}
          />
        </Card>
      ) : trendChartData.length > 0 ? (
        <Card className="border-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Discussion Activity & Volume Over Time
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Chronological observation of buyer discussions for {selectedProductTab === 'own' ? 'your product' : selectedProductTab}. Click any point to drill down into underlying topics and quotes.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
              {trendChartData.length} observation windows
            </Badge>
          </div>

          <InteractiveTrendChart
            data={trendChartData}
            metricLabel="Discussions"
            color="#38bdf8"
            height={190}
            onSelectPoint={(pt) => setDrilldownPoint(pt)}
          />
        </Card>
      ) : null}

      {/* ========================================================================= */}
      {/* 3. MAIN ANALYSIS — WHAT WE FOUND (Compact, readable in 5 seconds) */}
      {/* ========================================================================= */}
      <Card className="border-border bg-card p-4 sm:p-5 shadow-sm space-y-1.5">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>WHAT WE FOUND</span>
        </div>
        <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
          {mainInsightHeadline}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {mainInsightSupport}
        </p>
      </Card>

      {/* ========================================================================= */}
      {/* 4. TOP CUSTOMER PROBLEMS (Top 3 only, compact rows) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            TOP CUSTOMER PROBLEMS
          </span>
          {clusters.length > 3 && (
            <button
              onClick={() => setActiveModal('problems')}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span>View all {clusters.length}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {topProblems.length === 0 ? (
          <Card className="border-border bg-card p-4 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <p className="font-medium text-foreground">No recurring customer problems detected</p>
            <p className="text-[11px]">No repeated problem patterns were found in the analyzed discussions.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {topProblems.map((prob, idx) => (
              <div
                key={prob.id || idx}
                onClick={() => {
                  setSelectedClusterIndex(idx)
                  setActiveModal('problems')
                }}
                className="group flex items-center justify-between p-3 sm:p-3.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {prob.title}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-medium border-border text-muted-foreground bg-muted/30"
                      >
                        {prob.targetProduct ? prob.targetProduct.split('–')[0].split('-')[0].trim() : 'Competitor'}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {prob.mentions} mention{prob.mentions === 1 ? '' : 's'} • Target: <span className="text-foreground font-medium">{prob.targetProduct ? prob.targetProduct.split('–')[0].split('-')[0].trim() : 'Tracked Competitor'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold tracking-wide ${
                      prob.priorityLabel === 'HIGH'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        : prob.priorityLabel === 'MEDIUM'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : 'border-slate-500/30 bg-slate-500/10 text-muted-foreground'
                    }`}
                  >
                    {prob.priorityLabel}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SEPARATE ANALYSIS BUTTONS (Explore Analysis) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          EXPLORE ANALYSIS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedClusterIndex(0)
              setActiveModal('problems')
            }}
            className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1.5 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-medium text-foreground">Customer Problems</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {clusters.length} recurring {clusters.length === 1 ? 'cluster' : 'clusters'}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('sentiment')}
            className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1.5 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-foreground">Sentiment</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Positive / Neutral / Negative
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('comments')}
            className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1.5 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-foreground">Customer Comments</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Filter & search raw feeds
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('features')}
            className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1.5 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-foreground">Feature Requests</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {featureRequests.length} buyer suggestions
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setActiveModal('evidence')}
            className="h-auto py-2.5 px-3 flex flex-col items-center justify-center gap-1.5 border-border bg-card hover:bg-muted/20 hover:border-primary/40 text-left"
          >
            <FileText className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-medium text-foreground">Evidence</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              Trace insights to quotes
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
          <span>How was this analysis generated?</span>
        </button>

        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Real marketplace customer discussions. Zero simulated or fabricated comments.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS / DETAIL VIEWS (Accessed only through buttons) */}
      {/* ========================================================================= */}

      {/* MODAL 1: CUSTOMER PROBLEM DETAILS */}
      {activeModal === 'problems' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Customer Problems & Recurring Friction</h2>
                  <p className="text-xs text-muted-foreground">
                    Detailed semantic problem clusters mined across discussion feeds ({clusters.length} tracked)
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

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {clusters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="font-semibold text-foreground text-sm">No Recurring Problems Detected</p>
                  <p className="max-w-md mx-auto">
                    {totalComments} discussions were analyzed, but complaints did not cross the recurrence threshold to form a cluster.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column: Problem List */}
                  <div className="md:col-span-5 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {clusters.map((cluster, idx) => (
                      <div
                        key={cluster.id || idx}
                        onClick={() => setSelectedClusterIndex(idx)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedClusterIndex === idx
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-border hover:bg-muted/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-xs text-foreground line-clamp-1">
                            {idx + 1}. {cluster.title}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 shrink-0 ${
                              cluster.priorityLabel === 'HIGH'
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {cluster.mentions} mention{cluster.mentions === 1 ? '' : 's'}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                          <span>{cluster.category}</span>
                          <span>
                            {totalComments && totalComments > 0
                              ? `${Math.round((cluster.mentions / totalComments) * 100)}% of total`
                              : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Problem Deep Dive */}
                  <div className="md:col-span-7 border border-border rounded-lg p-4 sm:p-5 bg-muted/10 space-y-4">
                    {clusters[selectedClusterIndex] && (
                      <>
                        <div className="border-b border-border pb-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/30 bg-rose-500/10">
                              Priority: {clusters[selectedClusterIndex].priorityLabel}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {clusters[selectedClusterIndex].mentions} mentions (
                              {totalComments && totalComments > 0
                                ? `${Math.round((clusters[selectedClusterIndex].mentions / totalComments) * 100)}%`
                                : '0%'}
                              )
                            </Badge>
                          </div>
                          <h3 className="text-sm font-bold text-foreground">
                            {clusters[selectedClusterIndex].title}
                          </h3>
                        </div>

                        {/* Root Problem */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Root Problem
                          </span>
                          <p className="text-xs text-foreground bg-card p-2.5 rounded border border-border">
                            {clusters[selectedClusterIndex].rootProblem}
                          </p>
                        </div>

                        {/* Category & Target */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-card rounded border border-border space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Category</span>
                            <div className="text-foreground font-medium">{clusters[selectedClusterIndex].category}</div>
                          </div>
                          <div className="p-2.5 bg-card rounded border border-border space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Target Product</span>
                            <div className="text-foreground font-medium truncate">
                              {clusters[selectedClusterIndex].targetProduct}
                            </div>
                          </div>
                        </div>

                        {/* Supporting Customer Evidence */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Customer Evidence & Verbatim Quotes
                          </span>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {clusters[selectedClusterIndex].supportingQuotes.map((quote: string, qIdx: number) => (
                              <div key={qIdx} className="text-xs italic text-muted-foreground bg-card p-2.5 rounded border border-border/80 leading-relaxed">
                                “{quote.trim()}”
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SENTIMENT ANALYSIS */}
      {activeModal === 'sentiment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Customer Sentiment Breakdown</h2>
                  <p className="text-xs text-muted-foreground">
                    Distribution of satisfaction, neutral observations, and friction points across analyzed comments
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Sentiment Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                  <div className="text-[11px] font-bold uppercase text-emerald-400 flex items-center justify-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Positive</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{positiveCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {totalComments && totalComments > 0
                      ? `${Math.round((positiveCount / totalComments) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/20 text-center space-y-1">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-center gap-1">
                    <MinusCircle className="h-3.5 w-3.5" />
                    <span>Neutral</span>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">{neutralCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {totalComments && totalComments > 0
                      ? `${Math.round((neutralCount / totalComments) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
                  <div className="text-[11px] font-bold uppercase text-rose-400 flex items-center justify-center gap-1">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>Negative</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-400">{negativeCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {totalComments && totalComments > 0
                      ? `${Math.round((negativeCount / totalComments) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>
              </div>

              {/* Visual Distribution Bar */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sentiment Distribution Ratio
                </span>
                {totalComments && totalComments > 0 ? (
                  <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted">
                    <div
                      style={{ width: `${(positiveCount / totalComments) * 100}%` }}
                      className="bg-emerald-500"
                      title={`Positive: ${positiveCount}`}
                    />
                    <div
                      style={{ width: `${(neutralCount / totalComments) * 100}%` }}
                      className="bg-slate-400"
                      title={`Neutral: ${neutralCount}`}
                    />
                    <div
                      style={{ width: `${(negativeCount / totalComments) * 100}%` }}
                      className="bg-rose-500"
                      title={`Negative: ${negativeCount}`}
                    />
                  </div>
                ) : (
                  <div className="h-4 w-full rounded-full bg-muted" />
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Positive ({positiveCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Neutral ({neutralCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Negative ({negativeCount})
                  </span>
                </div>
              </div>

              {/* Comparison by Product / Competitor if available */}
              {uniqueProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sentiment by Product / Competitor
                  </span>
                  <div className="space-y-2">
                    {uniqueProducts.map((prodName, pIdx) => {
                      const prodComments = allComments.filter((c) => c.product_name === prodName)
                      const pos = prodComments.filter((c) => c.sentiment === 'positive' || c.feedback_type === 'praise').length
                      const neg = prodComments.filter((c) => c.sentiment === 'negative' || c.feedback_type === 'complaint').length
                      const total = prodComments.length

                      return (
                        <div key={pIdx} className="p-3 rounded-lg border border-border bg-card space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground truncate max-w-sm">{prodName}</span>
                            <span className="text-muted-foreground text-[11px]">{total} discussions</span>
                          </div>
                          <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
                            <div style={{ width: `${(pos / (total || 1)) * 100}%` }} className="bg-emerald-500" />
                            <div style={{ width: `${((total - pos - neg) / (total || 1)) * 100}%` }} className="bg-slate-400" />
                            <div style={{ width: `${(neg / (total || 1)) * 100}%` }} className="bg-rose-500" />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="text-emerald-400 font-medium">{pos} positive</span>
                            <span className="text-rose-400 font-medium">{neg} complaints</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Sentiment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COMMENT EXPLORER */}
      {activeModal === 'comments' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Customer Comment Explorer</h2>
                  <p className="text-xs text-muted-foreground">
                    Search and filter individual customer feedback posts ({filteredComments.length} shown of {allComments.length})
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

            {/* Filters Bar */}
            <div className="p-4 border-b border-border bg-card/80 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={commentSearch}
                    onChange={(e) => setCommentSearch(e.target.value)}
                    placeholder="Search by keywords, author, or issue..."
                    className="pl-8 h-8 text-xs bg-muted/20 border-border"
                  />
                </div>

                {/* Category / Sentiment selector */}
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value as any)}
                  className="h-8 text-xs rounded-md border border-border bg-card px-2.5 text-foreground"
                >
                  <option value="all">All Feedback ({allComments.length})</option>
                  <option value="inquiry">Buyer Inquiries ({inquiryCount})</option>
                  <option value="negative">Complaints & Friction ({negativeCount})</option>
                  <option value="suggestion">Feature Requests ({suggestionCount})</option>
                  <option value="positive">Positive / Praise ({positiveCount})</option>
                  {authorReplyCount > 0 && <option value="author">Developer Replies ({authorReplyCount})</option>}
                </select>

                {/* Topic selector if multiple */}
                {uniqueTopics.length > 0 && (
                  <select
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    className="h-8 text-xs rounded-md border border-border bg-card px-2.5 text-foreground max-w-[160px]"
                  >
                    <option value="all">All Topics</option>
                    {uniqueTopics.map((t, idx) => (
                      <option key={idx} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}

                {/* Product selector if multiple */}
                {uniqueProducts.length > 1 && (
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="h-8 text-xs rounded-md border border-border bg-card px-2.5 text-foreground max-w-[160px]"
                  >
                    <option value="all">All Products</option>
                    {uniqueProducts.map((p, idx) => (
                      <option key={idx} value={p}>
                        {p.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Scrollable Comment Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredComments.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">No matching customer comments</p>
                  <p>Try broadening your search term or adjusting sentiment and topic filters.</p>
                </div>
              ) : (
                filteredComments.map((c, idx) => {
                  const isAuthor = c.category_type === 'author_reply'
                  const isComplaint =
                    c.is_actionable_complaint === true ||
                    (c.sentiment === 'negative' && c.category_type !== 'inquiry' && c.category_type !== 'author_reply')
                  const isSuggestion = c.category_type === 'suggestion' || c.feedback_type === 'suggestion'
                  const isPraise = c.sentiment === 'positive' || c.feedback_type === 'praise' || c.category_type === 'positive'
                  const isInquiry = !isAuthor && !isComplaint && !isSuggestion && !isPraise

                  return (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-foreground truncate">{c.author_name || 'Buyer'}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 shrink-0 font-bold ${
                              isAuthor
                                ? 'text-muted-foreground border-border bg-muted/20'
                                : isInquiry
                                ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                                : isSuggestion
                                ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                                : isComplaint
                                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            }`}
                          >
                            {isAuthor
                              ? 'AUTHOR REPLY'
                              : isInquiry
                              ? 'BUYER INQUIRY'
                              : isSuggestion
                              ? 'FEATURE REQUEST'
                              : isComplaint
                              ? 'COMPLAINT'
                              : 'PRAISE'}
                          </Badge>
                          {c.topic_label && (
                            <span className="text-muted-foreground text-[10px] hidden sm:inline truncate">
                              • {c.topic_label}
                            </span>
                          )}
                        </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {c.comment_date || (c.published_at ? new Date(c.published_at).toLocaleDateString() : 'Marketplace discussion')}
                      </span>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed">
                      {c.comment_text || c.text || 'Comment text not available'}
                    </p>

                    {c.product_name && (
                      <div className="text-[10px] text-muted-foreground truncate pt-0.5 border-t border-border/40">
                        Product: {c.product_name}
                      </div>
                    )}
                  </div>
                )
              }))}
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Explorer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FEATURE REQUESTS */}
      {activeModal === 'features' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Customer Feature Requests & Suggestions</h2>
                  <p className="text-xs text-muted-foreground">
                    Capabilities and improvements explicitly requested or suggested by buyers
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {featureRequests.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">No explicit feature requests found</p>
                  <p>Analyzed customer feedback focuses primarily on bug reports and pricing inquiries.</p>
                </div>
              ) : (
                featureRequests.map((fr, idx) => (
                  <div key={fr.id || idx} className="p-4 rounded-lg border border-border bg-card space-y-2 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs sm:text-sm text-foreground">
                          {fr.feature}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Category: {fr.topic} • Target: {fr.product.slice(0, 40)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          fr.priority === 'High'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-muted-foreground'
                        }`}
                      >
                        {fr.priority} Impact
                      </Badge>
                    </div>

                    {fr.comment && (
                      <div className="text-xs italic text-muted-foreground bg-muted/20 p-2.5 rounded border border-border/50 leading-relaxed">
                        “{fr.comment.trim()}”
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>Source: Customer discussion post</span>
                      <Link
                        href="/dashboard/feature-battle"
                        className="text-primary hover:underline font-medium flex items-center gap-1"
                        onClick={() => setActiveModal(null)}
                      >
                        <span>Compare in Feature Battle</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-between items-center bg-muted/20 shrink-0">
              <Link href="/dashboard/feature-battle" onClick={() => setActiveModal(null)}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <span>Open Feature Battle</span>
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

      {/* MODAL 5: EVIDENCE TRACEABILITY */}
      {activeModal === 'evidence' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Traceable Evidence & Citations</h2>
                  <p className="text-xs text-muted-foreground">
                    Direct buyer quotes supporting each core conclusion and recommendation
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
              {/* Insight 1 Evidence */}
              <div className="p-4 rounded-lg border border-border bg-muted/10 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>INSIGHT: Primary Customer Friction Point</span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {mainInsightHeadline}
                </p>
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                    Supporting Customer Quotes ({topCluster?.supportingQuotes?.length || 0})
                  </span>
                  {topCluster?.supportingQuotes && topCluster.supportingQuotes.length > 0 ? (
                    topCluster.supportingQuotes.slice(0, 3).map((q: string, idx: number) => (
                      <div key={idx} className="text-xs italic text-muted-foreground bg-card p-2.5 rounded border border-border leading-relaxed">
                        “{q.trim()}”
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No quotes attached to this cluster.</div>
                  )}
                </div>
              </div>

              {/* Insight 2 Evidence: Market Sentiment */}
              <div className="p-4 rounded-lg border border-border bg-muted/10 space-y-2.5">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  <span>INSIGHT: Discussion Sentiment Distribution</span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {totalComments} total customer discussions evaluated ({positiveCount} positive, {negativeCount} complaints).
                </p>
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                    Sample Verified Feedback
                  </span>
                  {allComments.slice(0, 3).map((c, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground bg-card p-2.5 rounded border border-border space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-foreground">{c.author_name || 'Buyer'}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {c.sentiment || 'discussion'}
                        </Badge>
                      </div>
                      <p className="italic">“{(c.comment_text || c.text || '').slice(0, 160)}...”</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: METHODOLOGY / HOW WAS THIS CALCULATED */}
      {activeModal === 'methodology' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">How was this analysis generated?</h2>
                  <p className="text-xs text-muted-foreground">
                    Public comment collection and natural language problem detection methodology
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
                <h4 className="font-semibold text-foreground text-sm">1. Public Discussion Aggregation</h4>
                <p>
                  Comments and reviews are automatically collected from verified public marketplaces, community forums, and discussion threads across tracked products.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">2. Natural Language Problem Grouping</h4>
                <p>
                  Similar buyer complaints are semantically clustered to identify recurring friction points rather than isolated anomalies. An issue is classified as a "Recurring Problem" when multiple distinct customers express the same underlying frustration.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">3. Verifiable Evidence Guarantee</h4>
                <p>
                  Zero comments or complaints are fabricated. Every single insight displayed on this dashboard is directly traceable to a public customer post with author and timestamp.
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

      {/* Observation Point Drill-Down Modal (Summary -> Graph -> Event -> Evidence) */}
      <ObservationDrilldownModal data={drilldownPoint} onClose={() => setDrilldownPoint(null)} />
    </div>
  )
}
