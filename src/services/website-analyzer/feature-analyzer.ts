// src/services/website-analyzer/feature-analyzer.ts
// FEATURE BATTLE — Product Competitive Feature Matrix & Intelligence Engine
// Grounded in real DOM scraped features, review comments, and customer demand signals.

import { ProductAttributeRow, ProductAttributeSignals } from './types'

export type FeatureBattleCategory =
  | 'Core Features'
  | 'Integrations'
  | 'Automation'
  | 'AI'
  | 'Analytics'
  | 'User/Team Management'
  | 'Security'
  | 'Support'
  | 'Platform/Compatibility'
  | 'Pricing/Packaging'

export type FeatureDepth = 'Full' | 'Partial' | 'Basic' | 'Missing' | 'Unknown'

export interface FeatureEvidence {
  snippet: string
  sourceType:
    | 'Product description'
    | 'Feature section'
    | 'Documentation'
    | 'Structured data'
    | 'Customer comment/review'
    | 'Landing page heading'
    | 'Existing observation'
  confidence: 'High' | 'Medium' | 'Low' | 'Unknown'
}

export interface FeatureCustomerImportance {
  customerMentions: number
  complaintMentions: number
  requestMentions: number
  positiveMentions: number
  competitorsOfferingCount: number
  totalCompetitorsCount: number
  importanceScore: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA'
  representativeQuotes: string[]
}

export interface FeatureBattleRow {
  id: string
  feature: string
  category: FeatureBattleCategory
  myProduct: {
    depth: FeatureDepth
    evidence: FeatureEvidence
  }
  competitors: Record<
    string,
    {
      depth: FeatureDepth
      evidence: FeatureEvidence
    }
  >
  customerImportance: FeatureCustomerImportance
  classification: 'table_stakes' | 'advantage' | 'gap' | 'parity' | 'unknown'
  isHighValueGap: boolean
  isLowValueGap: boolean
  isGenuineDifferentiator: boolean
  conclusion: string
}

export interface FeatureBattleSummary {
  featuresYouLead: string[]
  featuresCompetitorsLead: string[]
  parity: string[]
  unknown: string[]
  tableStakes: string[]
  highValueGaps: Array<{
    feature: string
    category: FeatureBattleCategory
    competitorRatio: string // e.g. "2/3"
    competitors: string[]
    myProductDepth: FeatureDepth
    customerMentions: number
    requestMentions: number
    priority: 'HIGH' | 'MEDIUM'
    reason: string
    evidence: FeatureEvidence
  }>
  lowValueGaps: Array<{
    feature: string
    category: FeatureBattleCategory
    competitors: string[]
    customerMentions: number
    reason: string
  }>
  myProductAdvantages: Array<{
    feature: string
    category: FeatureBattleCategory
    myDepth: FeatureDepth
    customerEvidenceCount: number
    customerQuote?: string
    differentiatorReason: string
  }>
  whatThisMeans: {
    whereYouWin: string
    whereCompetitorsLead: string
    importantGaps: string
    lowValueGapsToAvoid: string
    top3Priorities: Array<{
      rank: number
      feature: string
      action: string
      evidenceReason: string
    }>
  }
}

export interface FeatureBattleResult {
  summary: FeatureBattleSummary
  matrix: FeatureBattleRow[]
  categories: Array<{ name: FeatureBattleCategory; count: number }>
  totalMarketFeatures: number
  attributeSignals?: ProductAttributeSignals
}

// Backwards compatibility types for components that import these
export interface AnalyzedFeatureItem {
  id: string
  name: string
  category: string
  isTargetSupported: boolean
  supportedByCompetitors: string[]
  status: 'differentiator' | 'shared' | 'competitor_gap'
  strategicImpact: string
}

export interface ComprehensiveFeatureAnalysis {
  targetCleanCount: number
  totalMarketFeaturesCount: number
  coveragePercentage: number
  differentiatorsCount: number
  sharedParityCount: number
  competitorGapsCount: number
  categories: Array<{ name: string; count: number }>
  matrix: AnalyzedFeatureItem[]
}

const STOP_WORDS = new Set([
  'and', 'with', 'for', 'the', 'from', 'system', 'management', 'application',
  'solution', 'features', 'module', 'tool', 'app', 'platform', 'service',
  'user', 'users', 'online', 'advanced', 'built', 'easy', 'including', 'support',
  'complete', 'perfect'
])

