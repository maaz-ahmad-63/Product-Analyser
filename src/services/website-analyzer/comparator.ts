import {
  ExtractedProductData,
  ProductComparison,
  RuleRecommendation,
} from './types'

export function compareProducts(
  myProduct: ExtractedProductData,
  competitor: ExtractedProductData
): {
  comparison: ProductComparison
  recommendations: RuleRecommendation[]
} {
  // 1. Feature Diffing (case-insensitive substring normalization)
  const myFeatures = myProduct.features || []
  const compFeatures = competitor.features || []

  const sharedFeatures: string[] = []
  const myExclusiveFeatures: string[] = []
  const competitorExclusiveFeatures: string[] = []

  // Check my features against competitor features
  for (const mf of myFeatures) {
    const isShared = compFeatures.some((cf) => isSimilarText(mf, cf))
    if (isShared) {
      if (!sharedFeatures.includes(mf)) sharedFeatures.push(mf)
    } else {
      myExclusiveFeatures.push(mf)
    }
  }

  // Check competitor features against my features
  for (const cf of compFeatures) {
    const isShared = myFeatures.some((mf) => isSimilarText(cf, mf))
    if (!isShared && !competitorExclusiveFeatures.includes(cf)) {
      competitorExclusiveFeatures.push(cf)
    }
  }

  // 2. Pricing Comparison Table
  const pricingDifferences: Array<{
    category: string
    myProduct: string
    competitor: string
    difference: string
  }> = []

  const myMinPrice = extractNumericPrice(myProduct.pricingPlans)
  const compMinPrice = extractNumericPrice(competitor.pricingPlans)

  if (myProduct.pricingPlans.length > 0 || competitor.pricingPlans.length > 0) {
    const myFirstPlan = myProduct.pricingPlans[0]
    const compFirstPlan = competitor.pricingPlans[0]

    let diffText = 'Prices not directly comparable'
    if (myMinPrice !== null && compMinPrice !== null) {
      const delta = myMinPrice - compMinPrice
      if (delta < 0) {
        diffText = `My SaaS is $${Math.abs(delta)} cheaper per month`
      } else if (delta > 0) {
        diffText = `Competitor is $${delta} cheaper per month`
      } else {
        diffText = 'Same starting price'
      }
    }

    pricingDifferences.push({
      category: 'Starting Plan',
      myProduct: myFirstPlan ? `${myFirstPlan.name || 'Regular'} (${myFirstPlan.priceMonthly || (myFirstPlan as any).price || 'Not specified'})` : 'Not found on website',
      competitor: compFirstPlan ? `${compFirstPlan.name || 'Regular'} (${compFirstPlan.priceMonthly || (compFirstPlan as any).price || 'Not specified'})` : 'Not found on website',
      difference: diffText,
    })
  } else {
    pricingDifferences.push({
      category: 'Starting Plan',
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
  const targetAudienceDifferences = {
    myProduct: myProduct.targetCustomers,
    competitor: competitor.targetCustomers,
    differences: `My SaaS targets: ${myProduct.targetCustomers.join(', ') || 'General B2B'}. Competitor targets: ${competitor.targetCustomers.join(', ') || 'General B2B'}.`,
  }

  // 5. Positioning Comparison
  const positioningDifferences = {
    myProductHeadline: myProduct.positioningClaims[0] || myProduct.websiteTitle,
    competitorHeadline: competitor.positioningClaims[0] || competitor.websiteTitle,
    summary: `My SaaS communicates: "${myProduct.positioningClaims[0] || 'Core functionality'}". Competitor communicates: "${competitor.positioningClaims[0] || 'Core functionality'}".`,
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
  if (myProduct.integrations.length > competitor.integrations.length) {
    myStrengths.push(`Broader integration ecosystem (${myProduct.integrations.length} vs ${competitor.integrations.length} detected)`)
  } else if (competitor.integrations.length > myProduct.integrations.length) {
    competitorStrengths.push(`Broader integration ecosystem (${competitor.integrations.length} integrations detected)`)
    productGaps.push(`Competitor advertises integrations you do not list: ${competitor.integrations.filter((i) => !myProduct.integrations.includes(i)).join(', ')}`)
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
    recommendations.push({
      id: 'rule_pricing_advantage',
      title: 'Highlight Value & Price Advantage in Landing Page Copy',
      reason: 'Your starting plan is more economical than the competitor, presenting a direct cost-saving differentiator.',
      evidence: `My SaaS starts at $${myMinPrice}/mo vs competitor at $${compMinPrice}/mo (Savings: $${compMinPrice - myMinPrice}/mo).`,
      sourceUrl: competitor.normalizedUrl,
      priority: 'high',
      confidence: 0.95,
      ruleTriggered: 'IF my SaaS starting price < competitor starting price',
      suggestedAction: 'Add a comparison banner: "Enterprise-grade features at a fraction of the cost. Starts at $' + myMinPrice + '/mo vs $' + compMinPrice + '/mo competitor pricing."',
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

  // RULE 4: Competitor lists more integrations
  const missingIntegrations = competitor.integrations.filter((i) => !myProduct.integrations.includes(i))
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

function isSimilarText(a?: string, b?: string): boolean {
  if (!a || !b) return false
  const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, ' ')
  const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, ' ')

  if (cleanA === cleanB) return true
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true

  // Word overlap ratio
  const wordsA = new Set(cleanA.split(/\s+/).filter((w) => w.length > 3))
  const wordsB = new Set(cleanB.split(/\s+/).filter((w) => w.length > 3))

  let matches = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) matches++
  })

  return matches >= 2
}

function extractNumericPrice(plans: Array<{ priceMonthly?: string; price?: string; priceAnnual?: string }>): number | null {
  if (!plans || !Array.isArray(plans) || plans.length === 0) return null
  for (const p of plans) {
    if (!p) continue
    const priceStr = p.priceMonthly || (p as any).price || p.priceAnnual || ''
    if (typeof priceStr === 'string') {
      const match = priceStr.match(/\$([0-9]+)/)
      if (match) {
        return parseInt(match[1], 10)
      }
    }
  }
  return null
}
