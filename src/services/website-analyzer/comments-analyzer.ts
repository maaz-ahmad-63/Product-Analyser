// src/services/website-analyzer/comments-analyzer.ts
// Analyzes public comments, sentiment, competitor complaints, and recurring negative feedback

import {
  PublicComment,
  RecurringComplaintGroup,
  CompetitorCommentsSummary,
  CommentsAnalysisResult,
  ExtractedProductData,
  SalesCommentCorrelation,
} from './types'

export interface RawCommentItem {
  author_name: string
  comment_text: string
  comment_date: string
  comment_url: string | null
  rating: number | null
}

export type StandardComplaintCategory =
  | 'Installation and setup'
  | 'Documentation'
  | 'Bugs and crashes'
  | 'Support'
  | 'Compatibility'
  | 'Performance'
  | 'Missing features'
  | 'Payment and licensing'
  | 'Security'
  | 'UI/UX'
  | 'Updates'
  | 'Integrations'

interface CategoryPattern {
  category: StandardComplaintCategory
  groupTitle: string
  topicKey: PublicComment['topic']
  keywords: string[]
  criticalKeywords: string[]
  defaultSeverity: 'low' | 'medium' | 'high' | 'critical'
  detectedIssue: string
  relevantFeature: string
  suggestedAngle: string
}

