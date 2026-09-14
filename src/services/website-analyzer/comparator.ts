import {
  ExtractedProductData,
  ProductComparison,
  RuleRecommendation,
  PricingPlanExtracted,
} from './types'
import {
  HybridSemanticVectorProvider,
  cosineSimilarity,
} from './semantic-embedder'

const vectorProvider = new HybridSemanticVectorProvider()

export function compareProducts(
  myProduct: ExtractedProductData,
  competitor: ExtractedProductData
): {
  comparison: ProductComparison
  recommendations: RuleRecommendation[]
} {
  // 1. Feature Diffing via Semantic Vector Similarity and Informative Token Overlap
  const myFeatures = myProduct.features || []
  const compFeatures = competitor.features || []

  const sharedFeatures: string[] = []
  const myExclusiveFeatures: string[] = []
  const competitorExclusiveFeatures: string[] = []

  // Check my features against competitor features
  for (const mf of myFeatures) {
    const isShared = compFeatures.some((cf) => isSimilarFeatureText(mf, cf))
    if (isShared) {
      if (!sharedFeatures.includes(mf)) sharedFeatures.push(mf)
    } else {
      myExclusiveFeatures.push(mf)
    }
  }

  // Check competitor features against my features
  for (const cf of compFeatures) {
    const isShared = myFeatures.some((mf) => isSimilarFeatureText(cf, mf))
    if (!isShared && !competitorExclusiveFeatures.includes(cf)) {
      competitorExclusiveFeatures.push(cf)
    }
  }

  // 2. Comprehensive Multi-Tier Pricing Comparison
  const pricingDifferences: Array<{
    category: string
    myProduct: string
    competitor: string
    difference: string
  }> = []

  const myPlans = myProduct.pricingPlans || []
  const compPlans = competitor.pricingPlans || []

  let myMinPrice: number | null = null
  let compMinPrice: number | null = null

  if (myPlans.length > 0 || compPlans.length > 0) {
    // A. Starting / Entry Plan Comparison
    const myFirstPlan = myPlans[0]
    const compFirstPlan = compPlans[0]
    myMinPrice = extractNumericPrice(myFirstPlan)
    compMinPrice = extractNumericPrice(compFirstPlan)

    let entryDiffText = 'Prices not directly comparable'
    if (myMinPrice !== null && compMinPrice !== null) {
      const delta = myMinPrice - compMinPrice
      const symbol = extractCurrencySymbol(myFirstPlan) || extractCurrencySymbol(compFirstPlan) || '$'
      if (delta < 0) {
        entryDiffText = `My product is ${symbol}${Math.abs(delta).toLocaleString()} cheaper on entry tier`
      } else if (delta > 0) {
        entryDiffText = `Competitor is ${symbol}${delta.toLocaleString()} cheaper on entry tier`
      } else {
        entryDiffText = 'Identical starting price'
      }
    } else if (myFirstPlan && !compFirstPlan) {
      entryDiffText = 'Competitor pricing not publicly listed'
    } else if (!myFirstPlan && compFirstPlan) {
      entryDiffText = 'My product pricing not publicly listed'
    }

    pricingDifferences.push({
      category: 'Starting Tier',
      myProduct: formatPlanLabel(myFirstPlan),
      competitor: formatPlanLabel(compFirstPlan),
      difference: entryDiffText,
    })

    // B. Mid-Tier / Growth Comparison (if either side offers > 1 tier)
    if (myPlans.length > 1 || compPlans.length > 1) {
      const myMidPlan = myPlans.length > 2 ? myPlans[1] : myPlans[myPlans.length - 1]
      const compMidPlan = compPlans.length > 2 ? compPlans[1] : compPlans[compPlans.length - 1]
      const myMidPrice = extractNumericPrice(myMidPlan)
      const compMidPrice = extractNumericPrice(compMidPlan)

      let midDiff = 'Tier details differ'
      if (myMidPrice !== null && compMidPrice !== null) {
        const delta = myMidPrice - compMidPrice
        const symbol = extractCurrencySymbol(myMidPlan) || extractCurrencySymbol(compMidPlan) || '$'
        midDiff =
          delta < 0
            ? `My product is ${symbol}${Math.abs(delta).toLocaleString()} cheaper on mid-tier`
            : delta > 0
            ? `Competitor is ${symbol}${delta.toLocaleString()} cheaper on mid-tier`
            : 'Same mid-tier price'
      }

      pricingDifferences.push({
        category: 'Mid / Professional Tier',
        myProduct: formatPlanLabel(myMidPlan),
        competitor: formatPlanLabel(compMidPlan),
        difference: midDiff,
      })
    }

    // C. Top / Enterprise Tier Comparison (if either side offers >= 3 tiers)
    if (myPlans.length >= 3 || compPlans.length >= 3) {
      const myTopPlan = myPlans[myPlans.length - 1]
      const compTopPlan = compPlans[compPlans.length - 1]
      const myTopPrice = extractNumericPrice(myTopPlan)
      const compTopPrice = extractNumericPrice(compTopPlan)

      let topDiff = 'Custom enterprise quotes or distinct inclusions'
      if (myTopPrice !== null && compTopPrice !== null) {
        const delta = myTopPrice - compTopPrice
        const symbol = extractCurrencySymbol(myTopPlan) || extractCurrencySymbol(compTopPlan) || '$'
        topDiff =
          delta < 0
            ? `My product is ${symbol}${Math.abs(delta).toLocaleString()} cheaper on top tier`
            : delta > 0
            ? `Competitor is ${symbol}${delta.toLocaleString()} cheaper on top tier`
            : 'Same top-tier price'
      }

      pricingDifferences.push({
        category: 'High / Enterprise Tier',
        myProduct: formatPlanLabel(myTopPlan),
        competitor: formatPlanLabel(compTopPlan),
        difference: topDiff,
      })
    }

    // D. Licensing & Billing Model
    const myIsOneTime =
      (myProduct.envatoSales?.product_price && !myProduct.pricingPlans.some((p) => p.priceMonthly?.includes('/mo'))) ||
      myPlans.some((p) => p.priceMonthly?.toLowerCase().includes('one-time'))
    const compIsOneTime =
      (competitor.envatoSales?.product_price && !competitor.pricingPlans.some((p) => p.priceMonthly?.includes('/mo'))) ||
      compPlans.some((p) => p.priceMonthly?.toLowerCase().includes('one-time'))

    pricingDifferences.push({
      category: 'Billing Model',
      myProduct: myIsOneTime ? 'One-time perpetual license' : myPlans.length > 0 ? 'Subscription model' : 'Not specified',
      competitor: compIsOneTime ? 'One-time perpetual license' : compPlans.length > 0 ? 'Subscription model' : 'Not specified',
      difference:
        myIsOneTime && !compIsOneTime
          ? 'My product uses perpetual licensing vs competitor recurring subscription'
          : !myIsOneTime && compIsOneTime
          ? 'My product uses recurring SaaS subscription vs competitor one-time license'
          : myIsOneTime && compIsOneTime
          ? 'Both products offer one-time perpetual licenses'
          : 'Both products operate recurring subscription tiers',
    })
  } else {
    pricingDifferences.push({
      category: 'Starting Tier',
      myProduct: 'Not found on website',
      competitor: 'Not found on website',
      difference: 'No public pricing plans detected on either website',
    })
  }

  // 3. Free Plan & Trial Diffing
  const freePlanComparison = {
    myProduct: myProduct.hasFreePlan,
    competitor: competitor.hasFreePlan,
    notes:
      myProduct.hasFreePlan && !competitor.hasFreePlan
        ? 'My SaaS offers a free plan; competitor does not publicly list a free plan.'
        : !myProduct.hasFreePlan && competitor.hasFreePlan
        ? 'Competitor offers a free plan; my SaaS does not list a free plan.'
        : myProduct.hasFreePlan && competitor.hasFreePlan
        ? 'Both products offer a free tier.'
        : 'Neither product advertises a free plan on their landing page.',
  }

  const trialComparison = {
    myProduct: myProduct.hasFreeTrial ? myProduct.freeTrialDetails : 'Not found',
    competitor: competitor.hasFreeTrial ? competitor.freeTrialDetails : 'Not found',
    notes:
      myProduct.hasFreeTrial && !competitor.hasFreeTrial
        ? 'My SaaS advertises a free trial, lowering initial adoption barrier.'
        : !myProduct.hasFreeTrial && competitor.hasFreeTrial
        ? `Competitor offers ${competitor.freeTrialDetails}, potentially reducing sign-up friction.`
        : 'Trial status is comparable across both websites.',
  }

  // 4. Target Audience Diffing
  const myTargetCust = myProduct.targetCustomers || []
  const compTargetCust = competitor.targetCustomers || []
  const targetAudienceDifferences = {
    myProduct: myTargetCust,
    competitor: compTargetCust,
    differences: `My SaaS targets: ${myTargetCust.join(', ') || 'General B2B'}. Competitor targets: ${compTargetCust.join(', ') || 'General B2B'}.`,
  }

  // 5. Positioning Comparison
  const myPosClaims = myProduct.positioningClaims || []
  const compPosClaims = competitor.positioningClaims || []
  const positioningDifferences = {
    myProductHeadline: myPosClaims[0] || myProduct.websiteTitle || (myProduct as any).title || 'Core functionality',
    competitorHeadline: compPosClaims[0] || competitor.websiteTitle || (competitor as any).title || 'Core functionality',
    summary: `My SaaS communicates: "${myPosClaims[0] || myProduct.websiteTitle || 'Core functionality'}". Competitor communicates: "${compPosClaims[0] || competitor.websiteTitle || 'Core functionality'}".`,
  }

  // 6. Strengths, Gaps, and Advantages
  const myStrengths: string[] = []
  const competitorStrengths: string[] = []
  const productGaps: string[] = []
  const pricingAdvantages: string[] = []
  const improvementAreas: string[] = []
  const importantRisks: string[] = []

  // Check pricing advantage
  if (myMinPrice !== null && compMinPrice !== null && myMinPrice < compMinPrice) {
    myStrengths.push(`Lower starting price point ($${myMinPrice}/mo vs $${compMinPrice}/mo)`)
    pricingAdvantages.push(`Price advantage: $${compMinPrice - myMinPrice}/mo lower base entry tier`)
  } else if (myMinPrice !== null && compMinPrice !== null && compMinPrice < myMinPrice) {
    competitorStrengths.push(`Lower starting price point ($${compMinPrice}/mo vs $${myMinPrice}/mo)`)
    importantRisks.push(`Competitor undercuts your starting tier by $${myMinPrice - compMinPrice}/mo`)
  }

  // Check free trial advantage
  if (myProduct.hasFreeTrial && !competitor.hasFreeTrial) {
    myStrengths.push('Offers free trial without upfront commitment')
  } else if (!myProduct.hasFreeTrial && competitor.hasFreeTrial) {
    competitorStrengths.push(`Offers ${competitor.freeTrialDetails} to prospects`)
    improvementAreas.push('Consider offering a self-serve trial to match competitor conversion flow')
  }

  // Check integrations advantage
  const myIntegrations = myProduct.integrations || []
  const compIntegrations = competitor.integrations || []
  if (myIntegrations.length > compIntegrations.length) {
    myStrengths.push(`Broader integration ecosystem (${myIntegrations.length} vs ${compIntegrations.length} detected)`)
  } else if (compIntegrations.length > myIntegrations.length) {
    competitorStrengths.push(`Broader integration ecosystem (${compIntegrations.length} integrations detected)`)
    productGaps.push(`Competitor advertises integrations you do not list: ${compIntegrations.filter((i) => !myIntegrations.includes(i)).join(', ')}`)
  }

  // Exclusive features as gaps and strengths
  if (competitorExclusiveFeatures.length > 0) {
    productGaps.push(...competitorExclusiveFeatures.slice(0, 4).map((f) => `Competitor offers: "${f}"`))
    improvementAreas.push(`Evaluate roadmap inclusion for: ${competitorExclusiveFeatures.slice(0, 3).join(', ')}`)
  }
  if (myExclusiveFeatures.length > 0) {
    myStrengths.push(...myExclusiveFeatures.slice(0, 3).map((f) => `Exclusive feature: "${f}"`))
  }

  // 7. Deterministic Rule-Based Recommendations Generation
  const recommendations: RuleRecommendation[] = []

  // RULE 1: Competitor has free trial and my SaaS does not
  if (!myProduct.hasFreeTrial && competitor.hasFreeTrial) {
    recommendations.push({
      id: 'rule_free_trial',
      title: 'Evaluate Introducing a Self-Serve Free Trial',
      reason: 'Competitor allows prospects to test the product with a free trial, lowering adoption friction.',
      evidence: `Competitor explicitly advertises: "${competitor.freeTrialDetails}" on their website.`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'high',
      confidence: 0.92,
      ruleTriggered: 'IF competitor has free trial AND my SaaS does not',
      suggestedAction: 'Add a 14-day free trial CTA on your hero section to capture high-intent self-serve evaluators.',
    })
  }

  // RULE 2: My SaaS is cheaper than competitor
  if (myMinPrice !== null && compMinPrice !== null && myMinPrice < compMinPrice) {
    const symbol = extractCurrencySymbol(myPlans[0]) || extractCurrencySymbol(compPlans[0]) || '$'
    recommendations.push({
      id: 'rule_pricing_advantage',
      title: 'Highlight Value & Price Advantage in Landing Page Copy',
      reason: 'Your starting plan is more economical than the competitor, presenting a direct cost-saving differentiator.',
      evidence: `My product starts at ${symbol}${myMinPrice.toLocaleString()} vs competitor at ${symbol}${compMinPrice.toLocaleString()} (Savings: ${symbol}${(compMinPrice - myMinPrice).toLocaleString()}).`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'high',
      confidence: 0.95,
      ruleTriggered: 'IF my product starting price < competitor starting price',
      suggestedAction: `Add a comparison banner: "Enterprise-grade quality at a fraction of the cost. Starts at ${symbol}${myMinPrice.toLocaleString()} vs ${symbol}${compMinPrice.toLocaleString()} competitor pricing."`,
    })
  }

  // RULE 2B: Price Parity Scenario
  if (myMinPrice !== null && compMinPrice !== null && Math.abs(myMinPrice - compMinPrice) < 5) {
    const symbol = extractCurrencySymbol(myPlans[0]) || extractCurrencySymbol(compPlans[0]) || '$'
    recommendations.push({
      id: 'rule_price_parity',
      title: 'Differentiate on Value & After-Sales Assurance to Break Price Parity',
      reason: 'Both products are positioned at identical price points. In price-parity situations, buyers look at warranty terms, bundled accessories, and verified build quality to decide.',
      evidence: `Both products are listed at ${symbol}${myMinPrice.toLocaleString()}.`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'high',
      confidence: 0.92,
      ruleTriggered: 'IF my product starting price == competitor starting price',
      suggestedAction: 'Emphasize your exclusive capabilities, superior build materials, and official replacement warranty in hero comparison copy.',
    })
  }

  // RULE 2C: Competitor is cheaper (Premium Positioning)
  if (myMinPrice !== null && compMinPrice !== null && myMinPrice > compMinPrice) {
    const symbol = extractCurrencySymbol(myPlans[0]) || extractCurrencySymbol(compPlans[0]) || '$'
    recommendations.push({
      id: 'rule_premium_positioning',
      title: 'Justify Premium Tiering with Superior Build and Performance Metrics',
      reason: 'Competitor enters the market at a lower price point. Defend your margin by showcasing superior durability, reliability, and flagship specifications.',
      evidence: `My product starts at ${symbol}${myMinPrice.toLocaleString()} vs competitor starting at ${symbol}${compMinPrice.toLocaleString()}.`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'high',
      confidence: 0.90,
      ruleTriggered: 'IF my product starting price > competitor starting price',
      suggestedAction: 'Add transparent side-by-side spec comparison highlighting where competitor compromises on components, materials, or support.',
    })
  }

  // RULE 3: Competitor has exclusive features
  if (competitorExclusiveFeatures.length > 0) {
    const topGap = competitorExclusiveFeatures[0]
    recommendations.push({
      id: 'rule_feature_gap',
      title: `Assess Feature Parity: "${topGap.slice(0, 50)}"`,
      reason: 'Competitor actively markets capabilities that are not prominently featured on your website.',
      evidence: `Competitor website prominently lists: "${topGap}" in their product specifications.`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'medium',
      confidence: 0.88,
      ruleTriggered: 'IF competitor lists feature that my SaaS does not have',
      suggestedAction: 'Audit whether your engineering team can prioritize this feature or if your website copy should clarify your alternative approach.',
    })
  }

  // RULE 3B: My Product has Exclusive Features
  if (myExclusiveFeatures.length > 0) {
    const topFeature = myExclusiveFeatures[0]
    recommendations.push({
      id: 'rule_exclusive_feature_spotlight',
      title: `Lead with Signature Differentiator: "${topFeature.slice(0, 50)}"`,
      reason: 'Your product possesses verified capabilities that the competitor does not advertise.',
      evidence: `Competitor listing does not advertise: "${topFeature}".`,
      sourceUrl: myProduct.normalizedUrl,
      priority: 'high',
      confidence: 0.94,
      ruleTriggered: 'IF my product has exclusive verified features',
      suggestedAction: `Spotlight "${topFeature}" prominently on your hero section and marketing copy as your signature competitive moat.`,
    })
  }

  // RULE 4: Competitor lists more integrations
  const missingIntegrations = (competitor.integrations || []).filter((i) => !(myProduct.integrations || []).includes(i))
  if (missingIntegrations.length > 0) {
    recommendations.push({
      id: 'rule_integrations_gap',
      title: `Display Key Ecosystem Integrations (${missingIntegrations.slice(0, 3).join(', ')})`,
      reason: 'B2B SaaS buyers prioritize tools that plug directly into their existing software stack.',
      evidence: `Competitor lists integrations with: ${missingIntegrations.slice(0, 3).join(', ')}.`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'medium',
      confidence: 0.85,
      ruleTriggered: 'IF competitor connects with ecosystem tools missing from my SaaS',
      suggestedAction: `If you already support ${missingIntegrations[0]}, add their logo to your homepage. If not, consider adding webhook support.`,
    })
  }

  // RULE 5: Competitor has a public changelog and my SaaS does not
  if (competitor.changelogLink !== 'Not found on the provided website' && myProduct.changelogLink === 'Not found on the provided website') {
    recommendations.push({
      id: 'rule_changelog',
      title: 'Publish a Public Product Changelog to Signal Shipping Velocity',
      reason: 'Public changelogs build buyer trust and demonstrate continuous product improvements.',
      evidence: `Competitor maintains an active public changelog at: ${competitor.changelogLink}.`,
      sourceUrl: competitor.changelogLink,
      priority: 'low',
      confidence: 0.80,
      ruleTriggered: 'IF competitor maintains public changelog AND my SaaS lacks one',
      suggestedAction: 'Launch a simple public /changelog page or RSS feed sharing bi-weekly feature updates.',
    })
  }

  // RULE 6: Social Proof & Customer Reviews Leverage
  const compReviews = competitor.envatoSales?.review_count || competitor.envatoSales?.comment_count || 0
  const compRating = competitor.envatoSales?.rating || 0
  if (compRating >= 4.0 || compReviews > 0) {
    recommendations.push({
      id: 'rule_social_proof',
      title: 'Leverage Verified Ratings and Customer Proof on Landing Pages',
      reason: 'Competitor product leverages social proof to build purchase confidence.',
      evidence: `Competitor displays a ${compRating ? `${compRating} ★ rating` : 'public review score'} across verified customer purchases.`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'medium',
      confidence: 0.88,
      ruleTriggered: 'IF competitor leverages public customer reviews and social proof',
      suggestedAction: 'Incorporate verified customer satisfaction quotes, unboxing reviews, and verified badges right next to the primary purchase CTA.',
    })
  }

  // RULE 7: Persona & Target Audience Sharpening
  if (myTargetCust.length > 0) {
    recommendations.push({
      id: 'rule_persona_targeting',
      title: `Tailor Value Proposition Specifically for ${myTargetCust[0]}`,
      reason: 'Directing product positioning toward a well-defined audience creates higher conversion than generic marketing.',
      evidence: `Identified target customer segment: ${myTargetCust.slice(0, 2).join(', ')}.`,
      sourceUrl: myProduct.normalizedUrl,
      priority: 'medium',
      confidence: 0.86,
      ruleTriggered: 'IF target audience segments are identified',
      suggestedAction: `Refine headlines and feature callouts specifically addressing daily workflows and priorities of ${myTargetCust[0]}.`,
    })
  }

  return {
    comparison: {
      myExclusiveFeatures,
      competitorExclusiveFeatures,
      sharedFeatures,
      pricingDifferences,
      freePlanComparison,
      trialComparison,
      targetAudienceDifferences,
      positioningDifferences,
      myStrengths,
      competitorStrengths,
      productGaps,
      pricingAdvantages,
      improvementAreas,
      importantRisks,
    },
    recommendations,
  }
}

