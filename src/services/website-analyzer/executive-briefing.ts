// src/services/website-analyzer/executive-briefing.ts
// Evidence-grounded executive business briefing synthesizing verified product, SEO, feedback, and pricing telemetry

import {
  ExtractedProductData,
  ProductComparison,
  CompetitorCommentsSummary,
  OpportunityRecord,
} from './types'

export interface ExecutiveBriefingInput {
  myProduct: ExtractedProductData
  primaryCompetitor: ExtractedProductData
  comparison: ProductComparison
  commentsSummary?: CompetitorCommentsSummary | null
  opportunities?: OpportunityRecord[]
}

/**
 * Deterministic evidence-grounded executive briefing fallback.
 * Strictly anchored to verified facts from the collection pipeline.
 */
export function generateDeterministicExecutiveBriefing(input: ExecutiveBriefingInput): string {
  const { myProduct, primaryCompetitor, comparison, commentsSummary, opportunities } = input

  const myName = myProduct.productName || myProduct.title || myProduct.websiteTitle || 'Our Product'
  const compName = primaryCompetitor.productName || primaryCompetitor.title || primaryCompetitor.websiteTitle || 'Competitor'

  // 1. Positioning & Audience Context
  const myPositioning = myProduct.positioningClaims?.[0] || myProduct.description || 'Target SaaS solution'
  const compPositioning = primaryCompetitor.positioningClaims?.[0] || primaryCompetitor.description || 'Competing SaaS solution'

  // 2. Feature Differentiation
  const myExclusive = (comparison.myExclusiveFeatures || []).slice(0, 3)
  const compExclusive = (comparison.competitorExclusiveFeatures || []).slice(0, 3)
  const sharedCount = (comparison.sharedFeatures || []).length

  let featureSummary = ''
  if (myExclusive.length > 0 && compExclusive.length > 0) {
    featureSummary = `${myName} demonstrates distinct advantages in ${myExclusive.join(', ')}. Conversely, ${compName} exclusively lists ${compExclusive.join(', ')} (${sharedCount} core features shared).`
  } else if (myExclusive.length > 0) {
    featureSummary = `${myName} lists verified exclusive capabilities including ${myExclusive.join(', ')} with ${sharedCount} shared core features.`
  } else {
    featureSummary = `Both products share ${sharedCount} core functional capabilities across monitored public listings.`
  }

  // 3. Pricing & Commercial Structure
  const myStarting = myProduct.pricingPlans?.[0]?.priceMonthly || myProduct.pricingPlans?.[0]?.priceAnnual || myProduct.pricingPlans?.[0]?.price || myProduct.envatoSales?.product_price || 'Unlisted'
  const compStarting = primaryCompetitor.pricingPlans?.[0]?.priceMonthly || primaryCompetitor.pricingPlans?.[0]?.priceAnnual || primaryCompetitor.pricingPlans?.[0]?.price || primaryCompetitor.envatoSales?.product_price || 'Unlisted'
  const pricingSummary = `Commercial benchmark: ${myName} starts at ${myStarting} vs ${compName} at ${compStarting}. Free tier status: ${
    myProduct.hasFreePlan ? 'Free tier offered' : 'No public free tier'
  } vs ${primaryCompetitor.hasFreePlan ? 'competitor free tier available' : 'no competitor free tier'}.`

  // 4. Customer Feedback & Reliability Gaps
  let feedbackSummary = 'No recurring customer complaints detected on public listings.'
  if (commentsSummary?.common_complaints && commentsSummary.common_complaints.length > 0) {
    const topIssues = commentsSummary.common_complaints
      .slice(0, 2)
      .map((c) => `"${c.semantic_issue || c.topic}" (${c.count} mentions)`)
      .join(' and ')
    feedbackSummary = `Public buyer feedback indicates recurring friction on ${compName} around ${topIssues}, signaling a potential reliability differentiation opportunity.`
  }

  // 5. Strategic Opportunity Highlights
  let oppSummary = ''
  const verifiedOpps = (opportunities || []).filter((o) => o.has_matching_feature)
  if (verifiedOpps.length > 0) {
    oppSummary = `Actionable Growth Angle: ${verifiedOpps[0].value_proposition}`
  }

  return [
    `### Executive Briefing: ${myName} vs. ${compName}`,
    `**Strategic Positioning:** ${myName} is positioned around "${myPositioning}", competing directly against ${compName} ("${compPositioning}").`,
    `**Product & Feature Matrix:** ${featureSummary}`,
    `**Commercial Posture:** ${pricingSummary}`,
    `**Customer Sentiment & Friction:** ${feedbackSummary}`,
    oppSummary ? `**Key Recommendation:** ${oppSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Generates an executive business briefing.
 * Uses OpenAI if configured, with strict grounding prompt and 4-second timeout,
 * falling back seamlessly to the deterministic briefing.
 */
export async function generateExecutiveBriefing(input: ExecutiveBriefingInput): Promise<string> {
  const fallback = generateDeterministicExecutiveBriefing(input)

  const apiKey = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim()
  const baseUrl = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey || baseUrl.length === 0) {
    return fallback
  }

  const payloadContext = {
    myProductName: input.myProduct.productName,
    myProductPositioning: (input.myProduct.positioningClaims || []).slice(0, 2),
    myExclusiveFeatures: (input.comparison.myExclusiveFeatures || []).slice(0, 4),
    competitorName: input.primaryCompetitor.productName,
    competitorPositioning: (input.primaryCompetitor.positioningClaims || []).slice(0, 2),
    competitorExclusiveFeatures: (input.comparison.competitorExclusiveFeatures || []).slice(0, 4),
    sharedFeaturesCount: (input.comparison.sharedFeatures || []).length,
    myStartingPrice: input.myProduct.pricingPlans?.[0]?.priceMonthly || input.myProduct.pricingPlans?.[0]?.price || input.myProduct.envatoSales?.product_price || null,
    competitorStartingPrice: input.primaryCompetitor.pricingPlans?.[0]?.priceMonthly || input.primaryCompetitor.pricingPlans?.[0]?.price || input.primaryCompetitor.envatoSales?.product_price || null,
    competitorRecurringIssues: (input.commentsSummary?.common_complaints || []).slice(0, 3).map((c) => ({
      issue: c.semantic_issue || c.topic,
      mentions: c.count,
    })),
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a senior B2B SaaS market analyst. Write a concise, 3-paragraph executive business briefing comparing the target product against the competitor. Rules:\n1. Use ONLY facts provided in the prompt.\n2. Do NOT invent features, revenue, market share, or unstated facts.\n3. Format with clean markdown headings and bold labels.\n4. Keep tone professional, objective, and executive-ready.',
          },
          {
            role: 'user',
            content: `Verified Market Intelligence Telemetry:\n${JSON.stringify(payloadContext, null, 2)}`,
          },
        ],
        temperature: 0.2,
      }),
    })

    clearTimeout(timeout)

    if (!res.ok) return fallback

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (content && content.length >= 100) {
      return content
    }
  } catch {
    // Fail silently to deterministic fallback
  }

  return fallback
}