const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: 'Security',
    groupTitle: 'Security and vulnerability concerns',
    topicKey: 'security_concern',
    keywords: [
      'vulnerability', 'sql injection', 'xss', 'exploit', 'unsecured', 'hacked',
      'security flaw', 'cve', 'data leak', 'backdoor', 'malware', 'csrf', 'data breach'
    ],
    criticalKeywords: ['exploit', 'sql injection', 'hacked', 'security flaw', 'data leak', 'breach', 'backdoor', 'data loss'],
    defaultSeverity: 'critical',
    detectedIssue: 'Reported vulnerability, unescaped queries, or potential security exposure in codebase.',
    relevantFeature: 'Hardened enterprise security with sanitized inputs, CSRF tokens, and prepared statements',
    suggestedAngle: 'Highlight validated input sanitization, CSRF protection, and regular dependency security audits.',
  },
  {
    category: 'Bugs and crashes',
    groupTitle: 'Bugs, runtime errors and crashes',
    topicKey: 'bugs_errors',
    keywords: [
      'bug', 'error', 'crash', 'fail', 'broken', 'fatal error', '500 error', 'exception',
      'not working', "doesn't work", 'undefined index', 'white screen', 'blank page',
      'crash loop', 'corrupt', 'database error', 'sql error'
    ],
    criticalKeywords: ['fatal error', '500 error', 'data loss', 'database corrupt', 'crash loop', 'complete product failure', 'major crash'],
    defaultSeverity: 'high',
    detectedIssue: 'Software runtime errors, fatal server crashes, or unhandled exceptions.',
    relevantFeature: 'Stable and strictly tested codebase with automated test suites and bug-fix warranty',
    suggestedAngle: 'Demonstrate tested codebase reliability and zero fatal crash track record.',
  },
  {
    category: 'Payment and licensing',
    groupTitle: 'Payment, licensing and billing disputes',
    topicKey: 'pricing_dissatisfaction',
    keywords: [
      'payment', 'charge', 'refund', 'license key', 'unauthorized charge', 'stole money',
      'billing issue', 'scam', 'purchase code', 'verification failed', 'pricing', 'expensive', 'overpriced'
    ],
    criticalKeywords: ['payment failed', 'stole money', 'chargeback', 'unauthorized charge', 'payment failure'],
    defaultSeverity: 'high',
    detectedIssue: 'Payment processing errors, license validation issues, or unhonored refund requests.',
    relevantFeature: 'Transparent licensing terms with verified refund policy and frictionless activation',
    suggestedAngle: 'Showcase transparent one-time purchase terms with no hidden activation locks or renewal charges.',
  },
  {
    category: 'Installation and setup',
    groupTitle: 'Installation and setup problems',
    topicKey: 'installation_problems',
    keywords: [
      'install', 'installation', 'setup', 'cannot install', 'deploy', 'deployment',
      'composer', 'npm install', '.env', 'migration error', 'server setup', 'configure',
      'configuration', 'hard to setup', 'difficult to install', 'failed to install'
    ],
    criticalKeywords: ['cannot install at all', 'installer broken', 'impossible to setup', 'installation failure'],
    defaultSeverity: 'high',
    detectedIssue: 'Hurdles with initial server setup, missing extension requirements, or broken installation script.',
    relevantFeature: 'Turnkey 1-Click Installation Script & Docker deployment container',
    suggestedAngle: 'Emphasize automated 5-minute setup wizard and pre-configured environment templates.',
  },
  {
    category: 'Documentation',
    groupTitle: 'Documentation and guide deficiencies',
    topicKey: 'poor_documentation',
    keywords: [
      'doc', 'documentation', 'guide', 'tutorial', 'manual', 'no instructions', 'how to setup',
      'missing steps', 'confusing guide', 'unclear instructions', 'poor docs', 'no doc'
    ],
    criticalKeywords: ['zero documentation', 'no docs at all'],
    defaultSeverity: 'medium',
    detectedIssue: 'Missing, outdated, or confusing setup manuals, API references, or tutorials.',
    relevantFeature: 'Comprehensive step-by-step documentation with video guides and full API reference',
    suggestedAngle: 'Highlight searchable interactive documentation with code examples and video walkthroughs.',
  },
  {
    category: 'Support',
    groupTitle: 'Support responsiveness and service issues',
    topicKey: 'poor_support',
    keywords: [
      'no support', 'bad support', 'no reply', 'waiting for response', 'ticket ignored',
      'unresponsive', 'days without reply', 'developer disappeared', 'terrible support',
      'worst support', 'no response', 'support ticket', 'customer service'
    ],
    criticalKeywords: ['support abandoned', 'developer disappeared', 'no reply in weeks'],
    defaultSeverity: 'high',
    detectedIssue: 'Delayed or non-existent author assistance on reported technical problems.',
    relevantFeature: 'Dedicated developer support with guaranteed 24-48h ticket turnaround',
    suggestedAngle: 'Highlight active developer support, dedicated issue tracking, and prompt maintenance releases.',
  },
  {
    category: 'Performance',
    groupTitle: 'Performance lag and speed slowdowns',
    topicKey: 'slow_performance',
    keywords: [
      'slow', 'speed', 'performance', 'lag', 'takes forever', 'high cpu', 'memory leak',
      'timeout', 'sluggish', 'heavy', 'freezes', 'optimise', 'optimize'
    ],
    criticalKeywords: ['server timeout', 'memory exhaustion', 'crashes server'],
    defaultSeverity: 'medium',
    detectedIssue: 'Sluggish page load speeds, memory leaks, or unoptimized database queries.',
    relevantFeature: 'High-performance optimized architecture with Redis caching and query indexing',
    suggestedAngle: 'Demonstrate lightweight benchmarked speed and optimized asset delivery.',
  },
  {
    category: 'Compatibility',
    groupTitle: 'Platform and version compatibility issues',
    topicKey: 'compatibility_problem',
    keywords: [
      'php 8', 'php 8.2', 'php 8.3', 'compatibility', 'incompatible', 'flutter 3', 'node 20',
      'ios 17', 'ios 18', 'android 14', 'android 15', 'deprecated function', 'version mismatch',
      'not compatible', 'breaks on'
    ],
    criticalKeywords: ['deprecated fatal', 'breaks on php 8', 'incompatible with android'],
    defaultSeverity: 'medium',
    detectedIssue: 'Incompatibility with current runtime environments, PHP versions, or mobile OS releases.',
    relevantFeature: 'Up-to-date modern dependency tree supporting modern PHP, Node, and mobile SDKs',
    suggestedAngle: 'Emphasize tested compatibility with modern infrastructure and current LTS versions.',
  },
  {
    category: 'Missing features',
    groupTitle: 'Missing features and functional gaps',
    topicKey: 'missing_feature',
    keywords: [
      'missing feature', 'does not have', "doesn't have", 'lacks', 'need feature',
      'where is', 'why no', 'no option for', 'cannot find option', 'wish it had'
    ],
    criticalKeywords: [],
    defaultSeverity: 'medium',
    detectedIssue: 'Key business capabilities or settings requested by customers are absent.',
    relevantFeature: 'Rich feature-complete platform with modular extensibility',
    suggestedAngle: 'Highlight that our product natively includes these sought-after features out-of-the-box.',
  },
  {
    category: 'Integrations',
    groupTitle: 'Integration ecosystem and third-party API limitations',
    topicKey: 'integration_request',
    keywords: [
      'integrate', 'integration', 'payment gateway', 'stripe', 'paypal', 'razorpay',
      'twillio', 'firebase', 'pusher', 'webhook', 'sms gateway', 'third party', 'api integration',
      'whatsapp', 'telegram', 'google maps'
    ],
    criticalKeywords: [],
    defaultSeverity: 'medium',
    detectedIssue: 'Absence of crucial third-party integrations, payment gateways, or communication webhooks.',
    relevantFeature: 'Pre-built multi-gateway integrations and extensible webhook architecture',
    suggestedAngle: 'Demonstrate verified pre-integrated gateways, SMS providers, and webhook connectivity.',
  },
  {
    category: 'UI/UX',
    groupTitle: 'UI/UX design and workflow usability issues',
    topicKey: 'improvement_suggestion',
    keywords: [
      'ui', 'ux', 'design', 'look and feel', 'user interface', 'user experience',
      'confusing layout', 'cluttered', 'ugly', 'hard to navigate', 'poor navigation',
      'unintuitive', 'awkward', 'responsive issue', 'mobile view broken'
    ],
    criticalKeywords: [],
    defaultSeverity: 'low',
    detectedIssue: 'Confusing user interface, awkward navigation, or unoptimized mobile responsiveness.',
    relevantFeature: 'Modern intuitive UI/UX with responsive mobile design and clean ergonomic layout',
    suggestedAngle: 'Showcase clean, modern, intuitive interface with frictionless workflow navigation.',
  },
  {
    category: 'Updates',
    groupTitle: 'Update cadence and code obsolescence delays',
    topicKey: 'update_request',
    keywords: [
      'outdated', 'abandoned', 'old code', 'legacy', 'deprecated libraries', 'not updated',
      'when is next update', 'update promised', 'waiting for update', 'last update', 'abandonware'
    ],
    criticalKeywords: ['abandonware', 'completely abandoned'],
    defaultSeverity: 'medium',
    detectedIssue: 'Lack of timely product updates, outdated dependencies, or abandoned code maintenance.',
    relevantFeature: 'Actively maintained modern tech stack with continuous quarterly release cycles',
    suggestedAngle: 'Promote active engineering roadmap, verified changelog, and predictable update schedule.',
  },
]