const BOILERPLATE_PATTERNS = [
  'shift + opt', 'opt + /', 'search opt', 'cart shift', 'home shift',
  'skip to main', 'press enter', 'keyboard shortcut', 'privacy notice',
  'terms of service', 'all rights reserved', 'cookie policy', 'privacy policy',
  'main content', 'about this item', 'buying options', 'compare with similar items',
  'prime video', 'bestsellers', "today's deals", 'customer service',
  'new releases', 'amazon pay', 'gift cards', 'beauty & personal care',
  'returns & replacements', 'manage your content', 'help & contact',
  'back to top', 'conditions of use', 'sign in', 'your account',
  'add to cart', 'buy now', 'read more', 'click here', 'learn more',
  'view all', 'view details', 'show more', 'see more', 'copyright',
  'electronics', 'home & kitchen', 'computers', 'toys & games', 'books',
  'quality checked by envato', 'future updates included', '6 months author support'
]

export function isBoilerplateFeature(text?: string): boolean {
  if (!text) return true
  const l = text.toLowerCase().trim()
  if (l.length < 4 || l.length > 280) return true
  return BOILERPLATE_PATTERNS.some(
    (b) => l === b || l.startsWith(b + ' ') || l.endsWith(' ' + b)
  )
}

export function sanitizeFeatureList(features?: any[]): string[] {
  if (!features || !Array.isArray(features)) return []
  const unique = new Set<string>()
  const result: string[] = []

  for (const raw of features) {
    if (typeof raw !== 'string') continue
    const cleaned = raw.trim().replace(/\s+/g, ' ')
    if (!isBoilerplateFeature(cleaned)) {
      const lower = cleaned.toLowerCase()
      if (!unique.has(lower)) {
        unique.add(lower)
        result.push(cleaned)
      }
    }
  }

  return result
}

export function isSimilarFeatureText(a?: string, b?: string): boolean {
  if (!a || !b) return false
  const cleanA = a.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ')
  const cleanB = b.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ')

  if (cleanA === cleanB) return true
  if (cleanA.length > 15 && cleanB.length > 15) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true
  }

  const tokensA = cleanA.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  const tokensB = cleanB.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))

  if (tokensA.length === 0 || tokensB.length === 0) return false

  const setB = new Set(tokensB)
  let informativeMatches = 0
  for (const t of tokensA) {
    if (setB.has(t)) informativeMatches++
  }

  const minTokens = Math.min(tokensA.length, tokensB.length)
  return (informativeMatches / minTokens) >= 0.6
}

export function detectFeatureCategory(text?: string): string {
  return mapToBattleCategory(text || '')
}

export function mapToBattleCategory(text: string): FeatureBattleCategory {
  if (!text || typeof text !== 'string') return 'Core Features'
  const l = text.toLowerCase()
  if (/\b(ai|gpt|llm|bot|chatbot|machine learning|nlp|smart|predict|copilot)\b/.test(l)) {
    return 'AI'
  }
  if (/\b(automate|automation|workflow|trigger|webhook|auto|rule|sync)\b/.test(l)) {
    return 'Automation'
  }
  if (/\b(api|integration|connect|zapier|stripe|paypal|firebase|google maps|slack|twilio|whatsapp)\b/.test(l)) {
    return 'Integrations'
  }
  if (/\b(report|analytics|metric|chart|stat|export|csv|pdf|insights|telemetry|kpi)\b/.test(l)) {
    return 'Analytics'
  }
  if (/\b(user|team|role|member|permission|agent|driver|rider|auth|login|customer|admin panel|account)\b/.test(l)) {
    return 'User/Team Management'
  }
  if (/\b(security|ssl|verify|verification|document|kyc|encrypt|token|otp|protect|audit|sos)\b/.test(l)) {
    return 'Security'
  }
  if (/\b(support|doc|documentation|ticket|chat|help|faq|guide|manual|24\/7|voice|contact|warranty|guarantee|installation|authorized partner|authorized service|service partner|service network|return policy)\b/.test(l)) {
    return 'Support'
  }
  if (/\b(price|pricing|tier|plan|license|subscription|billing|checkout|payment|cost|discount|wallet|fare|invoice)\b/.test(l)) {
    return 'Pricing/Packaging'
  }
  if (/\b(ios|android|flutter|react native|web|pwa|mobile|app|windows|mac|linux|cloud|multi-platform|compatibility)\b/.test(l)) {
    return 'Platform/Compatibility'
  }
  return 'Core Features'
}

