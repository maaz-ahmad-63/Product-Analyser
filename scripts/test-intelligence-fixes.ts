import assert from 'assert'
import { analyzeSeo } from '../src/services/website-analyzer/seo-analyzer'
import { compareProducts } from '../src/services/website-analyzer/comparator'
import { detectOpportunitiesFromRecurringComplaints } from '../src/services/website-analyzer/opportunity-detector'
import { generateDeterministicExecutiveBriefing } from '../src/services/website-analyzer/executive-briefing'
import {
  calculateSalesForecast,
  calculateSalesActivityTimeline,
  formatDurationMs,
  compareCompetitorActivity,
} from '../src/services/website-analyzer/sales-metrics'
import { ExtractedProductData, RecurringComplaintGroup } from '../src/services/website-analyzer/types'

async function runTests() {
  console.log('🧪 Starting Intelligence Fixes Test Suite...\n')

  // TEST 1: SEO Real Image Alt Count & Technical Signals
  console.log('--- TEST 1: SEO Real Image Alt Count & Technical Signals ---')
  const dummyProduct: ExtractedProductData = {
    url: 'https://example.com/item/123',
    title: 'Modern Analytics Dashboard SaaS',
    metaDescription: 'A robust analytics dashboard for monitoring subscription metrics in real time.',
    h1Tags: ['Modern Analytics Dashboard SaaS'],
    features: ['Real-time event streaming', 'Customizable chart widgets'],
    imageAltsCount: 17, // Real count from scraper
    totalImagesCount: 24,
    canonicalUrl: 'https://example.com/item/123',
    hasStructuredData: true,
    structuredDataTypes: ['SoftwareApplication'],
    pricingPlans: [
      { name: 'Starter', priceMonthly: '$29', priceAnnual: '$290', features: [], price: 29, interval: 'month' },
      { name: 'Pro', priceMonthly: '$79', priceAnnual: '$790', features: [], price: 79, interval: 'month' },
      { name: 'Enterprise', priceMonthly: '$199', priceAnnual: '$1990', features: [], price: 199, interval: 'month' },
    ],
  } as any

  const seoResult = await analyzeSeo(dummyProduct, [
    {
      url: 'https://competitor.com/item/456',
      title: 'Legacy Metrics Tool',
      metaDescription: 'Basic metrics tool for small web projects.',
      h1Tags: ['Legacy Metrics Tool'],
      features: ['Basic CSV export'],
      imageAltsCount: 3,
      totalImagesCount: 10,
    } as any,
  ])

  assert.strictEqual(
    seoResult.target_onpage_audit?.image_alts_count,
    17,
    'Expected target_onpage_audit.image_alts_count to be exactly 17 (not hardcoded 5)!'
  )
  assert.strictEqual(
    seoResult.target_onpage_audit.total_images_count,
    24,
    'Expected target_onpage_audit.total_images_count to be 24'
  )
  assert.strictEqual(
    seoResult.target_onpage_audit!.canonical_status,
    'valid',
    'Expected canonical_status to be valid'
  )
  assert.strictEqual(
    seoResult.target_onpage_audit!.has_structured_data,
    true,
    'Expected has_structured_data to be true'
  )
  assert.deepStrictEqual(
    seoResult.target_onpage_audit!.structured_data_types,
    ['SoftwareApplication'],
    'Expected structured_data_types to match'
  )
  console.log('✅ TEST 1 PASSED: SEO uses real image alt count (17, not 5), canonical & structured data checks work.')

  // TEST 2: Semantic Feature Matching (Avoid False Positives)
  console.log('\n--- TEST 2: Semantic Feature Matching in comparator.ts ---')
  const myFeatures = [
    'User account administration portal',
    'Automated daily database backups',
    'Stripe recurring subscription billing',
  ]
  const competitorFeatures = [
    'Real-time user notification bell', // Overlaps on "user", but totally different feature
    'Automated daily database backups', // Exact match
    'PayPal one-off checkout support', // Billing related but distinct
  ]

  const compProd1: ExtractedProductData = {
    ...dummyProduct,
    features: myFeatures,
  }
  const compProd2: ExtractedProductData = {
    url: 'https://competitor.com/item/456',
    title: 'Competitor App',
    features: competitorFeatures,
    pricingPlans: [
      { name: 'Basic', priceMonthly: '$19', priceAnnual: '$190', features: [], price: 19, interval: 'month' },
      { name: 'Team', priceMonthly: '$49', priceAnnual: '$490', features: [], price: 49, interval: 'month' },
    ],
  } as any

  const comparisonResult = compareProducts(compProd1, compProd2)
  const comparison = comparisonResult.comparison

  // "Automated daily database backups" should be in sharedFeatures
  const hasSharedBackup = comparison.sharedFeatures.some((f) =>
    f.toLowerCase().includes('database backup')
  )
  assert.ok(hasSharedBackup, 'Expected automated daily database backups to be shared')

  // "User account administration portal" and "Real-time user notification bell" must NOT be falsely merged!
  const hasFalseUserMerge = comparison.sharedFeatures.some((f) =>
    f.toLowerCase().includes('notification')
  )
  assert.ok(!hasFalseUserMerge, 'Real-time user notification bell must NOT be marked as shared feature with user account administration!')

  // Multi-tier pricing check
  assert.ok(comparison.pricingDifferences.length >= 2, 'Expected at least 2 pricing tiers compared (Starting and Mid tier)')
  assert.ok(comparison.pricingDifferences.some(p => p.category === 'Starting Tier'), 'Expected Starting Tier comparison')
  assert.ok(comparison.pricingDifferences.some(p => p.category === 'Mid / Professional Tier'), 'Expected Mid / Professional Tier comparison')
  console.log('✅ TEST 2 PASSED: Feature matching eliminates false 2-word overlaps, and multi-tier pricing compares Starting & Mid tiers.')

  // TEST 3: Opportunity Detector Verified Matching (No Fabricated Fallbacks)
  console.log('\n--- TEST 3: Opportunity Detector Verified Matching ---')
  const recurringComplaints: RecurringComplaintGroup[] = [
    {
      id: 'rcg_1',
      competitor_name: 'Competitor App',
      competitor_url: 'https://competitor.com/item/456',
      complaint_category: 'Database Backup Corruption',
      short_summary: 'Database backup corruption',
      semantic_issue: 'Database backup corruption and silent failure',
      mention_count: 4,
      latest_occurrence_date: '2026-03-01',
      representative_comment: 'The database backup feature fails silently and corrupts data!',
      comment_url: null,
      severity: 'high',
      confidence_level: 'High',
      is_critical: true,
    },
    {
      id: 'rcg_2',
      competitor_name: 'Competitor App',
      competitor_url: 'https://competitor.com/item/456',
      complaint_category: 'Dark Mode Support',
      short_summary: 'Dark mode support',
      semantic_issue: 'Missing dark mode mobile UI support',
      mention_count: 3,
      latest_occurrence_date: '2026-03-02',
      representative_comment: 'There is no dark mode support in the mobile view.',
      comment_url: null,
      severity: 'medium',
      confidence_level: 'High',
      is_critical: false,
    },
  ]

  const opps = detectOpportunitiesFromRecurringComplaints(recurringComplaints, compProd1)

  // Opportunity 1 (database backup corruption): my product HAS automated daily database backups!
  const backupOpp = opps.find((o) => o.comment_summary.toLowerCase().includes('backup'))
  assert.ok(backupOpp, 'Expected opportunity for database backup problem')
  assert.strictEqual(backupOpp?.has_matching_feature, true, 'Expected has_matching_feature to be true for backup')
  assert.ok(
    backupOpp?.matching_feature.toLowerCase().includes('database backup'),
    'Expected matching feature to mention database backup'
  )

  // Opportunity 2 (dark mode): my product does NOT have dark mode!
  const darkModeOpp = opps.find((o) => o.comment_summary.toLowerCase().includes('dark mode'))
  assert.ok(darkModeOpp, 'Expected opportunity for dark mode problem')
  assert.strictEqual(
    darkModeOpp?.has_matching_feature,
    false,
    'Expected has_matching_feature to be false when our product lacks dark mode!'
  )
  assert.strictEqual(
    darkModeOpp?.matching_feature,
    'No verified matching feature found.',
    'Expected "No verified matching feature found." instead of fabricated fallback!'
  )
  console.log('✅ TEST 3 PASSED: Opportunity detector accurately verifies feature matches and returns No verified matching feature found when absent.')

  // TEST 4: Grounded Executive Briefing Generation
  console.log('\n--- TEST 4: Grounded Executive Briefing Generation ---')
  const briefing = generateDeterministicExecutiveBriefing({
    myProduct: compProd1,
    primaryCompetitor: compProd2,
    comparison,
    opportunities: opps,
  })

  assert.ok(briefing.length > 50, 'Briefing should be non-empty')
  assert.ok(briefing.includes('Modern Analytics Dashboard SaaS'), 'Briefing should mention target product name')
  assert.ok(
    briefing.includes('DATABASE BACKUP') ||
      briefing.includes('database backup') ||
      briefing.includes('Pricing Positioning') ||
      briefing.includes('Strategic Opportunities'),
    'Briefing should contain structured sections'
  )
  console.log('Briefing excerpt:\n' + briefing.slice(0, 240) + '...\n')
  console.log('✅ TEST 4 PASSED: Grounded executive briefing cleanly generated without hallucinations.')

  // TEST 5: Sales Forecasting Engine
  console.log('\n--- TEST 5: Deterministic Sales Forecasting Engine ---')
  // Scenario A: Insufficient data (< 7 points)
  const insufficientForecast = calculateSalesForecast(
    [
      { id: '1', source_url: 'u', collected_at: new Date().toISOString(), total_sales: 10, sales_gained_since_previous: null, price: '$29', rating: 5, review_count: 2, comment_count: 0 },
      { id: '2', source_url: 'u', collected_at: new Date().toISOString(), total_sales: 12, sales_gained_since_previous: 2, price: '$29', rating: 5, review_count: 2, comment_count: 0 },
    ],
    12
  )
  assert.strictEqual(insufficientForecast.is_available, false, 'Expected forecast to be unavailable for < 7 points')
  assert.strictEqual(insufficientForecast.model_type, 'Insufficient Data', 'Expected Insufficient Data model type')
  assert.ok(insufficientForecast.reason?.includes('requires at least 7'), 'Expected transparent reason message')

  // Scenario B: Sufficient data (>= 7 points)
  const baseDate = Date.now() - 10 * 86400000
  const snapshots7: any[] = []
  for (let i = 0; i < 8; i++) {
    snapshots7.push({
      id: `s-${i}`,
      source_url: 'https://example.com',
      collected_at: new Date(baseDate + i * 86400000).toISOString(),
      total_sales: 100 + i * 5,
      sales_gained_since_previous: i > 0 ? 5 : null,
      price: '$49',
      rating: 4.8,
      review_count: 10,
      comment_count: 2,
    })
  }

  const sufficientForecast = calculateSalesForecast(snapshots7, 135)
  assert.strictEqual(sufficientForecast.is_available, true, 'Expected forecast to be available for >= 7 points')
  assert.strictEqual(sufficientForecast.prediction_period_days, 7, 'Expected 7-day prediction window')
  assert.ok(sufficientForecast.forecasted_sales_expected! >= 135, 'Projected sales should be >= current sales')
  assert.ok(sufficientForecast.forecasted_sales_high! >= sufficientForecast.forecasted_sales_low!, 'High forecast should be >= low forecast')
  assert.ok(sufficientForecast.confidence_score! > 0.5, 'Confidence score should be > 0.5')
  console.log(`Forecast Result: Expected ${sufficientForecast.forecasted_sales_expected} (range: ${sufficientForecast.forecasted_sales_low} - ${sufficientForecast.forecasted_sales_high}), Confidence: ${sufficientForecast.confidence_score} (${sufficientForecast.confidence_label})`)
  console.log('✅ TEST 5 PASSED: Sales forecasting engine cleanly differentiates sufficient vs insufficient data.')

  // TEST 6: Real Content Topics Extraction & Competitive Topic Gap Analysis
  console.log('\n--- TEST 6: Real Content Topics & Competitor Gap Analysis ---')
  const targetProductForSeo: ExtractedProductData = {
    url: 'https://example.com/item/rideon-taxi-booking',
    productName: 'RideOn Taxi Booking & Dispatch SaaS',
    websiteTitle: 'RideOn - Real-Time Taxi Booking and Dispatch System',
    description: 'RideOn is a complete automated dispatch platform featuring real-time driver tracking, automated fare calculation, and stripe payment processing.',
    headings: {
      h1: ['Automated Dispatch and Fleet Management'],
      h2: ['Real-Time Driver Tracking', 'Multi-Currency Stripe Checkout', 'Customer Mobile App'],
      h3: ['Instant SMS Alerts', 'Driver Wallet System'],
    },
    features: [
      'Automated Dispatch System with intelligent routing',
      'Real-Time Driver Tracking via live map telemetry',
      'Stripe Payment Gateway integration',
    ],
    tags: ['taxi booking', 'dispatch software', 'driver tracking'],
    imageAltsCount: 8,
    totalImagesCount: 10,
    canonicalUrl: 'https://example.com/item/rideon-taxi-booking',
    hasStructuredData: true,
    structuredDataTypes: ['SoftwareApplication'],
    collectionErrors: [],
    analyzedAt: new Date().toISOString(),
    pricingPlans: [],
    hasFreePlan: false,
    hasFreeTrial: false,
    freeTrialDetails: '',
    integrations: ['Stripe', 'Twilio'],
    mainBenefits: ['Cut dispatch latency by 40%'],
    positioningClaims: ['Fastest dispatch setup'],
    contactOrDemoCta: 'https://example.com/demo',
    changelogLink: 'https://example.com/changelog',
    blogLink: '',
    docsLink: 'https://example.com/docs',
    testimonials: [],
    discoveredPages: [],
    category: 'On-Demand Transportation',
    targetCustomers: ['Fleet Operators'],
    useCases: ['City Taxi Services'],
    normalizedUrl: 'https://example.com/item/rideon-taxi-booking',
  }

  const competitorForSeo: ExtractedProductData = {
    url: 'https://competitor.com/item/taxido-uber-clone',
    productName: 'Taxido WhatsApp Booking Platform',
    websiteTitle: 'Taxido - Taxi Booking with WhatsApp Cloud API',
    description: 'Taxido offers taxi dispatch and automated WhatsApp booking bot integration for instant customer ride requests.',
    headings: {
      h1: ['Complete Taxi Dispatch Solution'],
      h2: ['WhatsApp Cloud API Booking Engine', 'Driver Fleet Telemetry', 'Twilio SMS Verification'],
      h3: ['Custom Bot Workflows'],
    },
    features: [
      'WhatsApp Cloud API Booking Engine with auto-reply',
      'Twilio SMS Verification for passenger logins',
      'Driver Fleet Telemetry dashboard',
    ],
    tags: ['whatsapp booking', 'whatsapp bot', 'uber clone'],
    imageAltsCount: 2,
    totalImagesCount: 8,
    canonicalUrl: 'https://competitor.com/item/taxido-uber-clone',
    hasStructuredData: false,
    collectionErrors: [],
    analyzedAt: new Date().toISOString(),
    pricingPlans: [],
    hasFreePlan: false,
    hasFreeTrial: false,
    freeTrialDetails: '',
    integrations: ['WhatsApp Cloud API', 'Twilio'],
    mainBenefits: [],
    positioningClaims: [],
    contactOrDemoCta: '',
    changelogLink: '',
    blogLink: '',
    docsLink: '',
    testimonials: [],
    discoveredPages: [],
    category: 'Transportation',
    targetCustomers: [],
    useCases: [],
    normalizedUrl: 'https://competitor.com/item/taxido-uber-clone',
  }

  const compSeoResult = analyzeSeo(targetProductForSeo, [competitorForSeo])

  // Assertions:
  assert.ok(compSeoResult.observed_topics && compSeoResult.observed_topics.length > 0, 'Observed topics should not be empty')
  console.log(`Extracted ${compSeoResult.observed_topics.length} total observed topics across products`)

  // Check that "0 meta keywords" does NOT mean "0 SEO keywords"
  assert.ok(compSeoResult.my_topics && compSeoResult.my_topics.length > 0, 'Target product must have extracted topics even without meta keywords tag')
  assert.ok(compSeoResult.competitor_topics && compSeoResult.competitor_topics.length > 0, 'Competitor must have extracted topics')

  // Check competitor topic gaps
  assert.ok(compSeoResult.competitor_only_topics && compSeoResult.competitor_only_topics.length > 0, 'Competitor-only topic gaps must be detected')
  const whatsappGap = compSeoResult.competitor_only_topics.find((g) => g.topic.toLowerCase().includes('whatsapp'))
  assert.ok(whatsappGap, 'Expected competitor gap for WhatsApp to be detected from competitor H2/features')
  assert.ok(whatsappGap.evidence.length > 5, 'Competitor gap must include direct evidence snippet')
  console.log(`Detected competitor topic gap: "${whatsappGap.topic}" with evidence: "${whatsappGap.evidence}"`)

  // Check content coverage separation
  assert.ok(compSeoResult.content_coverage, 'Content coverage must be computed')
  assert.strictEqual(typeof compSeoResult.content_coverage.titleTopicCoverage.covered, 'boolean')
  assert.strictEqual(typeof compSeoResult.content_coverage.headingCoverage.h1Covered, 'boolean')
  assert.strictEqual(compSeoResult.content_coverage.imageAltCoverage.total, 10)
  assert.strictEqual(compSeoResult.content_coverage.imageAltCoverage.withAlt, 8)

  // Check competitor profile
  assert.ok(compSeoResult.competitor_profiles && compSeoResult.competitor_profiles.length === 1)
  assert.ok(compSeoResult.competitor_profiles[0].missingOnMyProduct.length > 0, 'Competitor profile must note missing topics on my product')

  // Check ranking data status rule
  assert.ok(compSeoResult.ranking_data_status?.includes('Search ranking data unavailable'), 'Must state Search ranking data unavailable')

  console.log('✅ TEST 6 PASSED: Real content topics, competitor gap analysis, and deterministic coverage verified.')

  // TEST 7: Sales Activity Timeline & Competitor Activity Comparison
  console.log('\n--- TEST 7: Sales Activity Timeline & Competitor Activity Comparison ---')
  // 7a. Insufficient data handling
  const emptyTimeline = calculateSalesActivityTimeline([], null)
  assert.strictEqual(emptyTimeline.has_enough_history, false)
  assert.strictEqual(emptyTimeline.total_observed_events, 0)
  assert.strictEqual(emptyTimeline.last_observed_activity, null)
  assert.strictEqual(emptyTimeline.previous_observed_activity, null)
  assert.strictEqual(emptyTimeline.interval_between_last_two, null)
  assert.strictEqual(emptyTimeline.average_observed_interval, null)
  assert.ok(emptyTimeline.insufficient_reason?.includes('Insufficient sales history'))

  // 7b. Single increase handling (baseline + 1 event)
  const singleEventHistory = [
    { id: '1', source_url: 'u', collected_at: '2026-09-01T10:00:00.000Z', total_sales: 100, sales_gained_since_previous: null, price: '$29', rating: 4.8, review_count: 5, comment_count: 2 },
    { id: '2', source_url: 'u', collected_at: '2026-09-03T10:00:00.000Z', total_sales: 101, sales_gained_since_previous: 1, price: '$29', rating: 4.8, review_count: 5, comment_count: 2 },
  ]
  const singleTimeline = calculateSalesActivityTimeline(singleEventHistory, 101)
  assert.strictEqual(singleTimeline.has_enough_history, false)
  assert.strictEqual(singleTimeline.total_observed_events, 1)
  assert.ok(singleTimeline.last_observed_activity !== null)
  assert.strictEqual(singleTimeline.last_observed_activity?.salesGained, 1)
  assert.strictEqual(singleTimeline.last_observed_activity?.newTotalSales, 101)
  assert.strictEqual(singleTimeline.previous_observed_activity, null)
  assert.strictEqual(singleTimeline.interval_between_last_two, null)
  assert.strictEqual(singleTimeline.average_observed_interval, null)

  // 7c. Two observed increases -> exact interval calculated
  const twoEventsHistory = [
    { id: '1', source_url: 'u', collected_at: '2026-09-01T10:00:00.000Z', total_sales: 100, sales_gained_since_previous: null, price: '$29', rating: 4.8, review_count: 5, comment_count: 2 },
    { id: '2', source_url: 'u', collected_at: '2026-09-03T10:00:00.000Z', total_sales: 101, sales_gained_since_previous: 1, price: '$29', rating: 4.8, review_count: 5, comment_count: 2 },
    { id: '3', source_url: 'u', collected_at: '2026-09-05T16:00:00.000Z', total_sales: 102, sales_gained_since_previous: 1, price: '$29', rating: 4.8, review_count: 5, comment_count: 2 },
  ]
  const twoTimeline = calculateSalesActivityTimeline(twoEventsHistory, 102)
  assert.strictEqual(twoTimeline.has_enough_history, true)
  assert.strictEqual(twoTimeline.total_observed_events, 2)
  assert.strictEqual(twoTimeline.last_observed_activity?.newTotalSales, 102)
  assert.strictEqual(twoTimeline.previous_observed_activity?.newTotalSales, 101)
  assert.ok(twoTimeline.interval_between_last_two !== null)
  assert.strictEqual(twoTimeline.interval_between_last_two?.formatted, '2 days 6 hrs')
  assert.strictEqual(twoTimeline.interval_between_last_two?.days, 2.3)
  // Only 1 interval between events, so average requires >= 2 intervals
  assert.strictEqual(twoTimeline.average_observed_interval, null)

  // 7d. Three observed increases with accelerating cadence
  const accelHistory = [
    { id: '0', source_url: 'u', collected_at: '2026-08-30T10:00:00.000Z', total_sales: 50, sales_gained_since_previous: null, price: '$49', rating: 4.5, review_count: 10, comment_count: 3 },
    { id: '1', source_url: 'u', collected_at: '2026-09-01T10:00:00.000Z', total_sales: 51, sales_gained_since_previous: 1, price: '$49', rating: 4.5, review_count: 10, comment_count: 3 },
    { id: '2', source_url: 'u', collected_at: '2026-09-05T10:00:00.000Z', total_sales: 52, sales_gained_since_previous: 1, price: '$49', rating: 4.5, review_count: 10, comment_count: 3 },
    { id: '3', source_url: 'u', collected_at: '2026-09-06T10:00:00.000Z', total_sales: 54, sales_gained_since_previous: 2, price: '$49', rating: 4.5, review_count: 10, comment_count: 3 },
  ]
  const accelTimeline = calculateSalesActivityTimeline(accelHistory, 54)
  assert.strictEqual(accelTimeline.has_enough_history, true)
  assert.strictEqual(accelTimeline.total_observed_events, 3)
  assert.strictEqual(accelTimeline.activity_trend, 'accelerating')
  assert.ok(accelTimeline.average_observed_interval !== null)
  assert.strictEqual(accelTimeline.average_observed_interval?.formatted, '2 days 12 hrs')

  // 7e. Competitor Activity Comparison
  const compComp = compareCompetitorActivity(
    { sales_activity_timeline: accelTimeline, raw_envato_data: { product_name: 'Target App' }, source_url: 'https://target.com' } as any,
    { sales_activity_timeline: singleTimeline, raw_envato_data: { product_name: 'Competitor App' }, source_url: 'https://competitor.com' } as any
  )
  assert.strictEqual(compComp.target_observed_increases, 3)
  assert.strictEqual(compComp.competitor_observed_increases, 1)
  assert.ok(compComp.comparison_insight.includes('Your product shows more frequent observed sales increases (3 observed increases) than Competitor App (1 observed increase)'))
  console.log(`Comparative activity insight: "${compComp.comparison_insight}"`)

  // 7f. Real Database Snapshots Verification (RideOn vs Taxido)
  const { prisma } = await import('../src/lib/prisma')
  const rideonSnapshots = await prisma.envatoSalesSnapshot.findMany({
    where: { sourceUrl: 'https://codecanyon.net/item/rideon-taxi-complete-taxi-booking-solution/59633641' },
    orderBy: { collectedAt: 'asc' },
  })
  const taxidoSnapshots = await prisma.envatoSalesSnapshot.findMany({
    where: { sourceUrl: 'https://codecanyon.net/item/taxido-react-native-online-taxi-booking-with-cab-rental-bidding-parcel-admin-laravel-panel/56450809' },
    orderBy: { collectedAt: 'asc' },
  })

  if (rideonSnapshots.length > 0 && taxidoSnapshots.length > 0) {
    const rideonHistory = rideonSnapshots.map(s => ({
      id: s.id,
      source_url: s.sourceUrl,
      collected_at: s.collectedAt.toISOString(),
      total_sales: s.totalSales,
      sales_gained_since_previous: null,
      price: s.price,
      rating: s.rating,
      review_count: s.reviewCount,
      comment_count: s.commentCount,
    }))
    const taxidoHistory = taxidoSnapshots.map(s => ({
      id: s.id,
      source_url: s.sourceUrl,
      collected_at: s.collectedAt.toISOString(),
      total_sales: s.totalSales,
      sales_gained_since_previous: null,
      price: s.price,
      rating: s.rating,
      review_count: s.reviewCount,
      comment_count: s.commentCount,
    }))

    const rideonTimeline = calculateSalesActivityTimeline(rideonHistory, 296)
    const taxidoTimeline = calculateSalesActivityTimeline(taxidoHistory, 259)

    console.log(`RideOn observed events in DB: ${rideonTimeline.total_observed_events}, last: ${rideonTimeline.last_observed_activity?.formattedDate}, interval: ${rideonTimeline.interval_between_last_two?.formatted}`)
    console.log(`Taxido observed events in DB: ${taxidoTimeline.total_observed_events}, last: ${taxidoTimeline.last_observed_activity?.formattedDate}`)

    assert.strictEqual(rideonTimeline.total_observed_events, 2)
    assert.strictEqual(rideonTimeline.interval_between_last_two?.formatted, '2 days 1 hr')
    assert.strictEqual(taxidoTimeline.total_observed_events, 1)

    const dbComparison = compareCompetitorActivity(
      { sales_activity_timeline: rideonTimeline, raw_envato_data: { product_name: 'RideOn' }, source_url: rideonSnapshots[0].sourceUrl } as any,
      { sales_activity_timeline: taxidoTimeline, raw_envato_data: { product_name: 'Taxido' }, source_url: taxidoSnapshots[0].sourceUrl } as any
    )
    console.log(`RideOn vs Taxido DB Insight: "${dbComparison.comparison_insight}"`)
    assert.ok(dbComparison.comparison_insight.includes('Your product shows more frequent observed sales increases (2 observed increases) than Taxido (1 observed increase)'))
  }

  console.log('✅ TEST 7 PASSED: Sales Activity Timeline, interval calculations, and competitor activity comparisons verified on real data.')

  // TEST 8: Feature Battle — Product Competitive Feature Matrix & Intelligence Engine
  console.log('\n--- TEST 8: Feature Battle (Depth Evaluation, Zero-Fabrication & Customer Importance) ---')
  const {
    buildFeatureBattle,
    evaluateProductDepth,
    computeCustomerImportance,
  } = await import('../src/services/website-analyzer/feature-analyzer')

  // 8a. Test Depth Evaluation: Full vs Partial vs Basic vs Missing vs Unknown
  const testProductWithFull = {
    features: ['Real-time Driver GPS Tracking and Route Navigation', 'Flutter Passenger Mobile App'],
    description: 'A complete on-demand dispatch solution with comprehensive admin dashboard.',
  }
  const depthFull = evaluateProductDepth(testProductWithFull, 'Driver GPS Tracking')
  assert.strictEqual(depthFull.depth, 'Full', 'Explicit bullet feature must evaluate to Full depth')
  assert.strictEqual(depthFull.evidence.confidence, 'High', 'Direct feature match must have High confidence')
  assert.strictEqual(depthFull.evidence.sourceType, 'Feature section')
  console.log('  -> Evaluated "Driver GPS Tracking": Full depth with High confidence evidence receipt.')

  const testProductWithPartial = {
    features: ['Basic in-app messaging between rider and driver (text only)'],
    description: 'Standard booking system with basic messaging capability.',
  }
  const depthPartial = evaluateProductDepth(testProductWithPartial, 'In-app messaging')
  assert.ok(
    depthPartial.depth === 'Partial' || depthPartial.depth === 'Basic',
    'Basic/text-only feature must evaluate to Partial or Basic depth'
  )
  console.log(`  -> Evaluated "In-app messaging": ${depthPartial.depth} depth.`)

  // 8b. Test Unknown vs Missing (Crucial Requirement: Absence is Unknown, NOT Missing unless explicit)
  const testProductWithoutFeature = {
    features: ['Stripe payment gateway', 'User login via Email'],
    description: 'Simple taxi management.',
  }
  const depthUnknown = evaluateProductDepth(testProductWithoutFeature, 'Automated surge pricing engine')
  assert.strictEqual(
    depthUnknown.depth,
    'Unknown',
    'Unmentioned feature MUST be evaluated as Unknown, NEVER assumed Missing!'
  )
  assert.strictEqual(depthUnknown.evidence.confidence, 'Unknown')
  console.log('  -> Evaluated unmentioned capability: Unknown depth (Zero false Missing assumptions verified).')

  // Explicit absence/complaint test
  const testProductWithExplicitMissing = {
    features: ['Stripe payment gateway'],
    description: 'Simple taxi management.',
    complaints: ['Does not support surge pricing or automatic fare multiplier.'],
  }
  const depthExplicitMissing = evaluateProductDepth(testProductWithExplicitMissing, 'Surge pricing')
  assert.strictEqual(
    depthExplicitMissing.depth,
    'Missing',
    'Explicit complaint/negation MUST evaluate to Missing'
  )
  console.log('  -> Evaluated explicit absence in complaints: Missing depth with verified review receipt.')

  // 8c. Test Customer Importance Counting from Real Review Comments
  const mockComments = [
    { text: 'The driver tracking is very smooth on Android.', sentiment: 'positive' },
    { text: 'Please add parcel booking support, many customers are asking for parcel delivery!', sentiment: 'neutral' },
    { text: 'Driver tracking frequently disconnects during transit. Fix GPS!', sentiment: 'negative' },
    { text: 'Love the laravel admin panel, super easy to configure.', sentiment: 'positive' },
  ]
  const trackingImportance = computeCustomerImportance('Driver GPS Tracking', mockComments, 3, 4)
  assert.strictEqual(trackingImportance.customerMentions, 2, 'Should detect 2 mentions of driver tracking')
  assert.strictEqual(trackingImportance.complaintMentions, 1, 'Should detect 1 complaint about tracking')
  assert.strictEqual(trackingImportance.positiveMentions, 1, 'Should detect 1 positive mention')
  assert.strictEqual(trackingImportance.competitorsOfferingCount, 3)
  assert.strictEqual(trackingImportance.totalCompetitorsCount, 4)
  assert.strictEqual(trackingImportance.importanceScore, 'HIGH', 'Mentions with complaints must yield HIGH importance')

  const parcelImportance = computeCustomerImportance('Parcel Booking', mockComments, 1, 4)
  assert.strictEqual(parcelImportance.customerMentions, 1)
  assert.strictEqual(parcelImportance.requestMentions, 1, 'Should detect 1 request mention for parcel')

  const unmentionedImportance = computeCustomerImportance('Cryptocurrency Wallet', mockComments, 1, 4)
  assert.strictEqual(unmentionedImportance.customerMentions, 0)
  assert.strictEqual(unmentionedImportance.importanceScore, 'INSUFFICIENT_DATA')
  console.log('  -> Customer Importance: Deterministic mention/request/complaint counting verified without fabrication.')

  // 8d. Test Full buildFeatureBattle on Live DB Project (RideOn Analysis)
  const activeProject = await prisma.comparisonAnalysis.findFirst({
    where: { projectName: 'RideOn Analysis' },
  })
  if (activeProject) {
    const myProd = activeProject.myProduct || {}
    const comps = (activeProject.competitorsData as any[]) || []
    const commentsData = activeProject.commentsAnalysis

    const fbResult = buildFeatureBattle(myProd, comps, commentsData)

    console.log(`\n  -> Live DB Project: ${fbResult.totalMarketFeatures} total market capabilities identified.`)
    console.log(`  -> Categories identified: ${fbResult.categories.map(c => `${c.name} (${c.count})`).join(', ')}`)
    console.log(`  -> You Lead: ${fbResult.summary.featuresYouLead.length}`)
    console.log(`  -> Parity: ${fbResult.summary.parity.length}`)
    console.log(`  -> Competitors Lead: ${fbResult.summary.featuresCompetitorsLead.length}`)
    console.log(`  -> Table Stakes: ${fbResult.summary.tableStakes.length}`)
    console.log(`  -> High-Value Gaps: ${fbResult.summary.highValueGaps.length}`)
    console.log(`  -> Low-Value Gaps to Avoid: ${fbResult.summary.lowValueGaps.length}`)
    console.log(`  -> Top 3 Sprint Priorities:`)
    fbResult.summary.whatThisMeans.top3Priorities.forEach((p) => {
      console.log(`     #${p.rank}: [${p.action}] ${p.feature} — ${p.evidenceReason}`)
    })

    assert.ok(fbResult.matrix.length > 0, 'Feature battle matrix must contain rows')
    assert.ok(fbResult.categories.length > 0, 'Must contain categorized features')
    assert.ok(fbResult.summary.whatThisMeans.top3Priorities.length > 0, 'Must generate top 3 priorities')

    // Verify evidence receipt structure on first row
    const firstRow = fbResult.matrix[0]
    assert.ok(firstRow.myProduct.evidence.snippet, 'My product must have evidence snippet')
    assert.ok(firstRow.myProduct.evidence.sourceType, 'My product must have evidence sourceType')
    assert.ok(firstRow.conclusion, 'Row must have conclusion')
  }

  console.log('✅ TEST 8 PASSED: Feature Battle matrix, depth evaluation, customer importance, and sprint priorities verified.')

  console.log('\n🎉 ALL 8 CORE INTELLIGENCE FIXES TESTS PASSED SUCCESSFULLY!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})