/**
 * Classifies sentiment into Positive, Negative, Neutral, Mixed, Uncertain
 * with context understanding (e.g. "Great product, but the installation guide is confusing" -> Mixed).
 */
export function classifySentimentAndComplaint(
  text: string,
  rating: number | null
): {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | 'uncertain'
  matchedPattern: CategoryPattern | null
  isCritical: boolean
  confidenceScore: number
} {
  const textLower = text.toLowerCase().trim()

  // Contrastive conjunctions indicating mixed sentiment
  const hasContrastiveConjunction =
    /\b(but|however|although|though|except|except for|issue is|problem is|only issue|only problem|sadly|unfortunately|bad thing is)\b/i.test(textLower)

  // Positive indicator keywords
  const positiveWords = [
    'great', 'good', 'awesome', 'excellent', 'love', 'perfect', 'superb', 'best',
    'works well', 'nice', 'smooth', 'satisfied', 'clean code', 'recommend', '5 stars', 'five stars'
  ]
  const hasPositiveWords = positiveWords.some((w) => textLower.includes(w)) || (rating !== null && rating >= 4)

  // Match against patterns
  let matchedPattern: CategoryPattern | null = null
  let isCritical = false

  for (const pattern of CATEGORY_PATTERNS) {
    if (pattern.criticalKeywords.length > 0) {
      if (pattern.criticalKeywords.some((kw) => textLower.includes(kw))) {
        matchedPattern = pattern
        isCritical = true
        break
      }
    }
    if (pattern.keywords.some((kw) => textLower.includes(kw))) {
      matchedPattern = pattern
      break
    }
  }

  // Determine sentiment
  let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | 'uncertain' = 'neutral'
  let confidenceScore = 0.75

  if (matchedPattern) {
    if (hasPositiveWords && hasContrastiveConjunction) {
      sentiment = 'mixed'
      confidenceScore = 0.92
    } else if (hasPositiveWords && !hasContrastiveConjunction && (rating === null || rating >= 4)) {
      // Mentioned a keyword in passing or feature suggestion positively
      sentiment = 'positive'
      confidenceScore = 0.85
    } else {
      sentiment = 'negative'
      confidenceScore = isCritical ? 0.95 : 0.88
    }
  } else {
    // No specific category pattern matched
    const genericNegatives = ['disappointed', 'waste of time', 'does not work', 'bad experience', 'useless', 'terrible', 'horrible', 'not working']
    const hasGenericNeg = genericNegatives.some((g) => textLower.includes(g)) || (rating !== null && rating <= 2)

    if (hasGenericNeg) {
      if (hasPositiveWords) {
        sentiment = 'mixed'
        confidenceScore = 0.8
      } else {
        sentiment = 'negative'
        confidenceScore = 0.85
      }
      // Map to bugs or general issues
      matchedPattern = CATEGORY_PATTERNS.find((p) => p.category === 'Bugs and crashes') || null
    } else if (hasPositiveWords) {
      sentiment = 'positive'
      confidenceScore = 0.9
    } else if (textLower.includes('?') || textLower.startsWith('can ') || textLower.startsWith('how ')) {
      sentiment = 'neutral'
      confidenceScore = 0.75
    } else if (text.length < 15) {
      sentiment = 'uncertain'
      confidenceScore = 0.6
    } else {
      sentiment = 'neutral'
      confidenceScore = 0.7
    }
  }

  return {
    sentiment,
    matchedPattern,
    isCritical,
    confidenceScore,
  }
}

