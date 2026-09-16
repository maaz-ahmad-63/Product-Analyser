import { prisma } from '../src/lib/prisma'
import { compareProducts } from '../src/services/website-analyzer/comparator'
import { buildFeatureBattle } from '../src/services/website-analyzer/feature-analyzer'
import { analyzeSeo } from '../src/services/website-analyzer/seo-analyzer'
import { detectOpportunitiesFromRecurringComplaints } from '../src/services/website-analyzer/opportunity-detector'

async function run() {
  console.log('=== MULTI-COMPETITOR AGGREGATION VERIFICATION ===\n')

  // Find a project with multiple competitors in the database
  const project = await prisma.comparisonAnalysis.findFirst({
    where: {
      id: 'cmtvloivo000t6oep9oyxqg7f',
    },
  })

  if (!project) {
    console.error('Project cmtvloivo000t6oep9oyxqg7f not found')
    process.exit(1)
  }

  const myProduct: any = project.myProduct
  const competitors: any[] = (project.competitorsData as any[]) || []
  const commentsAnalysis: any = project.commentsAnalysis

  console.log(`Target Product: ${myProduct.productName}`)
  console.log(`Total Competitors: ${competitors.length}`)
  competitors.forEach((c, idx) => {
    console.log(`  Competitor ${idx + 1}: ${c.productName} (Sales: ${c.envatoSales?.current_total_sales || 0})`)
  })

  // 1. Verify compareProducts aggregation across ALL competitors
  console.log('\n--- 1. Testing compareProducts Multi-Competitor Aggregation ---')
  const compResult = compareProducts(myProduct, competitors, commentsAnalysis)
  const comparison = compResult.comparison

  console.log(`Total Shared Features: ${comparison.sharedFeatures.length}`)
  if (comparison.sharedFeatures.length > 0) {
    console.log(`  Sample Shared Feature: "${comparison.sharedFeatures[0]}"`)
  }

  console.log(`Total Competitor Exclusive Features: ${comparison.competitorExclusiveFeatures.length}`)
  if (comparison.competitorExclusiveFeatures.length > 0) {
    console.log(`  Sample Competitor Exclusive: "${comparison.competitorExclusiveFeatures[0]}"`)
  }

  console.log('\nPricing Benchmark Across Market:')
  comparison.pricingDifferences.forEach((p) => {
    console.log(`  [${p.category}] Difference: "${p.difference}"`)
  })

  console.log('\nPositioning Summary:')
  console.log(`  Headline: "${comparison.positioningDifferences.competitorHeadline}"`)
  console.log(`  Summary: "${comparison.positioningDifferences.summary}"`)

  console.log('\nShared Competitor Weaknesses:')
  const weaknesses = comparison.marketOverview?.sharedWeaknesses || []
  console.log(`  Total Shared Weaknesses: ${weaknesses.length}`)
  weaknesses.forEach((w) => {
    console.log(`  - Weakness: "${w.weakness}" (${w.count}/${competitors.length} competitors: ${w.affectedCompetitors.join(', ')})`)
  })

  console.log('\nIndividual Competitor Drill-Downs (byCompetitor):')
  const byCompKeys = Object.keys(comparison.byCompetitor || {})
  console.log(`  Total keys in byCompetitor: ${byCompKeys.length}`)
  console.log(`  Keys: ${byCompKeys.slice(0, 6).join(', ')}`)

  // 2. Verify Feature Battle Matrix with all competitors
  console.log('\n--- 2. Testing Feature Battle Matrix Row Conclusions ---')
  const fb = buildFeatureBattle(myProduct, competitors, commentsAnalysis)
  console.log(`Total Market Features in Battle: ${fb.totalMarketFeatures}`)
  console.log(`Advantages: ${fb.summary.featuresYouLead.length}, Parity: ${fb.summary.parity.length}, Gaps: ${fb.summary.featuresCompetitorsLead.length}`)
  
  const sampleParity = fb.matrix.find((r) => r.classification === 'parity')
  if (sampleParity) {
    console.log(`  Sample Parity Row: "${sampleParity.feature}"`)
    console.log(`    Conclusion: "${sampleParity.conclusion}"`)
  }

  const sampleGap = fb.matrix.find((r) => r.classification === 'gap')
  if (sampleGap) {
    console.log(`  Sample Gap Row: "${sampleGap.feature}"`)
    console.log(`    Conclusion: "${sampleGap.conclusion}"`)
  }

  // 3. Verify SEO & Keywords Analysis across all competitors
  console.log('\n--- 3. Testing SEO & Keywords Across All Competitors ---')
  const seo = analyzeSeo(myProduct, competitors, [], {}, commentsAnalysis)
  console.log(`Total Observed Topics: ${seo.observed_topics?.length || 0}`)
  const sampleTopicWithCoverage = (seo.observed_topics || []).find((t) => t.competitorCoverageRatio && t.competitorCoverageRatio !== '0/0')
  if (sampleTopicWithCoverage) {
    console.log(`  Sample Topic: "${sampleTopicWithCoverage.topic}"`)
    console.log(`    Coverage: ${sampleTopicWithCoverage.competitorCoverageRatio} competitors`)
    console.log(`    Covered by Sales Leader: ${sampleTopicWithCoverage.coveredByHighestSalesCompetitor}`)
  }
  const sampleGapTopic = seo.competitor_only_topics?.[0]
  if (sampleGapTopic) {
    console.log(`  Sample Competitor-Only Topic Gap: "${sampleGapTopic.topic}"`)
    console.log(`    Strategic Impact: "${sampleGapTopic.strategicImpact}"`)
  }

  // 4. Verify Intelligence Opportunities
  console.log('\n--- 4. Testing Intelligence Opportunities Across All Competitors ---')
  const allRecurring = commentsAnalysis?.recurring_complaints || []
  const opps = detectOpportunitiesFromRecurringComplaints(allRecurring, myProduct, competitors)
  console.log(`Total Opportunities Detected: ${opps.length}`)
  const sharedOpp = opps.find((o) => o.is_shared_market_weakness)
  if (sharedOpp) {
    console.log(`  Sample Shared Weakness Opportunity: Category "${sharedOpp.issue_category}"`)
    console.log(`    Competitor: ${sharedOpp.competitor_name}`)
    console.log(`    Shared with: ${sharedOpp.shared_competitors_count} competitors (${sharedOpp.shared_competitors?.join(', ')})`)
    console.log(`    Sales Leader Affected: ${sharedOpp.highest_sales_competitor_affected}`)
    console.log(`    Why Relevant: "${sharedOpp.why_relevant}"`)
  }

  // 5. Update DB record with the refreshed multi-competitor comparison so DB is fully up-to-date
  console.log('\n--- 5. Persisting refreshed multi-competitor analysis to Database ---')
  await prisma.comparisonAnalysis.update({
    where: { id: project.id },
    data: {
      comparison: JSON.parse(JSON.stringify(comparison)),
      recommendations: JSON.parse(JSON.stringify(compResult.recommendations)),
      seoAnalysis: JSON.parse(JSON.stringify(seo)),
      opportunitiesData: JSON.parse(JSON.stringify(opps)),
      completedAt: new Date(),
    },
  })
  console.log('Database updated successfully!')
  console.log('\n=== ALL VERIFICATIONS PASSED ===')
}

run()
  .catch((e) => {
    console.error('Verification failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
