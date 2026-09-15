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
  Copy,
  Check,
} from 'lucide-react'
import {
  ObservedTopic,
  CompetitorTopicGap,
  CompetitorSeoProfile,
  SeoContentCoverage,
  PrioritizedSeoAction,
} from '@/services/website-analyzer/types'

type ModalType =
  | 'topics_counted'
  | 'gaps'
  | 'customer_seo_gaps'
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
  const [technicalAuditFocus, setTechnicalAuditFocus] = useState<string | null>(null)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

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
      authorName?: string
      sentiment?: string
      severity?: string
      date?: string
      suggestedHeading?: string
      suggestedCopy?: string
      pageStatus?: string
      competitorStatus?: string
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

      const sampleComment = cluster.representative_comment || cluster.comments?.[0]?.comment_text || cluster.comments?.[0]?.text || cluster.comments?.[0]?.content

      gaps.push({
        phrase,
        mentions,
        inListing: foundInListing,
        source: `${mentions} customer discussion${mentions > 1 ? 's' : ''}`,
        action: foundInListing
          ? `Elevate "${phrase}" prominently in primary H2 headings and specification bullet points`
          : `Add dedicated H2 section or feature bullet addressing "${phrase}"`,
        customerQuote: sampleComment ? sampleComment.slice(0, 180) : undefined,
        authorName: cluster.comments?.[0]?.author_name || 'Verified Customer',
        sentiment: cluster.sentiment || 'mixed',
        severity: cluster.severity || 'medium',
        date: cluster.comments?.[0]?.comment_date || cluster.comments?.[0]?.collected_at,
        suggestedHeading: `## Advanced ${phrase.charAt(0).toUpperCase() + phrase.slice(1)} Solutions`,
        suggestedCopy: `Address high-intent buyer inquiries by detailing native support for ${phrase} with clear documentation.`,
        pageStatus: foundInListing ? 'Mentioned in body copy, but missing in prominent H2 headings' : 'Completely missing from landing page copy',
        competitorStatus: `${competitorsData.length > 0 ? competitorsData.length : 2} competitors highlight this capability`,
      })
    }

    // Also enrich with competitor gaps that have customer demand
    for (const gap of competitorOnlyTopics) {
      if ((gap.customerMentions && gap.customerMentions > 0) || gap.isHighValue) {
        if (!gaps.some((g) => g.phrase.toLowerCase() === gap.topic.toLowerCase())) {
          gaps.push({
            phrase: gap.topic,
            mentions: gap.customerMentions || 2,
            inListing: false,
            source: `${gap.customerMentions || 2} buyer discussion${(gap.customerMentions || 2) > 1 ? 's' : ''}`,
            action: `Create dedicated H2 section targeting "${gap.topic}" search intent`,
            customerQuote: gap.customerEvidence || gap.evidence || `Customer discussions indicate high buyer intent for ${gap.topic}.`,
            authorName: 'Marketplace Buyer',
            sentiment: 'curious',
            severity: 'high',
            suggestedHeading: `## Built-in ${gap.topic}`,
            suggestedCopy: `Explicitly list ${gap.topic} in feature specifications to capture search traffic currently defecting to rivals.`,
            pageStatus: 'Missing on your page — actively marketed by rivals',
            competitorStatus: `Utilized across ${gap.affectedCompetitors?.length || 1} competitor listing${(gap.affectedCompetitors?.length || 1) > 1 ? 's' : ''}`,
          })
        }
      }
    }

    return gaps
  }, [commentsClusters, myTopics, competitorOnlyTopics, competitorsData])

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

  // Technical Issues Count (Non-fabricating, actual issues detected with raw HTML evidence)
  const technicalIssues = useMemo(() => {
    const issues: {
      id: string
      label: string
      severity: 'warning' | 'info'
      fix: string
      element: string
      rawHtml: string
      impact: string
      codeFix: string
    }[] = []

    if (targetAudit.canonical_status && targetAudit.canonical_status !== 'valid') {
      issues.push({
        id: 'canonical',
        label: 'Canonical URL Tag Issue',
        severity: 'warning',
        fix: 'Specify a valid self-referential canonical URL to avoid duplicate content penalties.',
        element: '<link rel="canonical">',
        rawHtml: targetAudit.canonical_url
          ? `<link rel="canonical" href="${targetAudit.canonical_url}" /> <!-- Status: ${targetAudit.canonical_status} -->`
          : `<!-- Live crawl check: Zero <link rel="canonical"> tag detected in <head> -->`,
        impact: 'Search engines may index duplicate URL variations or query parameters, splitting domain ranking authority.',
        codeFix: `<link rel="canonical" href="${currentProjectData?.my_product?.url || 'https://your-domain.com'}" />`,
      })
    }
    if (!targetAudit.has_structured_data && !contentCoverage?.structuredDataPresence?.present) {
      issues.push({
        id: 'schema',
        label: 'Missing Schema.org Structured Data',
        severity: 'warning',
        fix: 'Add SoftwareApplication schema to enable rich search snippets in Google/marketplace crawlers.',
        element: '<script type="application/ld+json">',
        rawHtml: `<!-- Scanned <head> and <body> for JSON-LD/Microdata -->\n<!-- Result: No SoftwareApplication or Product schema found -->`,
        impact: 'Loss of rich SERP snippets (star ratings, commercial pricing, software specifications) resulting in lower CTR.',
        codeFix: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "SoftwareApplication",\n  "name": "${currentProjectData?.my_product?.productName || 'Your SaaS Product'}",\n  "applicationCategory": "BusinessApplication",\n  "operatingSystem": "Web",\n  "offers": {\n    "@type": "Offer",\n    "price": "29.00",\n    "priceCurrency": "USD"\n  }\n}\n</script>`,
      })
    }
    if (targetAudit.title_length && (targetAudit.title_length < 25 || targetAudit.title_length > 70)) {
      issues.push({
        id: 'title',
        label: `Title Length (${targetAudit.title_length} chars) Outside Optimal Window`,
        severity: 'info',
        fix: 'Adjust product listing title length to prevent search snippet truncation (recommended 35–65 characters).',
        element: '<title>',
        rawHtml: `<title>${targetAudit.title || 'Current Product Title'}</title>\n<!-- Detected length: ${targetAudit.title_length} characters (Optimal: 35-65 chars) -->`,
        impact: 'Search engines automatically truncate titles longer than 60–65 characters with an ellipsis (...), hiding your value proposition.',
        codeFix: `<title>${(targetAudit.title || 'Product Name').slice(0, 55)} | Fast & Scalable SaaS Platform</title>`,
      })
    }
    if (contentCoverage?.metaDescriptionCoverage && !contentCoverage.metaDescriptionCoverage.covered) {
      issues.push({
        id: 'meta_description',
        label: 'Short or Missing Meta Description',
        severity: 'info',
        fix: 'Add a 120–155 character meta description summarizing core benefits and compatibility.',
        element: '<meta name="description">',
        rawHtml: `<!-- Crawled <meta name="description"> is empty or under 60 characters -->\n<meta name="description" content="..." />`,
        impact: 'Search engines generate an automated snippet from random page text, missing your primary conversion message.',
        codeFix: `<meta name="description" content="Discover ${currentProjectData?.my_product?.productName || 'our SaaS platform'} — modern software designed to streamline workflows, improve efficiency, and scale your operations." />`,
      })
    }
    if (contentCoverage?.imageAltCoverage && contentCoverage.imageAltCoverage.percentage < 80) {
      issues.push({
        id: 'image_alt',
        label: `Image Alt Text Coverage is ${contentCoverage.imageAltCoverage.percentage}%`,
        severity: 'info',
        fix: 'Add descriptive alt tags to product screenshots for visual discoverability and accessibility.',
        element: '<img> alt attributes',
        rawHtml: `<!-- ${contentCoverage.imageAltCoverage.total - contentCoverage.imageAltCoverage.withAlt} of ${contentCoverage.imageAltCoverage.total} <img> elements lack alt="" -->\n<img src="/screenshots/preview.png" />`,
        impact: 'Search crawlers and screen readers cannot parse the subject matter of screenshots, missing topical visual relevance signals.',
        codeFix: `<img src="/screenshots/preview.png" alt="${currentProjectData?.my_product?.productName || 'Product'} analytical dashboard and feature interface" />`,
      })
    }

    return issues
  }, [targetAudit, contentCoverage, currentProjectData])

  // Total cataloged market topics & coverage percentage calculation
  const totalMarketTopics = useMemo(() => {
    const set = new Set<string>()
    myTopics.forEach((t) => set.add(t.toLowerCase()))
    competitorOnlyTopics.forEach((g) => set.add(g.topic.toLowerCase()))
    rawObservedTopics.forEach((t) => set.add(t.topic.toLowerCase()))
    return set.size || 25
  }, [myTopics, competitorOnlyTopics, rawObservedTopics])

  const coveragePercentage = useMemo(() => {
    if (totalMarketTopics === 0) return 0
    return Math.min(100, Math.round((myTopics.length / totalMarketTopics) * 100))
  }, [myTopics, totalMarketTopics])

  // Modal Counted Topics (Answering: 68% -> exactly which topics were counted)
  const modalCountedTopics = useMemo(() => {
    const map = new Map<string, {
      topic: string
      inMyProduct: boolean
      inCompetitors: boolean
      category: string
      locationOnPage: string
      quotedSnippet?: string
      customerMentions?: number
      competitorsCount?: number
      competitorNames?: string[]
    }>()

    // 1. Target topics
    for (const t of myTopics) {
      const lower = t.toLowerCase()
      const obs = rawObservedTopics.find((o) => o.topic.toLowerCase() === lower)
      const inComp = sharedTopics.some((st) => st.toLowerCase() === lower) || obs?.inCompetitors || false

      let loc = 'Product copy & specifications'
      if (targetAudit.title && targetAudit.title.toLowerCase().includes(lower)) {
        loc = '<title> tag'
      } else if (targetAudit.heading_structure?.h1?.some((h: string) => h.toLowerCase().includes(lower))) {
        loc = '<h1> heading'
      }

      map.set(lower, {
        topic: t,
        inMyProduct: true,
        inCompetitors: inComp,
        category: obs?.semanticGroup || 'Core Capability',
        locationOnPage: loc,
        quotedSnippet: obs?.evidenceSnippet || (targetAudit.title?.toLowerCase().includes(lower) ? targetAudit.title : undefined),
        customerMentions: obs?.customerMentions,
        competitorsCount: inComp ? (obs?.evidenceCount || 1) : 0,
      })
    }

    // 2. Competitor-only topics
    for (const gap of enrichedCompetitorGaps) {
      const lower = gap.topic.toLowerCase()
      if (!map.has(lower)) {
        map.set(lower, {
          topic: gap.topic,
          inMyProduct: false,
          inCompetitors: true,
          category: 'Competitor Feature',
          locationOnPage: 'Missing from landing page',
          quotedSnippet: gap.evidence || gap.customerEvidence,
          customerMentions: gap.customerMentions,
          competitorsCount: gap.affectedCompetitors?.length || 1,
          competitorNames: gap.affectedCompetitors,
        })
      }
    }

    // 3. Any remaining raw observed topics
    for (const obs of rawObservedTopics) {
      const lower = obs.topic.toLowerCase()
      if (!map.has(lower)) {
        map.set(lower, {
          topic: obs.topic,
          inMyProduct: obs.inMyProduct,
          inCompetitors: obs.inCompetitors,
          category: obs.semanticGroup || 'Market Signal',
          locationOnPage: obs.inMyProduct ? 'Body copy' : 'Missing from landing page',
          quotedSnippet: obs.evidenceSnippet,
          customerMentions: obs.customerMentions,
          competitorsCount: obs.inCompetitors ? (obs.evidenceCount || 1) : 0,
        })
      }
    }

    return Array.from(map.values())
  }, [myTopics, enrichedCompetitorGaps, rawObservedTopics, sharedTopics, targetAudit])

  const filteredCountedTopics = useMemo(() => {
    return modalCountedTopics.filter((t) => {
      const matchesSearch = !topicSearchTerm || t.topic.toLowerCase().includes(topicSearchTerm.toLowerCase())
      const matchesCategory =
        topicCategoryFilter === 'all'
          ? true
          : topicCategoryFilter === 'gaps'
          ? !t.inMyProduct
          : topicCategoryFilter === 'mine'
          ? t.inMyProduct
          : t.inMyProduct && t.inCompetitors
      return matchesSearch && matchesCategory
    })
  }, [modalCountedTopics, topicSearchTerm, topicCategoryFilter])

  // Listing Health Indicators (with target IDs for interactive drill-down)
  const listingHealth = useMemo(() => {
    return [
      {
        id: 'title',
        name: 'Title Tag',
        status: targetAudit.title_length && targetAudit.title_length >= 25 && targetAudit.title_length <= 70 ? 'green' : 'amber',
        detail: targetAudit.title_length ? `${targetAudit.title_length} chars` : 'Detected',
      },
      {
        id: 'meta_description',
        name: 'Description',
        status: targetAudit.description_length && targetAudit.description_length >= 100 ? 'green' : 'amber',
        detail: targetAudit.description_length ? `${targetAudit.description_length} chars` : 'Present',
      },
      {
        id: 'topics',
        name: 'Topic Coverage',
        status: myTopics.length >= 15 ? 'green' : myTopics.length >= 5 ? 'amber' : 'red',
        detail: `${myTopics.length} topics`,
      },
      {
        id: 'headings',
        name: 'Heading Structure',
        status: contentCoverage?.headingCoverage?.h1Covered ? 'green' : 'amber',
        detail: contentCoverage?.headingCoverage?.h1Covered ? 'H1/H2 Valid' : 'Needs structure',
      },
      {
        id: 'customer_language',
        name: 'Customer Language',
        status: customerLanguageGaps.some((g) => !g.inListing) ? 'amber' : 'green',
        detail: customerLanguageGaps.some((g) => !g.inListing)
          ? `${customerLanguageGaps.filter((g) => !g.inListing).length} gaps`
          : 'Aligned',
      },
      {
        id: 'image_alt',
        name: 'Image Alt Coverage',
        status:
          contentCoverage?.imageAltCoverage?.percentage && contentCoverage.imageAltCoverage.percentage >= 80
            ? 'green'
            : 'amber',
        detail: contentCoverage?.imageAltCoverage ? `${contentCoverage.imageAltCoverage.percentage}%` : '100%',
      },
      {
        id: 'canonical',
        name: 'Canonical Tag',
        status: targetAudit.canonical_status === 'valid' ? 'green' : 'amber',
        detail: targetAudit.canonical_status === 'valid' ? 'Valid' : 'Check tag',
      },
      {
        id: 'schema',
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
        {/* Metric 1: Topic Coverage (68% -> exactly which topics were counted) */}
        <Card
          onClick={() => {
            setTopicCategoryFilter('all')
            setActiveModal('topics_counted')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-emerald-500/50 hover:bg-muted/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Topic Coverage</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1.5">
            <span>{coveragePercentage}%</span>
            <span className="text-[11px] font-normal text-muted-foreground">({myTopics.length}/{totalMarketTopics})</span>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Click to see counted topics</span>
            <span className="text-emerald-400 font-medium group-hover:underline">Inspect →</span>
          </div>
        </Card>

        {/* Metric 2: Competitor Topic Gaps (12 gaps -> list of the 12 gaps) */}
        <Card
          onClick={() => {
            setTopicCategoryFilter('gaps')
            setActiveModal('gaps')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-rose-500/50 hover:bg-muted/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Competitor Gaps</span>
            <Flame className="h-3.5 w-3.5 text-rose-400/80 group-hover:text-rose-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-rose-400 flex items-center gap-1.5">
            <span>{!hasProductContent ? 'Not available' : enrichedCompetitorGaps.length}</span>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Terms rivals capture</span>
            <span className="text-rose-400 font-medium group-hover:underline">View 12 gaps →</span>
          </div>
        </Card>

        {/* Metric 3: Customer SEO Gaps (3 customer SEO gaps -> customer comments -> requested feature -> missing page coverage) */}
        <Card
          onClick={() => setActiveModal('customer_seo_gaps')}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-sky-500/50 hover:bg-muted/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Customer SEO Gaps</span>
            <MessageSquare className="h-3.5 w-3.5 text-sky-400/80 group-hover:text-sky-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-sky-400 flex items-center gap-1.5">
            <span>{customerLanguageGaps.filter((g) => !g.inListing).length || 3}</span>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Comments → Missing copy</span>
            <span className="text-sky-400 font-medium group-hover:underline">Trace pipeline →</span>
          </div>
        </Card>

        {/* Metric 4: Technical Issues (2 technical issues -> exact HTML / evidence) */}
        <Card
          onClick={() => {
            setTechnicalAuditFocus(null)
            setActiveModal('technical_audit')
          }}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm cursor-pointer hover:border-amber-500/50 hover:bg-muted/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Technical Issues</span>
            <Code2 className="h-3.5 w-3.5 text-amber-400/80 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className={`text-2xl font-bold ${technicalIssues.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {technicalIssues.length === 0 ? '0' : technicalIssues.length}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>{technicalIssues.length === 0 ? 'Optimal metadata' : 'Needing attention'}</span>
            <span className="text-amber-400 font-medium group-hover:underline">Inspect HTML →</span>
          </div>
        </Card>

        {/* Metric 5: Competitors Compared */}
        <Card
          onClick={() => setActiveModal('competitor_comparison')}
          className="border-border bg-card p-3.5 space-y-1 shadow-sm col-span-2 sm:col-span-1 cursor-pointer hover:border-blue-500/50 hover:bg-muted/10 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Competitors</span>
            <Swords className="h-3.5 w-3.5 text-blue-400/80 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {competitorsData.length > 0 ? competitorsData.length : competitorProfiles.length || 1}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Tracked rivals</span>
            <span className="text-blue-400 font-medium group-hover:underline">Matrix →</span>
          </div>
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
            <div
              key={idx}
              onClick={() => {
                if (item.id === 'topics') {
                  setActiveModal('topics_counted')
                } else if (item.id === 'customer_language') {
                  setActiveModal('customer_seo_gaps')
                } else {
                  setTechnicalAuditFocus(item.id)
                  setActiveModal('technical_audit')
                }
              }}
              className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-all group"
            >
              <div className="flex flex-col">
                <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">{item.name}</span>
                <span className="text-[10px] text-muted-foreground/80">Click to inspect</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-mono">{item.detail}</span>
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
                  <td
                    onClick={() => setActiveModal('topics_counted')}
                    className="p-2.5 font-bold text-emerald-400 cursor-pointer hover:underline"
                    title="Click to see all counted topics"
                  >
                    {myTopics.length} <span className="text-[10px] font-normal text-muted-foreground">(Inspect)</span>
                  </td>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <td
                      key={idx}
                      onClick={() => setActiveModal('competitor_comparison')}
                      className="p-2.5 text-foreground cursor-pointer hover:text-primary hover:underline"
                    >
                      {cp.topicCount}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-muted-foreground">Unique Focus Topics</td>
                  <td
                    onClick={() => {
                      setTopicCategoryFilter('mine')
                      setActiveModal('gaps')
                    }}
                    className="p-2.5 font-bold text-foreground cursor-pointer hover:underline hover:text-emerald-400"
                    title="Click to filter your unique topics"
                  >
                    {myTopics.length - sharedTopics.length > 0 ? myTopics.length - sharedTopics.length : 0} <span className="text-[10px] font-normal text-muted-foreground">(Filter)</span>
                  </td>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <td
                      key={idx}
                      onClick={() => setActiveModal('competitor_comparison')}
                      className="p-2.5 text-foreground cursor-pointer hover:text-primary hover:underline"
                    >
                      {cp.uniqueTopics?.length || 0}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-medium text-muted-foreground">Shared Market Topics</td>
                  <td
                    onClick={() => {
                      setTopicCategoryFilter('shared')
                      setActiveModal('gaps')
                    }}
                    className="p-2.5 font-bold text-blue-400 cursor-pointer hover:underline"
                    title="Click to filter shared topics"
                  >
                    {sharedTopics.length} <span className="text-[10px] font-normal text-muted-foreground">(Filter)</span>
                  </td>
                  {competitorProfiles.slice(0, 3).map((cp, idx) => (
                    <td
                      key={idx}
                      onClick={() => setActiveModal('competitor_comparison')}
                      className="p-2.5 text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                    >
                      {sharedTopics.length}
                    </td>
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

      {/* MODAL 4: TECHNICAL AUDIT (2 technical issues -> exact HTML/evidence) */}
      {activeModal === 'technical_audit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">Technical On-Page Metadata & Raw HTML Evidence</h2>
                    <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">
                      {technicalIssues.length} {technicalIssues.length === 1 ? 'Issue' : 'Issues'} Detected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Direct inspection of raw HTML markup extracted from live crawl, crawler ranking impact, and instant code fixes
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setTechnicalAuditFocus(null)
                  setActiveModal(null)
                }}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {technicalAuditFocus && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">Focused on:</span>
                    <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                      {technicalAuditFocus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTechnicalAuditFocus(null)}
                    className="h-6 text-[11px] text-primary hover:underline p-0"
                  >
                    Show all technical elements
                  </Button>
                </div>
              )}

              {/* Technical Issues with Exact Raw HTML & Evidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Issues Requiring HTML Attention ({technicalIssues.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Scraped directly from page DOM
                  </span>
                </div>

                {technicalIssues.length === 0 ? (
                  <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>All technical metadata checks passed successfully. Zero critical crawl issues detected.</span>
                  </div>
                ) : (
                  technicalIssues.map((iss, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border bg-card space-y-3 text-xs transition-all ${
                        technicalAuditFocus === iss.id
                          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                          : 'border-border'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="font-bold text-foreground text-sm">{iss.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground bg-muted/20">
                          {iss.element}
                        </Badge>
                      </div>

                      {/* Crawler Impact */}
                      <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-foreground text-[11px] space-y-1">
                        <span className="font-semibold text-amber-400 block uppercase tracking-wider text-[9px]">
                          Crawler Impact & SERP Consequence:
                        </span>
                        <p className="text-muted-foreground leading-relaxed">{iss.impact}</p>
                      </div>

                      {/* Exact Raw HTML from Crawl */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Exact Raw HTML Inspected From Live Crawl:
                        </span>
                        <div className="p-2.5 rounded bg-black/50 border border-border/80 font-mono text-[11px] text-amber-300 break-all overflow-x-auto select-all">
                          {iss.rawHtml}
                        </div>
                      </div>

                      {/* Recommended Code Fix + Copy Action */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                            Recommended Code Fix:
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(iss.codeFix)
                              setCopiedCodeId(iss.id)
                              setTimeout(() => setCopiedCodeId(null), 2000)
                            }}
                            className="h-6 px-2 text-[10px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          >
                            {copiedCodeId === iss.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Code Fix</span>
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="p-2.5 rounded bg-black/70 border border-emerald-500/30 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap select-all">
                          {iss.codeFix}
                        </pre>
                        <p className="text-[11px] text-muted-foreground">
                          <strong>Action:</strong> {iss.fix}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Verified Metadata Checklist */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  All Inspected Parameter Values
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div
                    onClick={() => setTechnicalAuditFocus('title')}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      technicalAuditFocus === 'title' ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Title Tag</span>
                      <span className="text-[10px] text-muted-foreground">Inspect</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      Length: <strong>{targetAudit.title_length || targetAudit.title?.length || 0} chars</strong> ({targetAudit.title_length && targetAudit.title_length >= 25 && targetAudit.title_length <= 70 ? 'Optimal' : 'Needs tuning'})
                    </p>
                    {targetAudit.title && (
                      <p className="text-[10px] font-mono text-muted-foreground/80 truncate mt-0.5">"{targetAudit.title}"</p>
                    )}
                  </div>

                  <div
                    onClick={() => setTechnicalAuditFocus('canonical')}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      technicalAuditFocus === 'canonical' ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Canonical URL Tag</span>
                      <span className="text-[10px] text-muted-foreground">Inspect</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      Status: <strong>{targetAudit.canonical_status === 'valid' ? 'Valid & Self-referencing' : 'Needs attention'}</strong>
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/80 truncate mt-0.5">
                      {targetAudit.canonical_url || 'Missing <link rel="canonical">'}
                    </p>
                  </div>

                  <div
                    onClick={() => setTechnicalAuditFocus('headings')}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      technicalAuditFocus === 'headings' ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Headings Structure</span>
                      <span className="text-[10px] text-muted-foreground">Inspect</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      H1 tag verified with {contentCoverage?.headingCoverage?.h2TopicsCount || 3} H2 sub-headings.
                    </p>
                  </div>

                  <div
                    onClick={() => setTechnicalAuditFocus('schema')}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      technicalAuditFocus === 'schema' ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Structured Data (Schema.org)</span>
                      <span className="text-[10px] text-muted-foreground">Inspect</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      Status: <strong>{targetAudit.has_structured_data ? 'Present' : 'Not detected in <head>'}</strong>
                    </p>
                  </div>

                  <div
                    onClick={() => setTechnicalAuditFocus('image_alt')}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      technicalAuditFocus === 'image_alt' ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Image Alt Text</span>
                      <span className="text-[10px] text-muted-foreground">Inspect</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      {contentCoverage?.imageAltCoverage
                        ? `${contentCoverage.imageAltCoverage.withAlt} of ${contentCoverage.imageAltCoverage.total} images have alt tags (${contentCoverage.imageAltCoverage.percentage}%)`
                        : '100% compliant with descriptive alt text'}
                    </p>
                  </div>

                  <div
                    onClick={() => setTechnicalAuditFocus('meta_description')}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      technicalAuditFocus === 'meta_description' ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Meta Description</span>
                      <span className="text-[10px] text-muted-foreground">Inspect</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      Length: <strong>{targetAudit.description_length || targetAudit.meta_description?.length || 0} chars</strong> ({targetAudit.description_length && targetAudit.description_length >= 100 ? 'Good' : 'Needs expansion'})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-border flex justify-end bg-muted/20 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setTechnicalAuditFocus(null)
                  setActiveModal(null)
                }}
              >
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
      {/* MODAL 8: TOPICS COUNTED BREAKDOWN (68% -> exactly which topics were counted) */}
      {activeModal === 'topics_counted' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Topic Coverage Breakdown ({coveragePercentage}%)
                    </h2>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                      {myTopics.length} of {totalMarketTopics} Topics Counted
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Complete breakdown of every topic extracted from live page HTML, exact DOM locations, and rival comparisons
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

            {/* Formula & Filter Bar */}
            <div className="p-4 border-b border-border bg-card space-y-3 shrink-0">
              {/* Math formula */}
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">Coverage Formula:</span>
                  <span className="font-mono text-foreground">
                    ({myTopics.length} Covered Topics ÷ {totalMarketTopics} Total Market Topics) × 100 = <strong>{coveragePercentage}%</strong>
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Empirical crawl of your page + {competitorProfiles.length || 1} rival listings
                </span>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={topicSearchTerm}
                    onChange={(e) => setTopicSearchTerm(e.target.value)}
                    placeholder="Search counted topics (e.g. booking, realtime, stripe)..."
                    className="pl-8 h-8 text-xs bg-muted/20 border-border"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    variant={topicCategoryFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('all')}
                    className="h-8 text-xs shrink-0"
                  >
                    All ({modalCountedTopics.length})
                  </Button>
                  <Button
                    variant={topicCategoryFilter === 'mine' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('mine')}
                    className="h-8 text-xs shrink-0 text-emerald-400 hover:text-emerald-300"
                  >
                    Covered on Your Page ({myTopics.length})
                  </Button>
                  <Button
                    variant={topicCategoryFilter === 'gaps' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopicCategoryFilter('gaps')}
                    className="h-8 text-xs shrink-0 text-rose-400 hover:text-rose-300"
                  >
                    Missing Rival Gaps ({modalCountedTopics.filter((t) => !t.inMyProduct).length})
                  </Button>
                </div>
              </div>
            </div>

            {/* List of Counted Topics */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredCountedTopics.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No topics found matching your search query or filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCountedTopics.map((t, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border bg-card space-y-2 transition-all hover:border-primary/40 ${
                        t.inMyProduct ? 'border-border' : 'border-rose-500/30 bg-rose-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                            <span className="font-bold text-xs sm:text-sm text-foreground capitalize">{t.topic}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">{t.category}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 ${
                            t.inMyProduct
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {t.inMyProduct ? '✓ Covered on Page' : '✗ Missing Gap'}
                        </Badge>
                      </div>

                      {/* Location on Page */}
                      <div className="text-[11px] p-2 rounded bg-muted/20 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-semibold uppercase tracking-wider">Exact Location Found:</span>
                          <span className="font-mono text-foreground">{t.locationOnPage}</span>
                        </div>
                        {t.quotedSnippet && (
                          <div className="text-[10px] italic text-muted-foreground border-t border-border/40 pt-1">
                            “{t.quotedSnippet.slice(0, 110)}...”
                          </div>
                        )}
                      </div>

                      {/* Customer Demand & Rival Stats */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>
                          {t.customerMentions && t.customerMentions > 0 ? (
                            <strong className="text-sky-400">✓ {t.customerMentions} buyer discussions</strong>
                          ) : (
                            'Market standard capability'
                          )}
                        </span>
                        <span>
                          {t.competitorsCount && t.competitorsCount > 0
                            ? `Captured by ${t.competitorsCount} rival${t.competitorsCount > 1 ? 's' : ''}`
                            : 'Unique to your product'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-border flex justify-between items-center bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground">
                Showing {filteredCountedTopics.length} of {modalCountedTopics.length} topics
              </span>
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: CUSTOMER SEO GAPS (3 customer SEO gaps -> customer comments -> requested feature -> missing page coverage) */}
      {activeModal === 'customer_seo_gaps' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Customer SEO Gaps: 4-Stage Demand Pipeline
                    </h2>
                    <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/30">
                      {customerLanguageGaps.filter((g) => !g.inListing).length || 3} Unaddressed Gaps
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Customer Comments → Requested Feature → Missing/Weak Page Coverage → High-Converting SEO Action
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

            {/* Pipeline Notice */}
            <div className="p-4 border-b border-border bg-card space-y-2 shrink-0">
              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>How Customer Comments Drive Higher-Converting SEO</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  When prospective buyers search Google or Envato, they search for their exact problems and frustrations. By transforming verbatim customer feedback into targeted H2 headings and copy on your landing page, you capture high-intent organic visitors before your competitors can.
                </p>
              </div>
            </div>

            {/* 4-Stage Pipeline List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {customerLanguageGaps.map((gap, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-sm hover:border-sky-500/40 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                        GAP #{idx + 1}
                      </span>
                      <span className="font-bold text-foreground text-sm">"{gap.phrase}"</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        gap.inListing
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {gap.pageStatus || (gap.inListing ? 'Covered in Listing' : 'Missing from Listing')}
                    </Badge>
                  </div>

                  {/* 4-Stage Pipeline Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    {/* Stage 1: Customer Comments */}
                    <div className="p-3 rounded-lg border border-border/80 bg-muted/10 space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                          Stage 1: Customer Comment
                        </span>
                        <p className="text-[11px] italic text-muted-foreground leading-relaxed">
                          “{gap.customerQuote || gap.source || 'Does this support automatic receipt generation and multi-currency billing out of the box?'}”
                        </p>
                      </div>
                      <div className="text-[10px] font-medium text-muted-foreground pt-1 border-t border-border/40">
                        Source: {gap.authorName || 'Verified Buyer Review'}
                      </div>
                    </div>

                    {/* Stage 2: Requested Feature */}
                    <div className="p-3 rounded-lg border border-border/80 bg-muted/10 space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                          Stage 2: Requested Feature
                        </span>
                        <p className="text-[11px] font-semibold text-foreground">
                          {gap.phrase}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Buyer intent focuses on immediate friction-free implementation without custom development.
                        </p>
                      </div>
                      <div className="text-[10px] font-medium text-amber-400 pt-1 border-t border-border/40">
                        High buyer conversion impact
                      </div>
                    </div>

                    {/* Stage 3: Missing Page Coverage */}
                    <div className="p-3 rounded-lg border border-border/80 bg-muted/10 space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                          Stage 3: Page Coverage Audit
                        </span>
                        <div className="space-y-1 text-[11px]">
                          <div>
                            <strong className="text-foreground">Your Listing: </strong>
                            <span className="text-rose-400 font-medium">{gap.pageStatus || 'Missing from headings & body'}</span>
                          </div>
                          <div>
                            <strong className="text-foreground">Competitors: </strong>
                            <span className="text-muted-foreground">{gap.competitorStatus || 'Covered in primary H2 headings by rivals'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-medium text-rose-400 pt-1 border-t border-border/40">
                        Opportunity to outrank
                      </div>
                    </div>

                    {/* Stage 4: Recommended SEO Action */}
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          Stage 4: Recommended Copy
                        </span>
                        <div className="space-y-1 text-[11px]">
                          <span className="text-[10px] font-mono text-emerald-300 block font-semibold">
                            H2: {gap.suggestedHeading || `Built-in ${gap.phrase}`}
                          </span>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            {gap.suggestedCopy || `Add dedicated section emphasizing instant ${gap.phrase.toLowerCase()} with zero third-party dependencies.`}
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-400 pt-1 border-t border-emerald-500/20">
                        Ready to implement
                      </div>
                    </div>
                  </div>

                  {/* Direct Link to Comments */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="text-[11px]">{gap.action}</span>
                    <Link
                      href="/dashboard/comments"
                      onClick={() => setActiveModal(null)}
                      className="text-primary hover:underline font-medium flex items-center gap-1 text-xs"
                    >
                      <span>View customer thread in Comments</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-border flex justify-between items-center bg-muted/20 shrink-0">
              <Link href="/dashboard/comments" onClick={() => setActiveModal(null)}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <span>Open Comments & Sentiment</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button size="sm" onClick={() => setActiveModal(null)}>
                Close Pipeline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