const STOP_WORDS = new Set([
  'and',
  'with',
  'for',
  'the',
  'from',
  'system',
  'management',
  'application',
  'solution',
  'features',
  'module',
  'tool',
  'app',
  'platform',
  'service',
  'user',
  'users',
  'online',
  'advanced',
  'built',
  'easy',
])

export function isSimilarFeatureText(a?: string, b?: string): boolean {
  if (!a || !b) return false
  const cleanA = a.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ')
  const cleanB = b.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ')

  if (cleanA === cleanB) return true
  if (cleanA.length > 20 && cleanB.length > 20) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true
  }

  // 1. Semantic Vector Cosine Similarity
  const vA = vectorProvider.embedSingle(a)
  const vB = vectorProvider.embedSingle(b)
  const sim = cosineSimilarity(vA, vB)

  // 2. Informative Token Overlap (filtering generic stop words)
  const tokensA = cleanA.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  const tokensB = cleanB.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w))

  if (tokensA.length === 0 || tokensB.length === 0) {
    return sim >= 0.72
  }

  const setB = new Set(tokensB)
  let informativeMatches = 0
  for (const t of tokensA) {
    if (setB.has(t)) informativeMatches++
  }

  const minTokens = Math.min(tokensA.length, tokensB.length)
  const tokenOverlapRatio = informativeMatches / minTokens

  // Require true semantic vector proximity and informative token overlap
  if (sim >= 0.65 && tokenOverlapRatio >= 0.5) return true
  if (sim >= 0.78) return true
  if (tokenOverlapRatio >= 0.75 && sim >= 0.50) return true

  return false
}