/**
 * Evaluates feature depth ('Full' | 'Partial' | 'Basic' | 'Missing' | 'Unknown')
 * and extracts source evidence receipts.
 */
export function evaluateProductDepth(
  product: any,
  featureName: string,
  isTargetProduct: boolean = false,
  commentsForProduct: any[] = []
): { depth: FeatureDepth; evidence: FeatureEvidence } {
  if (!product) {
    return {
      depth: 'Unknown',
      evidence: {
        snippet: 'No verified product metadata cataloged.',
        sourceType: 'Existing observation',
        confidence: 'Unknown',
      },
    }
  }

  const rawFeatures = product.features || []
  const cleanFeatures = sanitizeFeatureList(rawFeatures)

  // 1. Direct or semantic match in product feature bullet list
  const matchingBullet = cleanFeatures.find((f) => isSimilarFeatureText(featureName, f))
  if (matchingBullet) {
    const l = matchingBullet.toLowerCase()
    const isBasic = /\b(basic|simple|standard|limited|entry)\b/.test(l)
    const isComprehensive = /\b(complete|full|real-time|advanced|unlimited|multi|automated|automated)\b/.test(l) || matchingBullet.length > 40

    // Check if customer comments indicate fatal issues with this feature on this product
    const relevantNegativeComment = commentsForProduct.find((c) => {
      const cText = ((c.text || c.comment_text || c.short_summary || '') + ' ' + (c.relevant_feature || '')).toLowerCase()
      return c.feedback_type === 'complaint' && isSimilarFeatureText(featureName, cText)
    })

    if (relevantNegativeComment) {
      return {
        depth: 'Partial',
        evidence: {
          snippet: `Advertised as "${matchingBullet}", but customer reported: "${(relevantNegativeComment.text || relevantNegativeComment.short_summary || '').slice(0, 110)}..."`,
          sourceType: 'Customer comment/review',
          confidence: 'Medium',
        },
      }
    }

    return {
      depth: isBasic ? 'Basic' : isComprehensive ? 'Full' : 'Full',
      evidence: {
        snippet: matchingBullet,
        sourceType: 'Feature section',
        confidence: 'High',
      },
    }
  }

  // 2. Check headings and descriptions
  const description = String(product.description || product.websiteTitle || '')
  if (description) {
    const sentences = description.split(/[.\n]/).map((s) => s.trim()).filter((s) => s.length > 10)
    const matchingSentence = sentences.find((s) => isSimilarFeatureText(featureName, s))
    if (matchingSentence) {
      return {
        depth: 'Partial',
        evidence: {
          snippet: matchingSentence.slice(0, 140),
          sourceType: 'Product description',
          confidence: 'Medium',
        },
      }
    }
  }

  // 3. Structured Data / Heading checks
  const h2s: string[] = product.headings?.h2 || []
  const matchingH2 = h2s.find((h) => isSimilarFeatureText(featureName, h))
  if (matchingH2) {
    return {
      depth: 'Partial',
      evidence: {
        snippet: matchingH2,
        sourceType: 'Landing page heading',
        confidence: 'Medium',
      },
    }
  }

  // 4. Check for explicit negation or absence complaints in comments/complaints
  const allNegations = [
    ...(Array.isArray(product.complaints) ? product.complaints : []),
    ...commentsForProduct.map((c: any) => c.text || c.comment_text || c.short_summary || ''),
  ]
  const explicitNegation = allNegations.find((text: string) => {
    if (!text || typeof text !== 'string') return false
    const l = text.toLowerCase()
    const tokens = featureName.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    const mentionsFeature = tokens.length > 0 && tokens.every((t) => l.includes(t))
    const hasNegation = /\b(not support|does not have|no support|lacks|missing|doesn't have|doesn't support|without|no option)\b/.test(l)
    return mentionsFeature && hasNegation
  })

  if (explicitNegation) {
    return {
      depth: 'Missing',
      evidence: {
        snippet: explicitNegation.slice(0, 140),
        sourceType: 'Customer comment/review',
        confidence: 'High',
      },
    }
  }

  // 5. Missing vs Unknown distinction
  // If the product has a comprehensive cataloged feature list (>= 5 features or rich description)
  // and zero trace of this feature was found, it is reasonably classified as Missing from the offering.
  // If the product page was brief, unindexed, or sparse, classify as Unknown (never assume absence).
  if (cleanFeatures.length >= 5 || description.length > 200) {
    return {
      depth: 'Missing',
      evidence: {
        snippet: `Explicitly unlisted across ${cleanFeatures.length} cataloged feature specifications and landing page copy.`,
        sourceType: 'Product description',
        confidence: 'High',
      },
    }
  }

  return {
    depth: 'Unknown',
    evidence: {
      snippet: 'Insufficient public landing page documentation to verify presence or absence.',
      sourceType: 'Existing observation',
      confidence: 'Unknown',
    },
  }
}