/**
 * Classifies an individual comment.
 * Captures complaints from Negative and Mixed comments.
 * Discards pure praise, neutral comments, and irrelevant noise.
 */
export function classifyNegativeComment(
  raw: RawCommentItem,
  productUrl: string,
  productName: string,
  index: number
): { comment: PublicComment; isCritical: boolean; confidenceScore: number } | null {
  const { sentiment, matchedPattern, isCritical, confidenceScore } = classifySentimentAndComplaint(
    raw.comment_text,
    raw.rating
  )

  // Discard pure positive, neutral, or uncertain comments without an actionable complaint
  if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'uncertain') {
    return null
  }

  if (!matchedPattern) {
    return null
  }

  let severity = matchedPattern.defaultSeverity
  if (isCritical) {
    severity = 'critical'
  }

  const comment: PublicComment = {
    id: `comm_${index}_${Math.random().toString(36).slice(2, 7)}`,
    product_url: productUrl,
    product_name: productName,
    author_name: raw.author_name || 'Public Member',
    comment_text: raw.comment_text,
    comment_url: raw.comment_url,
    comment_date: raw.comment_date || 'Recent public comment',
    rating: raw.rating,
    sentiment,
    topic: matchedPattern.topicKey,
    topic_label: matchedPattern.category,
    severity,
    detected_issue: matchedPattern.detectedIssue,
    relevant_feature: matchedPattern.relevantFeature,
    suggested_angle: matchedPattern.suggestedAngle,
    confidence: isCritical || confidenceScore >= 0.9 ? 'high' : 'medium',
    confidence_score: confidenceScore,
    feedback_type: 'complaint',
    is_suggestive: sentiment === 'mixed',
    collected_at: new Date().toISOString(),
  }

  return { comment, isCritical, confidenceScore }
}

/**
 * Analyzes competitor comments:
 * - Collects negative and mixed complaints.
 * - Filters out positive, neutral, duplicate, and one-time minor complaints.
 * - Groups semantically similar complaints into consolidated RecurringComplaintGroup records.
 * - Evaluates complaint frequency trends over time.
 * - Generates sales & comment correlation analysis.
 */
