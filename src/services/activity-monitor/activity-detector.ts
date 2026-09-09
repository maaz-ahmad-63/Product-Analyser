// src/services/activity-monitor/activity-detector.ts
// Compares successive product snapshots, detects meaningful changes, and produces rule-based activity analysis

import { ProductActivityItem, ProductSnapshotData, ActivityType, ActivityImpact } from './types'
import { classifyNegativeComment } from '../website-analyzer/comments-analyzer'
import { EnvatoSalesSnapshot } from '@prisma/client'

interface ContextData {
  analysisId: string
  userId?: string | null
  isOurProduct: boolean
  ourProductName?: string
  ourProductSales?: number | null
  competitorSalesMap?: Record<string, number>
}

/**
 * Detects meaningful activities by comparing a new snapshot with the previous snapshot.
 * Generates rule-based analysis without hallucinating causes.
 * If historical context is insufficient, explicitly displays: "Not enough historical data yet."
 */
export function detectActivities(
  newSnap: ProductSnapshotData,
  prevSnap: EnvatoSalesSnapshot | null,
  context: ContextData,
  timestamp: Date = new Date()
): ProductActivityItem[] {
  const activities: ProductActivityItem[] = []
  const { analysisId, userId, isOurProduct, ourProductName, ourProductSales, competitorSalesMap } = context

  // Helper to build competitor comparison text
  const getCompetitorComparisonText = (currentSales?: number | null) => {
    if (isOurProduct) {
      if (!competitorSalesMap || Object.keys(competitorSalesMap).length === 0) {
        return 'No saved competitors to compare with yet.'
      }
      const topCompetitors = Object.entries(competitorSalesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name, sales]) => `${name} (${sales} sales)`)
        .join(', ')
      return `Our sales: ${currentSales ?? 'N/A'}. Competitors: ${topCompetitors}.`
    } else {
      return `Our product (${ourProductName || 'Our Product'}): ${ourProductSales ?? 'N/A'} sales vs ${newSnap.productName}: ${currentSales ?? 'N/A'} sales.`
    }
  }

  // 1. DATA COLLECTION FAILED
  if (newSnap.collectionStatus === 'failed') {
    if (!prevSnap || prevSnap.collectionStatus !== 'failed') {
      activities.push({
        analysisId,
        userId,
        productUrl: newSnap.sourceUrl,
        productName: newSnap.productName || 'Product',
        isOurProduct,
        activityType: 'collection_failed',
        activityTitle: `Data collection failed for ${newSnap.productName || 'product'}`,
        whatChanged: `Public data collection could not be completed: ${newSnap.collectionError || 'Page unreachable or temporarily restricted'}.`,
        impactType: 'negative',
        previousValue: prevSnap?.collectionStatus || 'success',
        currentValue: 'failed',
        deltaValue: null,
        competitorComparison: isOurProduct ? 'Our product data check failed.' : 'Competitor public page check failed.',
        possibleReasons: 'Temporary server timeout, HTTP rate limit, or URL structure change.',
        recommendedActions: 'Verify the public product URL in a browser and check again on the next hourly schedule.',
        snapshotTimestamp: timestamp,
      })
    }
    return activities
  }

  // If there is no previous snapshot, this is the initial baseline check.
  // We record an initial baseline check activity if desired, or skip until a change occurs.
  if (!prevSnap) {
    // No previous snapshot to compare with yet
    return activities
  }

  // 2. SALES COUNT INCREASED
  if (
    typeof newSnap.totalSales === 'number' &&
    typeof prevSnap.totalSales === 'number' &&
    newSnap.totalSales > prevSnap.totalSales
  ) {
    const delta = newSnap.totalSales - prevSnap.totalSales
    const impact: ActivityImpact = isOurProduct ? 'positive' : 'neutral'
    
    // Check if there was an update or discount that could explain it
    let possibleReasons = 'Not enough historical data yet.'
    if (newSnap.discountedPrice && (!prevSnap.discountedPrice || newSnap.discountedPrice !== prevSnap.discountedPrice)) {
      possibleReasons = `Observed sales increase coincides with a price adjustment to ${newSnap.discountedPrice}.`
    } else if (newSnap.version && prevSnap.version && newSnap.version !== prevSnap.version) {
      possibleReasons = `Observed sales increase coincides with the recent update to version ${newSnap.version}.`
    }

    let recommendedActions = isOurProduct
      ? 'Verify customer support and server capacity to maintain high onboarding satisfaction.'
      : 'Analyze if the competitor recently ran a promotion or updated key features, and evaluate our value proposition.'

    activities.push({
      analysisId,
      userId,
      productUrl: newSnap.sourceUrl,
      productName: newSnap.productName,
      isOurProduct,
      activityType: 'sales_increase',
      activityTitle: `Observed sales increase since the previous check: +${delta} sales`,
      whatChanged: `Cumulative sales increased from ${prevSnap.totalSales.toLocaleString()} to ${newSnap.totalSales.toLocaleString()} (+${delta} sales).`,
      impactType: impact,
      previousValue: String(prevSnap.totalSales),
      currentValue: String(newSnap.totalSales),
      deltaValue: delta,
      competitorComparison: getCompetitorComparisonText(newSnap.totalSales),
      possibleReasons,
      recommendedActions,
      snapshotTimestamp: timestamp,
    })
  }

  // 3. RATING CHANGED
  if (
    typeof newSnap.rating === 'number' &&
    typeof prevSnap.rating === 'number' &&
    Math.abs(newSnap.rating - prevSnap.rating) >= 0.05
  ) {
    const isIncrease = newSnap.rating > prevSnap.rating
    const impact: ActivityImpact = isIncrease
      ? (isOurProduct ? 'positive' : 'neutral')
      : (isOurProduct ? 'negative' : 'positive')

    const diff = (newSnap.rating - prevSnap.rating).toFixed(2)
    activities.push({
      analysisId,
      userId,
      productUrl: newSnap.sourceUrl,
      productName: newSnap.productName,
      isOurProduct,
      activityType: 'rating_changed',
      activityTitle: `Public rating ${isIncrease ? 'increased' : 'decreased'} to ${newSnap.rating.toFixed(2)} ★`,
      whatChanged: `Rating shifted from ${prevSnap.rating.toFixed(2)} to ${newSnap.rating.toFixed(2)} (${isIncrease ? '+' : ''}${diff} stars).`,
      impactType: impact,
      previousValue: prevSnap.rating.toFixed(2),
      currentValue: newSnap.rating.toFixed(2),
      deltaValue: Math.round((newSnap.rating - prevSnap.rating) * 100),
      competitorComparison: isOurProduct
        ? `Our rating is now ${newSnap.rating.toFixed(2)} ★.`
        : `Competitor rating is now ${newSnap.rating.toFixed(2)} ★ vs our product.`,
      possibleReasons: newSnap.ratingCount !== prevSnap.ratingCount
        ? `New customer review submitted (total reviews: ${newSnap.ratingCount ?? 'N/A'}).`
        : 'Not enough historical data yet.',
      recommendedActions: isOurProduct && !isIncrease
        ? 'Investigate recent user reviews and prioritize resolution of recurring complaints.'
        : isOurProduct
        ? 'Showcase high customer satisfaction rating on landing and marketing materials.'
        : 'Highlight product reliability and superior user experience where the competitor saw a drop.',
      snapshotTimestamp: timestamp,
    })
  }

  // 4. REVIEW / COMMENT COUNT INCREASED
  if (
    typeof newSnap.commentCount === 'number' &&
    typeof prevSnap.commentCount === 'number' &&
    newSnap.commentCount > prevSnap.commentCount
  ) {
    const delta = newSnap.commentCount - prevSnap.commentCount
    activities.push({
      analysisId,
      userId,
      productUrl: newSnap.sourceUrl,
      productName: newSnap.productName,
      isOurProduct,
      activityType: 'comments_count_changed',
      activityTitle: `Public comment count increased: +${delta} new comments`,
      whatChanged: `Public comments increased from ${prevSnap.commentCount} to ${newSnap.commentCount} (+${delta} comments).`,
      impactType: 'neutral',
      previousValue: String(prevSnap.commentCount),
      currentValue: String(newSnap.commentCount),
      deltaValue: delta,
      competitorComparison: isOurProduct
        ? `Our product received ${delta} new public inquiries/comments.`
        : `Competitor received ${delta} new public inquiries/comments.`,
      possibleReasons: 'Active community engagement, pre-sales questions, or post-purchase feedback.',
      recommendedActions: isOurProduct
        ? 'Respond promptly to all public comments to maximize conversion and customer trust.'
        : 'Monitor new competitor comments for unresolved pain points and migration opportunities.',
      snapshotTimestamp: timestamp,
    })
  }

  // 5. PRICE OR DISCOUNT CHANGED
  const currentPriceDisplay = newSnap.discountedPrice || newSnap.price
  const prevPriceDisplay = prevSnap.discountedPrice || prevSnap.price
  if (
    currentPriceDisplay &&
    prevPriceDisplay &&
    currentPriceDisplay.trim() !== prevPriceDisplay.trim()
  ) {
    const impact: ActivityImpact = isOurProduct ? 'neutral' : 'neutral'
    activities.push({
      analysisId,
      userId,
      productUrl: newSnap.sourceUrl,
      productName: newSnap.productName,
      isOurProduct,
      activityType: 'price_changed',
      activityTitle: `Price or discount adjusted to ${currentPriceDisplay}`,
      whatChanged: `Listed price changed from ${prevPriceDisplay} to ${currentPriceDisplay}.`,
      impactType: impact,
      previousValue: prevPriceDisplay,
      currentValue: currentPriceDisplay,
      deltaValue: null,
      competitorComparison: isOurProduct
        ? `Our updated pricing is now ${currentPriceDisplay}.`
        : `Competitor price changed to ${currentPriceDisplay}. Compare against our pricing model.`,
      possibleReasons: newSnap.discountedPrice
        ? 'Active promotional campaign or seasonal discount applied.'
        : 'Vendor updated base license pricing.',
      recommendedActions: isOurProduct
        ? 'Ensure all landing pages and promotional channels reflect current pricing.'
        : 'Review whether our pricing tier remains competitive in light of this change.',
      snapshotTimestamp: timestamp,
    })
  }

  // 6. PRODUCT UPDATED (Version / Date)
  const isVersionChanged = Boolean(
    newSnap.version &&
    prevSnap.version &&
    newSnap.version.trim() !== prevSnap.version.trim()
  )
  const isDateChanged = Boolean(
    newSnap.lastUpdateDate &&
    prevSnap.lastUpdateDate &&
    newSnap.lastUpdateDate.trim() !== prevSnap.lastUpdateDate.trim()
  )

  if (isVersionChanged || isDateChanged) {
    const verText = newSnap.version ? `version ${newSnap.version}` : 'new update'
    const dateText = newSnap.lastUpdateDate ? `on ${newSnap.lastUpdateDate}` : 'recently'
    activities.push({
      analysisId,
      userId,
      productUrl: newSnap.sourceUrl,
      productName: newSnap.productName,
      isOurProduct,
      activityType: 'product_updated',
      activityTitle: `Product updated: ${verText} ${dateText}`,
      whatChanged: `Product released an update (Version: ${newSnap.version || 'Unspecified'}, Update Date: ${newSnap.lastUpdateDate || 'Unspecified'}).`,
      impactType: isOurProduct ? 'positive' : 'neutral',
      previousValue: `${prevSnap.version || ''} (${prevSnap.lastUpdateDate || ''})`.trim() || 'Previous version',
      currentValue: `${newSnap.version || ''} (${newSnap.lastUpdateDate || ''})`.trim() || 'New version',
      deltaValue: null,
      competitorComparison: isOurProduct
        ? 'Our product update is now live for all users.'
        : 'Competitor published a new release. Monitor for new features or user regressions.',
      possibleReasons: 'Scheduled maintenance release, bug fixes, or new feature additions.',
      recommendedActions: isOurProduct
        ? 'Announce update in changelog and verify all customer upgrade flows.'
        : 'Inspect competitor changelog to verify feature parity and stability.',
      snapshotTimestamp: timestamp,
    })
  }

  // 7. FEATURE, DOCUMENTATION, DEMO, OR SUPPORT CHANGED
  const demoChanged = typeof newSnap.demoAvailable === 'boolean' && typeof prevSnap.demoAvailable === 'boolean' && newSnap.demoAvailable !== prevSnap.demoAvailable
  const docsChanged = typeof newSnap.docsAvailable === 'boolean' && typeof prevSnap.docsAvailable === 'boolean' && newSnap.docsAvailable !== prevSnap.docsAvailable
  const supportChanged = typeof newSnap.supportAvailable === 'boolean' && typeof prevSnap.supportAvailable === 'boolean' && newSnap.supportAvailable !== prevSnap.supportAvailable

  if (demoChanged || docsChanged || supportChanged) {
    const changes: string[] = []
    if (demoChanged) changes.push(`Live demo ${newSnap.demoAvailable ? 'became available' : 'is no longer listed'}`)
    if (docsChanged) changes.push(`Documentation ${newSnap.docsAvailable ? 'became available' : 'is no longer listed'}`)
    if (supportChanged) changes.push(`Support ${newSnap.supportAvailable ? 'became available' : 'is no longer listed'}`)

    activities.push({
      analysisId,
      userId,
      productUrl: newSnap.sourceUrl,
      productName: newSnap.productName,
      isOurProduct,
      activityType: 'feature_support_changed',
      activityTitle: `Demo, documentation, or support status changed`,
      whatChanged: changes.join('; ') + '.',
      impactType: 'neutral',
      previousValue: `Demo: ${prevSnap.demoAvailable ? 'Yes' : 'No'}, Docs: ${prevSnap.docsAvailable ? 'Yes' : 'No'}, Support: ${prevSnap.supportAvailable ? 'Yes' : 'No'}`,
      currentValue: `Demo: ${newSnap.demoAvailable ? 'Yes' : 'No'}, Docs: ${newSnap.docsAvailable ? 'Yes' : 'No'}, Support: ${newSnap.supportAvailable ? 'Yes' : 'No'}`,
      deltaValue: null,
      competitorComparison: 'Publicly listed buyer reassurance assets changed.',
      possibleReasons: 'Vendor updated listing links, documentation portal, or support policy.',
      recommendedActions: 'Ensure our product maintains clear live demo, responsive support, and thorough documentation.',
      snapshotTimestamp: timestamp,
    })
  }

  // 8. NEW RECURRING NEGATIVE COMPLAINTS DETECTED
  if (newSnap.recentComments && newSnap.recentComments.length > 0) {
    const negativeComments = newSnap.recentComments
      .map((c, idx) => classifyNegativeComment(
        { comment_text: c.text || '', comment_date: c.date || 'Recent public comment', author_name: 'Customer', comment_url: null, rating: c.rating ?? null },
        newSnap.sourceUrl,
        newSnap.productName,
        idx
      ))
      .filter((res): res is NonNullable<typeof res> => res !== null)

    // Group feedback by category
    const categoryGroups: Record<string, { count: number; sampleText: string; isCritical: boolean; isSuggestive: boolean }> = {}
    for (const item of negativeComments) {
      const cat = item.comment.topic_label || item.comment.topic || 'General Issue'
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = {
          count: 0,
          sampleText: item.comment.comment_text,
          isCritical: item.isCritical,
          isSuggestive: Boolean(item.comment.is_suggestive),
        }
      }
      categoryGroups[cat].count++
      if (item.isCritical) categoryGroups[cat].isCritical = true
      if (item.comment.is_suggestive) categoryGroups[cat].isSuggestive = true
    }

    // Flag recurring complaints (>=2), critical complaints, OR any suggestive comments
    for (const [category, group] of Object.entries(categoryGroups)) {
      if (group.count >= 2 || group.isCritical || group.isSuggestive) {
        const impact: ActivityImpact = group.isSuggestive ? 'neutral' : (isOurProduct ? 'negative' : 'positive')
        activities.push({
          analysisId,
          userId,
          productUrl: newSnap.sourceUrl,
          productName: newSnap.productName,
          isOurProduct,
          activityType: group.isSuggestive ? 'suggestive_feedback_detected' : 'recurring_complaint_detected',
          activityTitle: group.isSuggestive
            ? `Suggestive customer feedback detected: ${category} (${group.count} item${group.count > 1 ? 's' : ''})`
            : `Recurring complaint detected: ${category.replace(/_/g, ' ')} (${group.count} mentions)`,
          whatChanged: group.isSuggestive
            ? `Customer public feedback submitted constructive suggestion or feature inquiry for ${category}. Sample: "${group.sampleText.slice(0, 140)}..."`
            : `Multiple public comments report recurring issues with ${category.replace(/_/g, ' ')}. Sample: "${group.sampleText.slice(0, 140)}..."`,
          impactType: impact,
          previousValue: 'None detected in previous check',
          currentValue: `${group.count} comment${group.count > 1 ? 's' : ''} (${group.isSuggestive ? 'Suggestive Feedback' : group.isCritical ? 'Critical' : 'Recurring'})`,
          deltaValue: group.count,
          competitorComparison: isOurProduct
            ? (group.isSuggestive ? 'Customer suggestions for our product roadmap.' : 'Users experiencing friction with our product in this area.')
            : (group.isSuggestive
                ? `Prospective buyers are asking competitor for ${category}. We can evaluate offering this capability.`
                : `Competitor users are dissatisfied with ${category.replace(/_/g, ' ')}. Our product has an opportunity to capture these dissatisfied users.`),
          possibleReasons: group.isSuggestive
            ? 'Customer exploring new workflows, third-party integrations, or custom business requirements.'
            : 'Recent software bug, incomplete documentation, or delayed customer support.',
          recommendedActions: isOurProduct
            ? (group.isSuggestive ? `Review this suggestion for our product backlog.` : `Immediately investigate ${category.replace(/_/g, ' ')} to prevent churn and negative ratings.`)
            : (group.isSuggestive ? `Highlight our existing capabilities in ${category} in product documentation.` : `Emphasize our reliable ${category.replace(/_/g, ' ')} in marketing copy and outreach.`),
          snapshotTimestamp: timestamp,
        })
      }
    }
  }

  return activities
}