/**
 * Calculates customer importance based on real reviews & comments data.
 */
export function computeCustomerImportance(
  featureName: string,
  comments: any[] = [],
  competitorsOfferingCount: number = 0,
  totalCompetitorsCount: number = 1
): FeatureCustomerImportance {
  const tokens = featureName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))

  let customerMentions = 0
  let complaintMentions = 0
  let requestMentions = 0
  let positiveMentions = 0
  const representativeQuotes: string[] = []

  for (const c of comments) {
    const rawText = String(c.text || c.comment_text || c.short_summary || c.detected_issue || '')
    const fullText = (rawText + ' ' + (c.relevant_feature || '')).toLowerCase()

    const matchesTokens =
      tokens.length > 0 &&
      (tokens.length === 1 ? fullText.includes(tokens[0]) : tokens.filter((t) => fullText.includes(t)).length >= Math.min(2, tokens.length))

    const matchesSemantic = isSimilarFeatureText(featureName, rawText) || isSimilarFeatureText(featureName, c.relevant_feature)

    if (matchesTokens || matchesSemantic) {
      customerMentions++
      const isComplaint =
        c.feedback_type === 'complaint' ||
        c.sentiment === 'negative' ||
        /\b(issue|problem|bug|broken|error|fail|crash|disconnect|not working|slow|fix)\b/.test(fullText)
      const isRequest =
        c.feedback_type === 'feature_request' ||
        c.is_suggestive ||
        /\b(please add|request|feature request|asking for|need|want|hope to see|would love)\b/.test(fullText)
      const isPraise =
        c.feedback_type === 'praise' ||
        c.sentiment === 'positive' ||
        /\b(love|great|smooth|amazing|best|excellent|perfect|super)\b/.test(fullText)

      if (isComplaint) complaintMentions++
      if (isRequest) requestMentions++
      if (isPraise) positiveMentions++

      if (representativeQuotes.length < 2 && rawText.length > 20) {
        representativeQuotes.push(rawText.slice(0, 140).trim() + (rawText.length > 140 ? '...' : ''))
      }
    }
  }

  let importanceScore: FeatureCustomerImportance['importanceScore'] = 'LOW'
  if (comments.length === 0 || customerMentions === 0) {
    importanceScore = 'INSUFFICIENT_DATA'
  } else if (
    requestMentions >= 2 ||
    customerMentions >= 5 ||
    (complaintMentions >= 1 && competitorsOfferingCount >= 2) ||
    complaintMentions >= 2
  ) {
    importanceScore = 'HIGH'
  } else if (customerMentions >= 1 || requestMentions >= 1 || complaintMentions >= 1) {
    importanceScore = 'MEDIUM'
  }

  return {
    customerMentions,
    complaintMentions,
    requestMentions,
    positiveMentions,
    competitorsOfferingCount,
    totalCompetitorsCount,
    importanceScore,
    representativeQuotes,
  }
}

/**
 * Builds the complete Feature Battle Intelligence Result.
 */