export function analyzeCompetitorComments(
  competitorsData: ExtractedProductData[],
  scrapedCommentsMap: Record<string, RawCommentItem[]> = {},
  historicalAnalysesOrSnapshots: any[] = []
): CommentsAnalysisResult {
  const summaries: CompetitorCommentsSummary[] = []
  const recurringComplaints: RecurringComplaintGroup[] = []
  const allFilteredComments: PublicComment[] = []
  const unavailableCompetitors: string[] = []
  let totalAnalyzed = 0
  let unresolvedCount = 0

  const correlationObservations: Array<{
    competitor_name: string
    trend_text: string
    sales_impact_text: string
  }> = []

  for (const comp of competitorsData) {
    const rawComments = scrapedCommentsMap[comp.url]

    // If comments are explicitly unavailable
    const isExplicitlyUnavailable =
      rawComments === undefined ||
      (comp.collectionErrors && comp.collectionErrors.some((e) => e.toLowerCase().includes('comment')))

    if (isExplicitlyUnavailable || (!rawComments && comp.url.length > 0)) {
      unavailableCompetitors.push(comp.url)
      summaries.push({
        product_url: comp.url,
        product_name: comp.productName,
        total_comments: 0,
        positive_count: 0,
        negative_count: 0,
        neutral_count: 0,
        suggestive_count: 0,
        comments_unavailable: true,
        common_complaints: [],
        suggestions: [],
        requested_features: [],
        recent_negative_count: 0,
        sentiment_trend: 'Comments unavailable',
      })
      continue
    }

    const commentsList = rawComments || []
    totalAnalyzed += commentsList.length

    // Classify complaints (negative & mixed)
    const classifiedComplaints: Array<{
      comment: PublicComment
      isCritical: boolean
      confidenceScore: number
    }> = []

    let negativeCount = 0
    let mixedCount = 0
    let positiveCount = 0

    // Deduplicate comments by text hash / signature
    const seenTexts = new Set<string>()

    for (let i = 0; i < commentsList.length; i++) {
      const c = commentsList[i]
      const sig = c.comment_text.trim().toLowerCase().slice(0, 100)
      if (seenTexts.has(sig)) continue
      seenTexts.add(sig)

      const res = classifyNegativeComment(c, comp.url, comp.productName, i)
      if (res) {
        classifiedComplaints.push(res)
        allFilteredComments.push(res.comment)
        if (res.comment.sentiment === 'mixed') mixedCount++
        else negativeCount++
      } else {
        positiveCount++
      }
    }

    // Group semantically by category pattern
    const categoryGroups: Record<
      string,
      {
        category: StandardComplaintCategory
        groupTitle: string
        comments: PublicComment[]
        isCritical: boolean
        latestDate: string
        firstDate: string
        representativeComment: string
        commentUrl: string | null
        detectedIssue: string
        confidenceScoreSum: number
      }
    > = {}

    for (const { comment, isCritical, confidenceScore } of classifiedComplaints) {
      const cat = comment.topic_label as StandardComplaintCategory
      const pattern = CATEGORY_PATTERNS.find((p) => p.category === cat)
      const groupTitle = pattern ? pattern.groupTitle : `${cat} problems`

      if (!categoryGroups[cat]) {
        categoryGroups[cat] = {
          category: cat,
          groupTitle,
          comments: [comment],
          isCritical,
          latestDate: comment.comment_date || 'Recently',
          firstDate: comment.comment_date || 'Recently',
          representativeComment: comment.comment_text,
          commentUrl: comment.comment_url,
          detectedIssue: comment.detected_issue,
          confidenceScoreSum: confidenceScore,
        }
      } else {
        categoryGroups[cat].comments.push(comment)
        categoryGroups[cat].confidenceScoreSum += confidenceScore
        if (isCritical) categoryGroups[cat].isCritical = true
        // Keep the more detailed comment as representative
        if (comment.comment_text.length > categoryGroups[cat].representativeComment.length) {
          categoryGroups[cat].representativeComment = comment.comment_text
          categoryGroups[cat].commentUrl = comment.comment_url
        }
        categoryGroups[cat].latestDate = comment.comment_date || categoryGroups[cat].latestDate
      }
    }

    // Apply strict recurring filter:
    // Mention count >= 2 OR critical complaint
    const competitorCommonComplaints: Array<{ topic: string; count: number; sample: string; comments?: PublicComment[] }> = []

    for (const [catName, group] of Object.entries(categoryGroups)) {
      const mentionCount = group.comments.length
      const isRecurring = mentionCount >= 2
      const qualifies = isRecurring || group.isCritical

      if (qualifies) {
        unresolvedCount++
        const avgConfidence = group.confidenceScoreSum / mentionCount

        // Detect complaint trend
        let trend: RecurringComplaintGroup['trend'] = 'Stable'
        if (group.isCritical) {
          trend = 'Critical Spike'
        } else if (mentionCount >= 4) {
          trend = 'Increasing'
        } else if (mentionCount >= 2) {
          trend = 'Persistent'
        } else {
          trend = 'New'
        }

        // Check if complaints appeared after a product update
        const lastUpdateStr = comp.envatoSales?.last_update_date || ''
        if (lastUpdateStr && group.latestDate.includes(lastUpdateStr)) {
          trend = 'After Competitor Update'
        }

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
        if (group.isCritical) severity = 'critical'
        else if (mentionCount >= 3 || catName === 'Security' || catName === 'Bugs and crashes') severity = 'high'
        else if (catName === 'Installation and setup' || catName === 'Support') severity = 'high'

        recurringComplaints.push({
          id: `rcg_${comp.url.slice(-8)}_${catName.replace(/[^a-zA-Z]/g, '').toLowerCase()}`,
          competitor_url: comp.url,
          competitor_name: comp.productName,
          complaint_category: catName,
          short_summary: `${group.groupTitle}: ${group.detectedIssue}`,
          mention_count: mentionCount,
          first_detected_date: group.firstDate,
          latest_occurrence_date: group.latestDate,
          representative_comment: group.representativeComment,
          comment_url: group.commentUrl,
          severity,
          confidence_score: Math.round(avgConfidence * 100) / 100,
          confidence_level: group.isCritical || avgConfidence >= 0.9 ? 'High' : 'Medium',
          is_critical: group.isCritical,
          related_product_update: lastUpdateStr || null,
          current_status: 'New',
          trend,
          feedback_type: 'complaint',
          is_suggestive: false,
          comments: group.comments,
        })

        competitorCommonComplaints.push({
          topic: catName,
          count: mentionCount,
          sample: group.representativeComment.slice(0, 160),
          comments: group.comments,
        })
      }
    }

    // Sentiment summary
    let sentimentTrend: 'Positive' | 'Mixed' | 'Heavy Complaints' | 'Insufficient data' = 'Insufficient data'
    if (commentsList.length > 0) {
      if (negativeCount >= 3) sentimentTrend = 'Heavy Complaints'
      else if (negativeCount > 0 || mixedCount > 0) sentimentTrend = 'Mixed'
      else sentimentTrend = 'Positive'
    }

    summaries.push({
      product_url: comp.url,
      product_name: comp.productName,
      total_comments: commentsList.length,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: 0,
      suggestive_count: mixedCount,
      comments_unavailable: false,
      common_complaints: competitorCommonComplaints,
      suggestions: [],
      requested_features: [],
      recent_negative_count: negativeCount + mixedCount,
      sentiment_trend: sentimentTrend,
    })

    // Compute sales & comment correlation observation
    const currentSales = comp.envatoSales?.current_total_sales ?? null
    const compRating = comp.envatoSales?.rating ?? null
    if (currentSales !== null && recurringComplaints.length > 0) {
      const topIssue = recurringComplaints[0].complaint_category
      correlationObservations.push({
        competitor_name: comp.productName,
        trend_text: `${comp.productName} has recorded ${currentSales.toLocaleString()} sales with rating ${compRating || 'unrated'}, while recurring customer complaints persist in ${topIssue}.`,
        sales_impact_text: `Customer friction in ${topIssue} may indicate post-purchase support burden and an opportunity for competing alternatives offering validated ease of use.`,
      })
    }
  }

  // Build overall sales & comment correlation object
  const salesCommentCorrelation: SalesCommentCorrelation = {
    label: 'Possible correlation; not a proven cause',
    correlation_summary: correlationObservations.length > 0
      ? `Observed ${correlationObservations.length} competitor correlation pattern(s) comparing public sales volume against recurring complaint categories.`
      : 'Insufficient historical data yet to determine statistical correlation between complaints and sales velocity.',
    observations: correlationObservations,
  }

  return {
    summaries,
    recurring_complaints: recurringComplaints,
    comments: allFilteredComments,
    total_analyzed: totalAnalyzed,
    unresolved_count: unresolvedCount,
    unavailable_competitors: unavailableCompetitors,
    sales_comment_correlation: salesCommentCorrelation,
  }
}