function formatPlanLabel(plan?: PricingPlanExtracted): string {
  if (!plan) return 'Not publicly listed'
  const name = plan.name || 'Plan'
  const price = plan.priceMonthly || (plan as any).price || plan.priceAnnual || 'Custom'
  return `${name} (${price})`
}

function extractNumericPrice(plan?: PricingPlanExtracted | null): number | null {
  if (!plan) return null
  const priceStr = plan.priceMonthly || (plan as any).price || plan.priceAnnual || ''
  if (typeof priceStr === 'string') {
    const cleaned = priceStr.replace(/,/g, '')
    const match = cleaned.match(/(?:[\$€£₹]|Rs\.?)\s*([0-9]+(?:\.[0-9]{2})?)/i) || cleaned.match(/([0-9]+(?:\.[0-9]{2})?)/)
    if (match) {
      return parseFloat(match[1])
    }
  }
  return null
}

function extractCurrencySymbol(plan?: PricingPlanExtracted | null): string {
  if (!plan) return '$'
  const priceStr = plan.priceMonthly || (plan as any).price || plan.priceAnnual || ''
  if (priceStr.includes('₹') || /Rs\.?/i.test(priceStr)) return '₹'
  if (priceStr.includes('€')) return '€'
  if (priceStr.includes('£')) return '£'
  return '$'
}
