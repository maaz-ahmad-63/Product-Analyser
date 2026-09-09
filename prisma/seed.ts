import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding SaaS Growth Agent database...')

  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.backgroundJob.deleteMany()
  await prisma.integration.deleteMany()
  await prisma.outreachEvent.deleteMany()
  await prisma.outreachDraft.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.customerOpportunity.deleteMany()
  await prisma.recommendationOutcome.deleteMany()
  await prisma.recommendation.deleteMany()
  await prisma.productAnalysis.deleteMany()
  await prisma.changeEvent.deleteMany()
  await prisma.sentimentAnalysis.deleteMany()
  await prisma.publicComment.deleteMany()
  await prisma.review.deleteMany()
  await prisma.priceHistory.deleteMany()
  await prisma.feature.deleteMany()
  await prisma.pricingPlan.deleteMany()
  await prisma.competitorSnapshot.deleteMany()
  await prisma.productSnapshot.deleteMany()
  await prisma.source.deleteMany()
  await prisma.competitor.deleteMany()
  await prisma.saaSProduct.deleteMany()
  await prisma.tenantUser.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Demo User
  const passwordHash = await hash('password123', 12)
  const user = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'founder@acmeanalytics.io',
      passwordHash,
      role: 'user',
      authProvider: 'credentials',
    },
  })

  // 2. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Acme Analytics',
      slug: 'acme-analytics',
      ownerId: user.id,
      status: 'active',
      plan: 'growth',
      settings: {
        currency: 'USD',
        notifications: { email: true, inApp: true },
        monitoringCadenceHours: 12,
      },
    },
  })

  // 3. Link User to Tenant
  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'owner',
    },
  })

  // 4. Create Own SaaS Product
  const ownProduct = await prisma.saaSProduct.create({
    data: {
      tenantId: tenant.id,
      name: 'Acme Analytics',
      websiteUrl: 'https://acmeanalytics.io',
      description: 'Privacy-first, predictable-pricing product analytics for B2B SaaS and high-volume web applications.',
      targetAudience: 'B2B SaaS Founders, Growth Leads, Product Managers',
      status: 'active',
    },
  })

  // 5. Create Monitored Competitors
  const mixpanel = await prisma.competitor.create({
    data: {
      tenantId: tenant.id,
      name: 'Mixpanel',
      websiteUrl: 'https://mixpanel.com',
      description: 'Self-serve product analytics solution that helps teams analyze user behavior and conversion funnels.',
      status: 'active',
      confirmed: true,
    },
  })

  const amplitude = await prisma.competitor.create({
    data: {
      tenantId: tenant.id,
      name: 'Amplitude',
      websiteUrl: 'https://amplitude.com',
      description: 'Digital analytics platform providing product intelligence, experimentation, and session replay.',
      status: 'active',
      confirmed: true,
    },
  })

  const posthog = await prisma.competitor.create({
    data: {
      tenantId: tenant.id,
      name: 'PostHog',
      websiteUrl: 'https://posthog.com',
      description: 'All-in-one developer platform with product analytics, session recording, feature flags, and A/B testing.',
      status: 'active',
      confirmed: true,
    },
  })

  // 6. Sources for Acme and Competitors
  const sourceMixpanelPricing = await prisma.source.create({
    data: {
      tenantId: tenant.id,
      competitorId: mixpanel.id,
      url: 'https://mixpanel.com/pricing',
      sourceType: 'pricing_page',
      accessMethod: 'http',
      permissionStatus: 'permitted',
      collectionStatus: 'success',
      monitoringFrequencyHours: 12,
      lastCollectedAt: new Date(Date.now() - 4 * 3600 * 1000),
    },
  })

  const sourceMixpanelReviews = await prisma.source.create({
    data: {
      tenantId: tenant.id,
      competitorId: mixpanel.id,
      url: 'https://www.g2.com/products/mixpanel/reviews',
      sourceType: 'review_site',
      provider: 'g2',
      accessMethod: 'http',
      permissionStatus: 'permitted',
      collectionStatus: 'success',
      monitoringFrequencyHours: 24,
      lastCollectedAt: new Date(Date.now() - 8 * 3600 * 1000),
    },
  })

  const sourcePosthogChangelog = await prisma.source.create({
    data: {
      tenantId: tenant.id,
      competitorId: posthog.id,
      url: 'https://posthog.com/changelog',
      sourceType: 'changelog',
      accessMethod: 'rss',
      permissionStatus: 'permitted',
      collectionStatus: 'success',
      monitoringFrequencyHours: 24,
      lastCollectedAt: new Date(Date.now() - 14 * 3600 * 1000),
    },
  })

  // 7. Pricing Plans
  await prisma.pricingPlan.createMany({
    data: [
      {
        tenantId: tenant.id,
        productId: ownProduct.id,
        planName: 'Starter',
        price: 29.00,
        billingPeriod: 'monthly',
        currency: 'USD',
        features: ['Up to 100k events/mo', 'Unlimited seats', 'Core Funnel analysis', 'Community support'],
      },
      {
        tenantId: tenant.id,
        productId: ownProduct.id,
        planName: 'Growth (Flat Rate)',
        price: 99.00,
        billingPeriod: 'monthly',
        currency: 'USD',
        isPopular: true,
        features: ['Up to 1M events/mo', 'No event overage fees', 'Retention cohorts', 'Slack alerts', 'Priority email support'],
      },
      {
        tenantId: tenant.id,
        competitorId: mixpanel.id,
        planName: 'Growth',
        price: 35.00,
        billingPeriod: 'monthly',
        currency: 'USD',
        features: ['Usage-based scaling', 'Custom dashboarding', 'Modeling & formulas'],
      },
      {
        tenantId: tenant.id,
        competitorId: mixpanel.id,
        planName: 'Enterprise',
        price: 833.00,
        billingPeriod: 'monthly',
        currency: 'USD',
        features: ['SSO & SAML', 'Advanced access controls', 'Dedicated CSM'],
      },
    ],
  })

  // 8. Detected Change Events
  await prisma.changeEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        ownerType: 'competitor',
        ownerId: mixpanel.id,
        changeType: 'pricing',
        previousValue: '$25/mo for Growth Base Tier',
        newValue: '$35/mo for Growth Base Tier with added event limits',
        importance: 'high',
        sourceUrl: 'https://mixpanel.com/pricing',
        detectedAt: new Date(Date.now() - 4 * 3600 * 1000),
      },
      {
        tenantId: tenant.id,
        ownerType: 'competitor',
        ownerId: posthog.id,
        changeType: 'features',
        previousValue: 'Manual session replay inspection',
        newValue: 'Autonomous AI Session Replay Summaries',
        importance: 'medium',
        sourceUrl: 'https://posthog.com/changelog',
        detectedAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
    ],
  })

  // 9. Customer Opportunities
  const comment1 = await prisma.publicComment.create({
    data: {
      tenantId: tenant.id,
      competitorId: mixpanel.id,
      sourceId: sourceMixpanelReviews.id,
      commentText: 'Mixpanel just hit us with a surprise $1,400 bill for sudden event volume spikes during our ProductHunt launch. We need a SaaS with predictable flat-rate pricing.',
      sourceUrl: 'https://reddit.com/r/SaaS/comments/mixpanel_pricing_spike',
      authorReference: 'saas_cto_99',
      permissionStatus: 'public',
      collectedAt: new Date(Date.now() - 12 * 3600 * 1000),
    },
  })

  await prisma.sentimentAnalysis.create({
    data: {
      tenantId: tenant.id,
      commentId: comment1.id,
      sentiment: 'negative',
      confidence: 0.96,
      complaintCategory: 'pricing',
      customerIntent: 'seeking_alternative',
      topics: ['overage_fees', 'pricing_spikes', 'unpredictable_bills'],
      summary: 'Customer frustrated by unexpected overage billing during traffic surges; actively seeking predictable alternative.',
    },
  })

  const opportunity1 = await prisma.customerOpportunity.create({
    data: {
      tenantId: tenant.id,
      competitorId: mixpanel.id,
      sourceId: sourceMixpanelReviews.id,
      publicCommentId: comment1.id,
      complaintCategory: 'pricing',
      customerIntent: 'seeking_alternative',
      opportunityScore: 0.94,
      relevanceReason: 'Acme Analytics has predictable flat-rate monthly pricing with zero surge penalties.',
      suggestedValueProposition: 'Predictable $99/mo analytics with no surprise overage invoices when your product goes viral.',
      suggestedOffer: 'Extended 30-day trial + free onboarding migration assistance.',
      status: 'awaiting_approval',
    },
  })

  // 10. Outreach Draft
  await prisma.outreachDraft.create({
    data: {
      tenantId: tenant.id,
      opportunityId: opportunity1.id,
      channel: 'public_reply',
      message: 'Hey there — saw your post about surprise overage bills. We built Acme Analytics specifically so founders never get hit with variable surge penalties ($99/mo flat with unlimited team seats). Happy to set you up with a free 30-day extended trial and import your funnel definitions if you want to test it.',
      approvalStatus: 'pending',
    },
  })

  // 11. Recommendations
  await prisma.recommendation.createMany({
    data: [
      {
        tenantId: tenant.id,
        productId: ownProduct.id,
        type: 'pricing',
        title: 'Highlight "No Surprise Overage Invoices" Above The Fold on Pricing Page',
        problem: 'SaaS buyers are actively churning from competitors due to unpredictable bill spikes during customer traffic bursts.',
        reason: 'Mixpanel raised prices and their customer dissatisfaction on Reddit and G2 regarding overage has spiked 38% this month.',
        suggestedAction: 'Add a comparison callout banner: "Flat-rate pricing. Never get penalized for going viral."',
        priority: 'critical',
        confidence: 'high',
        expectedImpact: 'Estimated 15-25% increase in landing page trial signups from dissatisfied competitor switchers.',
        status: 'accepted',
      },
      {
        tenantId: tenant.id,
        productId: ownProduct.id,
        type: 'feature',
        title: 'Add Segment / RudderStack One-Click Integration Destination',
        problem: 'Migration friction is the #1 objection for leads considering switching from Amplitude or Mixpanel.',
        reason: 'Competitor users want plug-and-play event streaming without changing their tracking instrumentation.',
        suggestedAction: 'Prioritize Segment destination connector in next two-week sprint.',
        priority: 'high',
        confidence: 'high',
        expectedImpact: 'Reduces trial-to-active onboarding dropoff from 40% to under 15%.',
        status: 'in_progress',
      },
    ],
  })

  console.log('Seeding completed successfully!')
  console.log('Login credentials: founder@acmeanalytics.io / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