export function buildFeatureBattle(
  myProduct: any,
  competitors: any[] = [],
  commentsAnalysis: any = {}
): FeatureBattleResult {
  const cleanTargetFeatures = sanitizeFeatureList(myProduct?.features || [])
  const validCompetitors = (Array.isArray(competitors) ? competitors : [])
    .filter(Boolean)
    .map((c, idx) => ({
      name: c?.productName || c?.websiteTitle || `Competitor ${idx + 1}`,
      raw: c,
      cleanFeatures: sanitizeFeatureList(c?.features || []),
    }))

  const allComments: any[] = commentsAnalysis?.comments || []

  // Build unified distinct list of features
  const distinctFeatures: Array<{ name: string; category: FeatureBattleCategory }> = []

  const addDistinct = (featName: string) => {
    if (!featName || isBoilerplateFeature(featName)) return
    const already = distinctFeatures.some((df) => isSimilarFeatureText(df.name, featName))
    if (!already) {
      distinctFeatures.push({
        name: featName,
        category: mapToBattleCategory(featName),
      })
    }
  }

  // Add target features
  cleanTargetFeatures.forEach(addDistinct)

  // Add competitor features
  validCompetitors.forEach((comp) => {
    comp.cleanFeatures.forEach(addDistinct)
  })

  // Matrix construction
  const matrix: FeatureBattleRow[] = []
  const featuresYouLead: string[] = []
  const featuresCompetitorsLead: string[] = []
  const parity: string[] = []
  const unknownList: string[] = []
  const tableStakesList: string[] = []

  const highValueGaps: FeatureBattleSummary['highValueGaps'] = []
  const lowValueGaps: FeatureBattleSummary['lowValueGaps'] = []
  const myProductAdvantages: FeatureBattleSummary['myProductAdvantages'] = []

  for (let i = 0; i < distinctFeatures.length; i++) {
    const item = distinctFeatures[i]
    const featName = item.name
    const category = item.category

    // 1. Target Support
    const targetSupport = evaluateProductDepth(myProduct, featName, true, allComments)

    // 2. Competitors Support
    const competitorSupportMap: Record<string, { depth: FeatureDepth; evidence: FeatureEvidence }> = {}
    const offeringCompetitors: string[] = []

    for (const comp of validCompetitors) {
      const compComments = allComments.filter((c) =>
        (c.product_name && comp.name && c.product_name.toLowerCase().includes(comp.name.toLowerCase().slice(0, 12)))
      )
      const depthObj = evaluateProductDepth(comp.raw, featName, false, compComments)
      competitorSupportMap[comp.name] = depthObj

      if (depthObj.depth === 'Full' || depthObj.depth === 'Partial' || depthObj.depth === 'Basic') {
        offeringCompetitors.push(comp.name)
      }
    }

    // 3. Customer Importance
    const customerImportance = computeCustomerImportance(
      featName,
      allComments,
      offeringCompetitors.length,
      validCompetitors.length
    )

    // 4. Classification & Leader logic
    const targetHas = targetSupport.depth === 'Full' || targetSupport.depth === 'Partial' || targetSupport.depth === 'Basic'
    const competitorCount = validCompetitors.length
    const offeringRatio = competitorCount > 0 ? offeringCompetitors.length / competitorCount : 0

    let classification: FeatureBattleRow['classification'] = 'unknown'
    let isHighValueGap = false
    let isLowValueGap = false
    let isGenuineDifferentiator = false
    let conclusion = ''

    // Table Stakes check: majority (>= 60%) of competitors offer it
    if (offeringRatio >= 0.6 && competitorCount >= 2) {
      tableStakesList.push(featName)
    }

    // Detect if sales leader offers this feature
    let salesLeader: any = null
    let maxCompSales = -1
    for (const c of validCompetitors) {
      const s = c.raw?.envatoSales?.current_total_sales ?? 0
      if (s > maxCompSales) {
        maxCompSales = s
        salesLeader = c
      }
    }
    const isLeaderOffering = salesLeader && offeringCompetitors.includes(salesLeader.name)
    const leaderNote = isLeaderOffering ? ` (including sales leader ${salesLeader.name})` : ''

    if (targetSupport.depth === 'Unknown') {
      classification = 'unknown'
      unknownList.push(featName)
      conclusion = `Telemetry on ${featName} is inconclusive from available public landing pages.`
    } else if (targetHas && offeringCompetitors.length === 0) {
      // My product has it, zero competitors verified
      classification = 'advantage'
      featuresYouLead.push(featName)
      isGenuineDifferentiator = true
      conclusion = `Exclusive capability: 0/${validCompetitors.length} competitors offer this (${myProduct?.productName || myProduct?.websiteTitle || 'Your product'} exclusive lead).`

      myProductAdvantages.push({
        feature: featName,
        category,
        myDepth: targetSupport.depth,
        customerEvidenceCount: customerImportance.positiveMentions + customerImportance.customerMentions,
        customerQuote: customerImportance.representativeQuotes[0],
        differentiatorReason: customerImportance.positiveMentions > 0
          ? `Verified differentiator validated by positive buyer comments.`
          : `Potential differentiator based on scanned specifications. (Note: lack of competitor mention is strong positioning indication, not guaranteed absence).`,
      })
    } else if (!targetHas && offeringCompetitors.length > 0) {
      // Competitor lead / Gap
      classification = 'gap'
      featuresCompetitorsLead.push(featName)
      const ratioStr = `${offeringCompetitors.length}/${validCompetitors.length} competitors have this feature${leaderNote}`

      if (customerImportance.importanceScore === 'HIGH' || customerImportance.requestMentions >= 1 || customerImportance.customerMentions >= 4) {
        isHighValueGap = true
        conclusion = `${ratioStr} (${offeringCompetitors.join(', ')}). Your product lacks this capability, while active customer demand (${customerImportance.customerMentions} mentions, ${customerImportance.requestMentions} feature requests) makes this a high-priority gap.`

        highValueGaps.push({
          feature: featName,
          category,
          competitorRatio: `${offeringCompetitors.length}/${validCompetitors.length}`,
          competitors: offeringCompetitors,
          myProductDepth: targetSupport.depth,
          customerMentions: customerImportance.customerMentions,
          requestMentions: customerImportance.requestMentions,
          priority: customerImportance.requestMentions >= 2 || offeringRatio >= 0.6 ? 'HIGH' : 'MEDIUM',
          reason: conclusion,
          evidence: competitorSupportMap[offeringCompetitors[0]]?.evidence,
        })
      } else {
        isLowValueGap = true
        conclusion = `${ratioStr} (${offeringCompetitors.join(', ')}). Your product lacks this capability, but customer discussion volume is low (${customerImportance.customerMentions} mentions). Low immediate risk gap.`

        lowValueGaps.push({
          feature: featName,
          category,
          competitors: offeringCompetitors,
          customerMentions: customerImportance.customerMentions,
          reason: conclusion,
        })
      }
    } else if (targetHas && offeringCompetitors.length > 0) {
      // Both have it
      classification = 'parity'
      parity.push(featName)
      conclusion = `${offeringCompetitors.length}/${validCompetitors.length} competitors have this feature${leaderNote} (${offeringCompetitors.join(', ')}). Supported by both your product and rivals as baseline market capability.`
    }

    matrix.push({
      id: `battle-row-${i + 1}`,
      feature: featName,
      category,
      myProduct: targetSupport,
      competitors: competitorSupportMap,
      customerImportance,
      classification,
      isHighValueGap,
      isLowValueGap,
      isGenuineDifferentiator,
      conclusion,
    })
  }

  // Sort high-value gaps by priority and customer requests descending
  highValueGaps.sort((a, b) => {
    if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1
    if (b.priority === 'HIGH' && a.priority !== 'HIGH') return 1
    return (b.customerMentions + b.requestMentions * 2) - (a.customerMentions + a.requestMentions * 2)
  })

  // Category aggregations
  const categoryMap = new Map<FeatureBattleCategory, number>()
  matrix.forEach((m) => {
    categoryMap.set(m.category, (categoryMap.get(m.category) || 0) + 1)
  })
  const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    count,
  }))

  // Generate "What This Means" deterministic briefing
  const top3Gaps = highValueGaps.slice(0, 3)
  const top3Priorities = top3Gaps.map((g, idx) => ({
    rank: idx + 1,
    feature: g.feature,
    action: `Prioritize ${g.feature} in next product cycle`,
    evidenceReason: `Offered by ${g.competitors.join(', ')} (${g.competitorRatio} rivals) with ${g.customerMentions} customer discussion mentions and ${g.requestMentions} explicit feature requests.`,
  }))

  const whereYouWin = featuresYouLead.length > 0
    ? `Your product leads in ${featuresYouLead.length} unique capabilities (including ${featuresYouLead.slice(0, 3).join(', ')}), providing strong defensive positioning.`
    : 'No exclusive feature leads cataloged; focus on customer service speed and pricing stability.'

  const whereCompetitorsLead = featuresCompetitorsLead.length > 0
    ? `Rivals maintain feature leads across ${featuresCompetitorsLead.length} capabilities, of which ${highValueGaps.length} are validated by active customer demand.`
    : 'Zero competitor feature leads identified from public specifications.'

  const importantGaps = highValueGaps.length > 0
    ? `${highValueGaps.length} gaps have real customer backing. Addressing "${highValueGaps[0]?.feature}" will neutralize the most common competitive objection.`
    : 'No high-urgency customer-backed gaps detected.'

  const lowValueGapsToAvoid = lowValueGaps.length > 0
    ? `${lowValueGaps.length} competitor features (e.g. ${lowValueGaps.slice(0, 2).map((g) => `"${g.feature}"`).join(', ')}) exhibit low or zero customer mentions. Avoid duplicating these purely to match rival checklists.`
    : 'All identified competitor gaps correlate with active buyer discussions.'

  const summary: FeatureBattleSummary = {
    featuresYouLead,
    featuresCompetitorsLead,
    parity,
    unknown: unknownList,
    tableStakes: Array.from(new Set(tableStakesList)),
    highValueGaps,
    lowValueGaps,
    myProductAdvantages,
    whatThisMeans: {
      whereYouWin,
      whereCompetitorsLead,
      importantGaps,
      lowValueGapsToAvoid,
      top3Priorities,
    },
  }

  // Phase 1: Amazon Product Attributes Intelligence across ALL competitors
  const attributeSignals = buildProductAttributeSignals(myProduct, validCompetitors)

  return {
    summary,
    matrix,
    categories,
    totalMarketFeatures: matrix.length,
    attributeSignals,
  }
}

