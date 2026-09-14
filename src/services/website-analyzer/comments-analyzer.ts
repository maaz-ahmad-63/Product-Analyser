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
import {
  clusterCommentsSemantically,
  clusterCommentsSemanticallySync,
  SemanticCluster,
} from './semantic-clustering'

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
  | 'Hardware, build and defects'
  | 'Camera and multimedia'
  | 'Pricing and value'

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
  {
    category: 'Hardware, build and defects',
    groupTitle: 'Hardware defects, durability and build quality',
    topicKey: 'hardware_defect',
    keywords: [
      'stopped working', 'stop working', 'manufacturing defect', 'manufacturing defaults', 'hardware default',
      'broken', 'defect', 'defective', 'delicate', 'fragile', 'scratched', 'scratch', 'dent', 'dented',
      'heating', 'heats up', 'overheating', 'battery drain', 'drains fast', 'battery life', 'charger', 'charging',
      'stuck', 'screen bleed', 'flicker', 'dead pixel', 'hardware issue'
    ],
    criticalKeywords: ['stopped working', 'stop working', 'manufacturing defect', 'manufacturing defaults', 'lost 40k', 'total failure', 'scam straight forward'],
    defaultSeverity: 'high',
    detectedIssue: 'Reported hardware component failure, manufacturing defect, premature battery degradation, or excessive heating.',
    relevantFeature: 'Rigorous hardware manufacturing quality assurance, aerospace-grade Titanium enclosure, and full warranty replacement guarantee',
    suggestedAngle: 'Emphasize verified manufacturing standards, premium durability materials (Ceramic Shield, Grade 5 Titanium), and no-hassle warranty backing.',
  },
  {
    category: 'Camera and multimedia',
    groupTitle: 'Camera, audio and multimedia limitations',
    topicKey: 'multimedia_camera',
    keywords: [
      'camera', 'single camera', 'portraits', 'focusing', 'focus', 'lens', 'lenses',
      'speaker', 'single speaker', 'sound is low', 'speakers', 'sound quality', 'audio',
      'microphone', 'stereo speakers', 'zoom', 'telephoto', 'macro', 'video quality'
    ],
    criticalKeywords: ['camera not focusing', 'speaker not working', 'broken camera'],
    defaultSeverity: 'medium',
    detectedIssue: 'Customer friction regarding camera zoom/portrait limitations or single-speaker acoustic volume.',
    relevantFeature: 'Advanced multi-lens Fusion camera system with optical zoom, spatial audio, and stereo speaker output',
    suggestedAngle: 'Highlight superior optical camera capabilities, advanced portrait computational photography, and immersive stereo audio performance.',
  },
  {
    category: 'Pricing and value',
    groupTitle: 'Pricing, value proposition and cost justification',
    topicKey: 'pricing_value',
    keywords: [
      'not value for money', 'value for money', 'costing more', 'less features', 'overpriced',
      'expensive', 'not worth', 'too high price', 'cost based on', 'costly', 'bad value'
    ],
    criticalKeywords: ['not value for money', 'waste of money', 'overpriced for what it offers'],
    defaultSeverity: 'medium',
    detectedIssue: 'Customer perception that product pricing is premium relative to the included baseline feature set.',
    relevantFeature: 'High performance-to-price ratio with premium flagship components included at competitive value',
    suggestedAngle: 'Showcase comprehensive premium specifications, trade-in incentives, and long-term resale / device longevity.',
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
    /\b(but|however|although|though|except|except for|issue is|problem is|only issue|only problem|only downside|sadly|unfortunately|bad thing is|cons?|drawback|drawbacks|downside|downsides)\b/i.test(textLower)

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
export async function analyzeCompetitorComments(
  competitorsData: ExtractedProductData[],
  scrapedCommentsMap: Record<string, RawCommentItem[]> = {},
  historicalAnalysesOrSnapshots: any[] = []
): Promise<CommentsAnalysisResult> {
  const summaries: CompetitorCommentsSummary[] = []
  const recurringComplaints: RecurringComplaintGroup[] = []
  const allFilteredComments: PublicComment[] = []
  const allProcessedComments: PublicComment[] = []
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
    let neutralCount = 0

    // Deduplicate comments by text hash / signature
    const seenTexts = new Set<string>()

    for (let i = 0; i < commentsList.length; i++) {
      const c = commentsList[i]
      const sig = c.comment_text.trim().toLowerCase().slice(0, 100)
      if (seenTexts.has(sig)) continue
      seenTexts.add(sig)

      const { sentiment, matchedPattern, isCritical, confidenceScore } = classifySentimentAndComplaint(
        c.comment_text,
        c.rating
      )

      const pubComment: PublicComment = {
        id: `comm_${comp.url.slice(-6)}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        product_url: comp.url,
        product_name: comp.productName,
        author_name: c.author_name || 'Verified Buyer',
        comment_text: c.comment_text,
        comment_url: c.comment_url,
        comment_date: c.comment_date || 'Recent public review',
        rating: c.rating,
        sentiment,
        topic: matchedPattern?.topicKey || 'general_question',
        topic_label: matchedPattern?.category || (sentiment === 'positive' ? 'Positive Review' : 'General Feedback'),
        severity: matchedPattern?.defaultSeverity || 'low',
        detected_issue: matchedPattern?.detectedIssue || (sentiment === 'positive' ? 'Positive customer experience' : 'General feedback'),
        relevant_feature: matchedPattern?.relevantFeature || '',
        suggested_angle: matchedPattern?.suggestedAngle || '',
        confidence: isCritical || confidenceScore >= 0.9 ? 'high' : 'medium',
        confidence_score: confidenceScore,
        feedback_type: sentiment === 'positive' ? 'suggestion' : 'complaint',
        is_suggestive: sentiment === 'mixed',
        collected_at: new Date().toISOString(),
      }

      allProcessedComments.push(pubComment)

      if (sentiment === 'negative' || sentiment === 'mixed') {
        classifiedComplaints.push({ comment: pubComment, isCritical, confidenceScore })
        allFilteredComments.push(pubComment)
        if (sentiment === 'mixed') mixedCount++
        else negativeCount++
      } else if (sentiment === 'positive') {
        positiveCount++
      } else {
        neutralCount++
      }
    }

    // Group semantically by vector similarity and root issues
    const complaintsToCluster = classifiedComplaints.map((c) => c.comment)
    const semanticClusters = await clusterCommentsSemantically(complaintsToCluster)

    const competitorCommonComplaints: Array<{
      topic: string
      count: number
      sample: string
      comments?: PublicComment[]
      semantic_issue?: string
    }> = []

    for (const cluster of semanticClusters) {
      const mentionCount = cluster.mentionCount
      const isRecurring = mentionCount >= 2
      const qualifies = isRecurring || cluster.isCritical || cluster.severity === 'high' || (commentsList.length <= 15 && mentionCount >= 1)

      if (qualifies) {
        unresolvedCount++

        // Detect complaint trend
        let trend: RecurringComplaintGroup['trend'] = 'Stable'
        if (cluster.isCritical) {
          trend = 'Critical Spike'
        } else if (mentionCount >= 4) {
          trend = 'Increasing'
        } else if (mentionCount >= 2) {
          trend = 'Persistent'
        } else {
          trend = 'New'
        }

        const lastUpdateStr = comp.envatoSales?.last_update_date || ''
        const clusterDates = cluster.comments.map((c) => c.comment_date).filter(Boolean) as string[]
        const latestDate = clusterDates[0] || 'Recently'
        const firstDate = clusterDates[clusterDates.length - 1] || 'Recently'

        if (lastUpdateStr && latestDate.includes(lastUpdateStr)) {
          trend = 'After Competitor Update'
        }

        const shortSummary = `${cluster.issueLabel}: ${cluster.representativeComment.slice(0, 100)}`

        recurringComplaints.push({
          id: `rcg_${comp.url.slice(-8)}_${cluster.clusterId}`,
          competitor_url: comp.url,
          competitor_name: comp.productName,
          complaint_category: cluster.broadCategory,
          semantic_issue: cluster.issueLabel,
          short_summary: shortSummary,
          mention_count: mentionCount,
          first_detected_date: firstDate,
          latest_occurrence_date: latestDate,
          representative_comment: cluster.representativeComment,
          comment_url: cluster.sourceUrl,
          severity: cluster.severity,
          confidence_score: cluster.confidenceScore,
          confidence_level: cluster.isCritical || cluster.confidenceScore >= 0.9 ? 'High' : 'Medium',
          is_critical: cluster.isCritical,
          related_product_update: lastUpdateStr || null,
          current_status: 'New',
          trend,
          feedback_type: 'complaint',
          is_suggestive: false,
          comments: cluster.comments,
          supporting_comments: cluster.supportingComments,
          similarity_score: cluster.avgSimilarity,
        })

        competitorCommonComplaints.push({
          topic: cluster.issueLabel,
          count: mentionCount,
          sample: cluster.representativeComment.slice(0, 160),
          comments: cluster.comments,
          semantic_issue: cluster.issueLabel,
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
      neutral_count: neutralCount,
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
    all_comments: allProcessedComments,
    total_analyzed: totalAnalyzed,
    unresolved_count: unresolvedCount,
    unavailable_competitors: unavailableCompetitors,
    sales_comment_correlation: salesCommentCorrelation,
    positive_count: summaries.reduce((acc, s) => acc + s.positive_count, 0),
    negative_count: summaries.reduce((acc, s) => acc + s.negative_count, 0),
    neutral_count: summaries.reduce((acc, s) => acc + s.neutral_count, 0),
    clusters: recurringComplaints,
    topComplaints: recurringComplaints.slice(0, 5),
    competitor_summaries: summaries,
  }
}

// ─────────────────────────────────────────────
// PHASE 3: 13-CATEGORY CUSTOMER FEEDBACK ORGANIZER
// ─────────────────────────────────────────────

export type FeedbackCategory =
  | 'Positive Feedback'
  | 'Question'
  | 'Bug'
  | 'Installation Problem'
  | 'Documentation Problem'
  | 'Compatibility Issue'
  | 'Performance Issue'
  | 'Pricing Complaint'
  | 'Support Complaint'
  | 'Feature Request'
  | 'Refund Issue'
  | 'Other'
  | 'Unclassified'

export interface FeedbackCategoryGroup {
  category: FeedbackCategory
  frequency: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  representativeEvidence: string
  sourceUrl: string | null
  comments: PublicComment[]
  isRecurring: boolean // true if any semantic issue within this category has >= 2 mentions
  isSingleCritical: boolean // frequency === 1 && severity === 'critical'
  semanticIssues?: Array<{
    issueLabel: string
    frequency: number
    sample: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    isRecurring: boolean
    similarityScore?: number
    comments: PublicComment[]
  }>
}

export function classifyCommentCategory(comment: PublicComment): FeedbackCategory {
  const text = (comment.comment_text || '').toLowerCase().trim()
  const topic = comment.topic || ''
  const rating = comment.rating

  // 1. Refund Issue (high specificity)
  if (/\b(refund|chargeback|money back|stole money|dispute|scam)\b/i.test(text)) {
    return 'Refund Issue'
  }

  // 2. Installation Problem
  if (topic === 'installation_problems' || /\b(install|installation|setup|composer|npm install|\.env|deployment|failed to install)\b/i.test(text)) {
    return 'Installation Problem'
  }

  // 3. Documentation Problem
  if (topic === 'poor_documentation' || /\b(documentation|manual|guide|tutorial|missing steps|no doc|unclear instructions)\b/i.test(text)) {
    return 'Documentation Problem'
  }

  // 4. Compatibility Issue
  if (topic === 'compatibility_problem' || /\b(php 8|flutter 3|flutter|node|ios|android|incompatible|version mismatch|breaks on)\b/i.test(text)) {
    return 'Compatibility Issue'
  }

  // 5. Performance Issue
  if (topic === 'slow_performance' || /\b(slow|lag|takes forever|sluggish|heavy|high cpu|memory leak|timeout|freezes)\b/i.test(text)) {
    return 'Performance Issue'
  }

  // 6. Support Complaint
  if (topic === 'poor_support' || /\b(no support|bad support|no reply|waiting for reply|ticket ignored|unresponsive|worst support|developer disappeared)\b/i.test(text)) {
    return 'Support Complaint'
  }

  // 7. Pricing Complaint
  if (topic === 'pricing_dissatisfaction' || /\b(expensive|overpriced|price increase|pricing issue|high price|license fee)\b/i.test(text)) {
    return 'Pricing Complaint'
  }

  // 8. Bug
  if (topic === 'bugs_errors' || /\b(bug|crash|fatal error|500 error|broken|not working|doesn't work|exception|blank page|crash loop|sql error)\b/i.test(text)) {
    return 'Bug'
  }

  // 9. Feature Request
  if (topic === 'missing_feature' || topic === 'feature_suggestion' || /\b(feature request|wish it had|please add|can you add|need feature|would love to see)\b/i.test(text)) {
    return 'Feature Request'
  }

  // 10. Question (only if not an error report)
  if (topic === 'general_question' || /\?$/.test(text) || /\b(how to|can i|is it possible|does this support|where can i|is there an option)\b/i.test(text)) {
    return 'Question'
  }

  // 11. Positive Feedback
  if (comment.sentiment === 'positive' || (rating !== null && rating !== undefined && rating >= 4) || /\b(great|awesome|excellent|love|perfect|superb|best|works well|clean code|5 stars)\b/i.test(text)) {
    return 'Positive Feedback'
  }

  // 12. Other (Security, UI/UX, Updates)
  if (topic === 'security_concern' || topic === 'update_request' || topic === 'improvement_suggestion' || topic === 'integration_request') {
    return 'Other'
  }

  // 13. Unclassified
  return text.length > 0 ? 'Other' : 'Unclassified'
}

export function organizeFeedbackIntoCategories(comments: PublicComment[]): {
  groups: FeedbackCategoryGroup[]
  recurringComplaints: FeedbackCategoryGroup[]
  criticalSingleIssues: FeedbackCategoryGroup[]
  totalFeedback: number
} {
  const buckets: Record<FeedbackCategory, PublicComment[]> = {
    'Positive Feedback': [],
    'Question': [],
    'Bug': [],
    'Installation Problem': [],
    'Documentation Problem': [],
    'Compatibility Issue': [],
    'Performance Issue': [],
    'Pricing Complaint': [],
    'Support Complaint': [],
    'Feature Request': [],
    'Refund Issue': [],
    'Other': [],
    'Unclassified': [],
  }

  for (const c of comments) {
    const cat = classifyCommentCategory(c)
    buckets[cat].push(c)
  }

  const groups: FeedbackCategoryGroup[] = []

  const CATEGORY_SUMMARIES: Record<FeedbackCategory, string> = {
    'Positive Feedback': 'Customers express satisfaction with product stability, design, or capabilities.',
    'Question': 'Pre-sale or technical inquiries regarding usage, configuration, or roadmap.',
    'Bug': 'Runtime errors, crashes, or unhandled exceptions reported by users.',
    'Installation Problem': 'Friction encountered during server configuration, dependency resolution, or initial setup.',
    'Documentation Problem': 'Gaps or ambiguities in setup manuals, API references, or tutorials.',
    'Compatibility Issue': 'Issues with specific PHP, framework, browser, or mobile OS releases.',
    'Performance Issue': 'Concerns regarding loading latency, server timeouts, or resource utilization.',
    'Pricing Complaint': 'Feedback regarding commercial licensing terms, renewals, or perceived cost.',
    'Support Complaint': 'Reports of response delays, unresolved support tickets, or communication difficulties.',
    'Feature Request': 'Explicit requests for new integrations, settings, or functional capabilities.',
    'Refund Issue': 'Disputes or requests regarding refunds, purchase verification, or payment failures.',
    'Other': 'Security, design, or minor workflow feedback.',
    'Unclassified': 'General discussions or uncategorized customer comments.',
  }

  for (const [cat, list] of Object.entries(buckets) as [FeedbackCategory, PublicComment[]][]) {
    if (list.length === 0) continue

    // Determine highest severity in group
    let groupSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (list.some((c) => c.severity === 'critical')) groupSeverity = 'critical'
    else if (list.some((c) => c.severity === 'high')) groupSeverity = 'high'
    else if (list.some((c) => c.severity === 'medium')) groupSeverity = 'medium'

    // Pick representative comment (longest or most descriptive)
    const sortedByLength = [...list].sort((a, b) => b.comment_text.length - a.comment_text.length)
    const representative = sortedByLength[0]

    // Cluster comments semantically inside this category
    const clusters = clusterCommentsSemanticallySync(list)
    const hasRecurringCluster = clusters.some((cl) => cl.mentionCount >= 2)
    const isSingleCritical = list.length === 1 && groupSeverity === 'critical'

    const semanticIssues = clusters.map((cl) => ({
      issueLabel: cl.issueLabel,
      frequency: cl.mentionCount,
      sample: cl.representativeComment,
      severity: cl.severity,
      isRecurring: cl.mentionCount >= 2,
      similarityScore: cl.avgSimilarity,
      comments: cl.comments,
    }))

    groups.push({
      category: cat,
      frequency: list.length,
      severity: groupSeverity,
      summary: CATEGORY_SUMMARIES[cat],
      representativeEvidence: representative.comment_text,
      sourceUrl: representative.comment_url || list.find((c) => c.comment_url)?.comment_url || null,
      comments: list,
      isRecurring: hasRecurringCluster,
      isSingleCritical,
      semanticIssues,
    })
  }

  // Sort groups by frequency descending, then critical severity first
  groups.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (b.severity === 'critical' && a.severity !== 'critical') return 1
    return b.frequency - a.frequency
  })

  const recurringComplaints = groups.filter(
    (g) => g.isRecurring && g.category !== 'Positive Feedback' && g.category !== 'Question'
  )

  const criticalSingleIssues = groups.filter((g) => g.isSingleCritical)

  return {
    groups,
    recurringComplaints,
    criticalSingleIssues,
    totalFeedback: comments.length,
  }
}