/**
 * Builds deterministic Product Attribute comparison across My Product and ALL competitors.
 * Grounded strictly in real scraped specs table and detail bullets from public pages.
 * Missing attribute = "Not available", never zero.
 */
export function buildProductAttributeSignals(
  myProduct: any,
  validCompetitors: Array<{ name: string; raw: any }>
): ProductAttributeSignals | undefined {
  const mySpecs: Record<string, string> = myProduct?.specs || {}
  const compSpecsList = (validCompetitors || []).map((c) => ({
    name: c.name,
    specs: (c.raw?.specs || {}) as Record<string, string>,
  }))

  const attributeKeysMap = new Map<string, string>()

  const registerKey = (key: string) => {
    if (!key) return
    const trimmed = key.trim()
    if (trimmed.length < 2 || trimmed.length > 50) return
    const lower = trimmed.toLowerCase()
    if (
      lower === 'tags' ||
      lower === 'breadcrumbs' ||
      lower === 'comments' ||
      lower.includes('best sellers rank') ||
      lower.includes('customer reviews') ||
      lower.includes('rating')
    ) {
      return
    }
    if (!attributeKeysMap.has(lower)) {
      attributeKeysMap.set(lower, trimmed)
    }
  }

  Object.keys(mySpecs).forEach(registerKey)
  compSpecsList.forEach((c) => {
    Object.keys(c.specs).forEach(registerKey)
  })

  if (attributeKeysMap.size === 0) {
    return undefined
  }

  const matrix: ProductAttributeRow[] = []
  let myObservedCount = 0
  let competitorGapsCount = 0
  const totalCompetitorsCount = validCompetitors.length

  for (const [lowerKey, canonicalName] of Array.from(attributeKeysMap.entries())) {
    let myVal = 'Not available'
    for (const [k, v] of Object.entries(mySpecs)) {
      if (k.toLowerCase() === lowerKey && v && String(v).trim()) {
        myVal = String(v).trim()
        break
      }
    }

    if (myVal !== 'Not available') {
      myObservedCount++
    }

    const competitorVals: Record<string, string> = {}
    let competitorsWithAttr = 0

    for (const comp of compSpecsList) {
      let compVal = 'Not available'
      for (const [k, v] of Object.entries(comp.specs)) {
        if (k.toLowerCase() === lowerKey && v && String(v).trim()) {
          compVal = String(v).trim()
          break
        }
      }
      competitorVals[comp.name] = compVal
      if (compVal !== 'Not available') {
        competitorsWithAttr++
      }
    }

    const penetrationRatio = totalCompetitorsCount > 0 ? `${competitorsWithAttr}/${totalCompetitorsCount}` : '0/0'

    const isServiceClaim = /\b(warranty|guarantee|partner|authorized|service|support|installation|network|repair|maintenance|return|policy|customer service)\b/i.test(canonicalName)
    const kind: ProductAttributeRow['kind'] = isServiceClaim ? 'service_claim' : 'specification'

    let status: ProductAttributeRow['status'] = 'shared'
    let conclusion = ''

    if (myVal !== 'Not available' && competitorsWithAttr === 0) {
      status = 'advantage'
      conclusion = `Your product specifies ${canonicalName} (${myVal}), while 0/${totalCompetitorsCount} competitors specify this attribute.`
    } else if (myVal === 'Not available' && competitorsWithAttr > 0) {
      status = 'gap'
      if (kind === 'specification') {
        competitorGapsCount++
      }
      conclusion = `${competitorsWithAttr}/${totalCompetitorsCount} competitors specify ${canonicalName}. Not observed on your product public page.`
    } else if (myVal !== 'Not available' && competitorsWithAttr > 0) {
      const anyDiff = Object.values(competitorVals).some(
        (cv) => cv !== 'Not available' && cv.toLowerCase() !== myVal.toLowerCase()
      )
      status = anyDiff ? 'different' : 'shared'
      conclusion = `${competitorsWithAttr}/${totalCompetitorsCount} competitors specify ${canonicalName}.`
    } else {
      status = 'shared'
      conclusion = `Not observed on public pages.`
    }

    matrix.push({
      name: canonicalName,
      myValue: myVal,
      competitors: competitorVals,
      competitorsWithAttributeCount: competitorsWithAttr,
      totalCompetitorsCount,
      penetrationRatio,
      status,
      conclusion,
      kind,
    })
  }

  // Sort matrix: Gaps first, then differences, then advantages, then shared
  matrix.sort((a, b) => {
    if (a.status === 'gap' && b.status !== 'gap') return -1
    if (b.status === 'gap' && a.status !== 'gap') return 1
    return b.competitorsWithAttributeCount - a.competitorsWithAttributeCount
  })

  const totalObservedAttributes = matrix.length
  const isComparable = myObservedCount > 0
  const attributeCoveragePercentage = isComparable && totalObservedAttributes > 0
    ? Math.round((myObservedCount / totalObservedAttributes) * 100)
    : null

  let whatWeFound = ''
  if (!isComparable) {
    whatWeFound = 'Comparable public specifications were not observed on your listing.'
  } else if (totalCompetitorsCount > 0) {
    const topGap = matrix.find((m) => m.status === 'gap' && m.kind === 'specification') || matrix.find((m) => m.status === 'gap')
    if (topGap && topGap.competitorsWithAttributeCount > 0) {
      whatWeFound = `${topGap.competitorsWithAttributeCount} of ${totalCompetitorsCount} competitors share attributes that are not currently observed on your product.`
    } else if (competitorGapsCount > 0) {
      whatWeFound = `Competitors specify ${competitorGapsCount} technical product attributes not currently observed on your product.`
    } else if (attributeCoveragePercentage !== null && attributeCoveragePercentage >= 80) {
      whatWeFound = `Your product has high attribute coverage (${attributeCoveragePercentage}%), matching or exceeding monitored competitor specifications.`
    } else {
      whatWeFound = `Cataloged ${totalObservedAttributes} observed specifications across ${totalCompetitorsCount} competitors.`
    }
  } else {
    whatWeFound = `Cataloged ${totalObservedAttributes} product specifications from public listing.`
  }

  return {
    attributeCoveragePercentage,
    totalObservedAttributes,
    myObservedCount,
    competitorGapsCount,
    whatWeFound,
    matrix,
    isComparable,
  }
}

/**
 * Legacy wrapper function for backwards compatibility with existing views.
 */
export function analyzeFeatures(
  targetProduct: any,
  competitors: any[] = []
): ComprehensiveFeatureAnalysis {
  const result = buildFeatureBattle(targetProduct, competitors)
  return {
    targetCleanCount: sanitizeFeatureList(targetProduct?.features || []).length,
    totalMarketFeaturesCount: result.totalMarketFeatures,
    coveragePercentage: result.matrix.length > 0
      ? Math.round(((result.summary.featuresYouLead.length + result.summary.parity.length) / result.matrix.length) * 100)
      : 0,
    differentiatorsCount: result.summary.featuresYouLead.length,
    sharedParityCount: result.summary.parity.length,
    competitorGapsCount: result.summary.featuresCompetitorsLead.length,
    categories: result.categories.map((c) => ({ name: c.name, count: c.count })),
    matrix: result.matrix.map((m) => ({
      id: m.id,
      name: m.feature,
      category: m.category,
      isTargetSupported: m.myProduct.depth === 'Full' || m.myProduct.depth === 'Partial' || m.myProduct.depth === 'Basic',
      supportedByCompetitors: Object.entries(m.competitors)
        .filter(([_, comp]) => comp.depth === 'Full' || comp.depth === 'Partial' || comp.depth === 'Basic')
        .map(([name]) => name),
      status: m.classification === 'advantage' ? 'differentiator' : m.classification === 'gap' ? 'competitor_gap' : 'shared',
      strategicImpact: m.conclusion,
    })),
  }
}
