import { prisma } from '../../lib/prisma'
import {
  EnvatoSalesData,
  ProductSalesAnalysis,
  SalesSnapshotItem,
  SalesComparisonData,
  SalesObservation,
  MultiCompetitorSalesComparison,
  CompetitorSalesRow,
  ExtractedProductData,
  SalesForecastData,
  SalesActivityEvent,
  SalesActivityTimelineData,
  CompetitorSalesActivityComparison,
} from './types'

/**
 * Saves a new timestamped Envato sales snapshot into the database
 */
export async function saveSalesSnapshot(
  salesData: EnvatoSalesData | null | undefined,
  url: string,
  error?: string,
  userId?: string | null,
  extras?: {
    demoAvailable?: boolean | null
    docsAvailable?: boolean | null
    supportAvailable?: boolean | null
    featuresCount?: number | null
  }
) {
  if (!salesData && !error) return null

  try {
    const snapshot = await prisma.envatoSalesSnapshot.create({
      data: {
        userId: userId || null,
        sourceUrl: url,
        productName: salesData?.product_name || null,
        authorName: salesData?.author_name || null,
        totalSales: salesData?.current_total_sales ?? null,
        price: salesData?.product_price || null,
        discountedPrice: salesData?.discounted_price || null,
        rating: salesData?.rating ?? null,
        ratingCount: salesData?.rating_count ?? null,
        reviewCount: salesData?.review_count ?? null,
        commentCount: salesData?.comment_count ?? null,
        publicationDate: salesData?.publication_date || null,
        lastUpdateDate: salesData?.last_update_date || null,
        version: salesData?.version || null,
        category: salesData?.category || null,
        productStatus: salesData?.product_status || null,
        demoAvailable: extras?.demoAvailable ?? false,
        docsAvailable: extras?.docsAvailable ?? false,
        supportAvailable: extras?.supportAvailable ?? false,
        featuresCount: extras?.featuresCount ?? 0,
        collectionStatus: error
          ? 'failed'
          : salesData?.sales_data_unavailable
          ? 'partial'
          : 'success',
        collectionError: error || null,
      },
    })
    return snapshot
  } catch (err) {
    console.error(`Failed to save sales snapshot for ${url}:`, err)
    return null
  }
}

/**
 * Fetches historical snapshots and computes all required sales metrics
 */
export async function calculateProductSalesAnalysis(
  url: string,
  currentData?: EnvatoSalesData | null
): Promise<ProductSalesAnalysis> {
  // Fetch snapshots ordered from oldest to newest for chronological analysis
  const snapshots = await prisma.envatoSalesSnapshot.findMany({
    where: {
      sourceUrl: url,
      totalSales: { not: null },
    },
    orderBy: { collectedAt: 'asc' },
  })

  // If no snapshots found in DB but currentData has sales, use currentData
  const currentSales =
    currentData?.current_total_sales ??
    (snapshots.length > 0 ? snapshots[snapshots.length - 1].totalSales : null)

  if (snapshots.length === 0 && currentSales === null) {
    return {
      current_sales: null,
      previous_sales: null,
      sales_difference: null,
      sales_growth_percentage: null,
      sales_gained_24h: null,
      sales_gained_7d: null,
      sales_gained_30d: null,
      average_sales_per_day: null,
      average_sales_per_week: null,
      sales_activity_status: 'insufficient_historical_data',
      sales_activity_status_label: 'Insufficient historical data',
      last_sales_increase: null,
      time_since_last_increase: null,
      sales_history: [],
      source_url: url,
      error: 'Sales data unavailable.',
      raw_envato_data: currentData || null,
      forecast: calculateSalesForecast([], null),
      sales_activity_timeline: calculateSalesActivityTimeline([], null),
    }
  }

  // Build chronological history list with gains since previous snapshot
  const salesHistory: SalesSnapshotItem[] = []
  let lastIncreaseDate: Date | null = null

  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i]
    let gained: number | null = null
    if (i > 0 && s.totalSales !== null && snapshots[i - 1].totalSales !== null) {
      gained = s.totalSales - snapshots[i - 1].totalSales!
      if (gained > 0) {
        lastIncreaseDate = s.collectedAt
      }
    }
    salesHistory.push({
      id: s.id,
      source_url: s.sourceUrl,
      collected_at: s.collectedAt.toISOString(),
      total_sales: s.totalSales,
      sales_gained_since_previous: gained,
      price: s.price,
      rating: s.rating,
      review_count: s.reviewCount,
      comment_count: s.commentCount,
    })
  }

  // If fewer than 2 snapshots exist:
  if (snapshots.length < 2) {
    return {
      current_sales: currentSales,
      previous_sales: null,
      sales_difference: null,
      sales_growth_percentage: null,
      sales_gained_24h: null,
      sales_gained_7d: null,
      sales_gained_30d: null,
      average_sales_per_day: null,
      average_sales_per_week: null,
      sales_activity_status: 'insufficient_historical_data',
      sales_activity_status_label: 'Waiting for historical data',
      last_sales_increase: null,
      time_since_last_increase: null,
      sales_history: salesHistory,
      source_url: url,
      error: null,
      raw_envato_data: currentData || null,
      forecast: calculateSalesForecast(salesHistory, currentSales),
      sales_activity_timeline: calculateSalesActivityTimeline(salesHistory, currentSales),
    }
  }

  // With 2 or more snapshots:
  const latestSnapshot = snapshots[snapshots.length - 1]
  const previousSnapshot = snapshots[snapshots.length - 2]

  const latestSales = latestSnapshot.totalSales!
  const prevSales = previousSnapshot.totalSales!
  const salesDiff = latestSales - prevSales

  let growthPct: number | null = null
  if (prevSales > 0) {
    growthPct = Math.round(((salesDiff / prevSales) * 100) * 100) / 100
  }

  // Time difference between the two snapshots in days
  const msBetween = latestSnapshot.collectedAt.getTime() - previousSnapshot.collectedAt.getTime()
  const daysBetween = Math.max(msBetween / (1000 * 60 * 60 * 24), 0.0001)

  // Average sales calculations
  const avgPerDay = Math.round((salesDiff / daysBetween) * 100) / 100
  const avgPerWeek = Math.round((avgPerDay * 7) * 100) / 100

  // Windowed metrics: 24h, 7d, 30d
  const gained24h = calculateSalesGainedInWindow(snapshots, 24 * 60 * 60 * 1000)
  const gained7d = calculateSalesGainedInWindow(snapshots, 7 * 24 * 60 * 60 * 1000)
  const gained30d = calculateSalesGainedInWindow(snapshots, 30 * 24 * 60 * 60 * 1000)

  // Activity status categorization
  let activityStatus: ProductSalesAnalysis['sales_activity_status'] = 'moderate_activity'
  let activityLabel = 'Moderate activity'

  if (salesDiff === 0 && (avgPerDay === 0 || isNaN(avgPerDay))) {
    activityStatus = 'no_recent_increase'
    activityLabel = 'No recent increase'
  } else if (avgPerDay >= 2) {
    activityStatus = 'high_activity'
    activityLabel = 'High activity'
  } else if (avgPerDay >= 0.5) {
    activityStatus = 'moderate_activity'
    activityLabel = 'Moderate activity'
  } else {
    activityStatus = 'low_activity'
    activityLabel = 'Low activity'
  }

  // Time since last increase
  let timeSinceLastIncrease: string | null = null
  if (lastIncreaseDate) {
    timeSinceLastIncrease = formatRelativeTime(lastIncreaseDate)
  }

  return {
    current_sales: latestSales,
    previous_sales: prevSales,
    sales_difference: salesDiff,
    sales_growth_percentage: growthPct,
    sales_gained_24h: gained24h,
    sales_gained_7d: gained7d,
    sales_gained_30d: gained30d,
    average_sales_per_day: avgPerDay,
    average_sales_per_week: avgPerWeek,
    sales_activity_status: activityStatus,
    sales_activity_status_label: activityLabel,
    last_sales_increase: lastIncreaseDate ? lastIncreaseDate.toISOString() : null,
    time_since_last_increase: timeSinceLastIncrease,
    sales_history: salesHistory,
    source_url: url,
    error: null,
    raw_envato_data: currentData || null,
    forecast: calculateSalesForecast(salesHistory, latestSales),
    sales_activity_timeline: calculateSalesActivityTimeline(salesHistory, latestSales),
  }
}

/**
 * Calculates sales gained within a specific millisecond window
 */
function calculateSalesGainedInWindow(
  snapshots: Array<{ totalSales: number | null; collectedAt: Date }>,
  windowMs: number
): number | null {
  if (snapshots.length < 2) return null

  const latest = snapshots[snapshots.length - 1]
  const targetTime = latest.collectedAt.getTime() - windowMs

  // Find the closest snapshot at or before the target time
  let closestBefore = snapshots[0]
  for (let i = snapshots.length - 2; i >= 0; i--) {
    if (snapshots[i].collectedAt.getTime() <= targetTime) {
      closestBefore = snapshots[i]
      break
    }
  }

  if (latest.totalSales !== null && closestBefore.totalSales !== null) {
    return Math.max(0, latest.totalSales - closestBefore.totalSales)
  }
  return null
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / (1000 * 60))
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

/**
 * Formats a millisecond duration into a compact, human-readable interval.
 */
export function formatDurationMs(ms: number): string {
  if (ms <= 0) return '0 mins'
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`)
  if (parts.length === 0 || (days === 0 && minutes > 0)) {
    parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`)
  }
  return parts.slice(0, 2).join(' ')
}

/**
 * Calculates deterministic sales activity timeline from historical sales snapshots.
 * Only builds events for observed sales increases, never fabricating timestamps.
 */
export function calculateSalesActivityTimeline(
  salesHistory: SalesSnapshotItem[],
  currentSales: number | null
): SalesActivityTimelineData {
  if (!salesHistory || salesHistory.length === 0) {
    return {
      has_enough_history: false,
      insufficient_reason: 'Insufficient sales history: no snapshot observations recorded yet.',
      total_observed_events: 0,
      last_observed_activity: null,
      previous_observed_activity: null,
      interval_between_last_two: null,
      average_observed_interval: null,
      activity_trend: 'insufficient_data',
      activity_trend_label: 'Insufficient sales history',
      activity_trend_reason: 'Awaiting snapshot history to detect sales activity.',
      events: [],
    }
  }

  // Filter valid snapshots that have valid total_sales and sort chronologically
  const valid = salesHistory
    .filter((s) => typeof s.total_sales === 'number' && s.total_sales !== null)
    .sort((a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime())

  if (valid.length === 0) {
    return {
      has_enough_history: false,
      insufficient_reason: 'Insufficient sales history: no valid sales figures recorded.',
      total_observed_events: 0,
      last_observed_activity: null,
      previous_observed_activity: null,
      interval_between_last_two: null,
      average_observed_interval: null,
      activity_trend: 'insufficient_data',
      activity_trend_label: 'Insufficient sales history',
      activity_trend_reason: 'No numerical sales data in recorded snapshots.',
      events: [],
    }
  }

  // Walk through snapshots to extract observed sales increase events
  const events: SalesActivityEvent[] = []

  for (let i = 1; i < valid.length; i++) {
    const curr = valid[i]
    const prev = valid[i - 1]
    const diff = (curr.total_sales ?? 0) - (prev.total_sales ?? 0)

    if (diff > 0) {
      const currTime = new Date(curr.collected_at).getTime()
      let intervalMs: number | null = null
      let intervalFormatted: string | null = null
      let velocityPerDay: number | null = null

      if (events.length > 0) {
        // Interval from prior observed increase
        const prevEventTime = new Date(events[events.length - 1].timestamp).getTime()
        intervalMs = Math.max(0, currTime - prevEventTime)
        intervalFormatted = formatDurationMs(intervalMs)
        const days = Math.max(intervalMs / (1000 * 60 * 60 * 24), 0.001)
        velocityPerDay = Math.round((diff / days) * 100) / 100
      } else {
        // First observed increase: interval from initial baseline snapshot
        const baselineTime = new Date(valid[0].collected_at).getTime()
        intervalMs = Math.max(0, currTime - baselineTime)
        intervalFormatted = `${formatDurationMs(intervalMs)} since baseline`
        const days = Math.max(intervalMs / (1000 * 60 * 60 * 24), 0.001)
        velocityPerDay = Math.round((diff / days) * 100) / 100
      }

      const dateObj = new Date(curr.collected_at)
      events.push({
        id: curr.id,
        timestamp: curr.collected_at,
        formattedDate: dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        relativeTime: formatRelativeTime(dateObj),
        salesGained: diff,
        newTotalSales: curr.total_sales!,
        previousTotalSales: prev.total_sales,
        intervalFromPreviousMs: intervalMs,
        intervalFromPreviousFormatted: intervalFormatted,
        velocityPerDay,
        price: curr.price,
        note: 'Observed sales increase',
      })
    }
  }

  // Case 0: No observed increase in history
  if (events.length === 0) {
    return {
      has_enough_history: false,
      insufficient_reason: 'Insufficient sales history: no sales increases observed across recorded snapshots yet.',
      total_observed_events: 0,
      last_observed_activity: null,
      previous_observed_activity: null,
      interval_between_last_two: null,
      average_observed_interval: null,
      activity_trend: 'insufficient_data',
      activity_trend_label: 'No increases observed',
      activity_trend_reason: `Stable sales volume observed across ${valid.length} snapshots without recorded changes.`,
      events: [],
    }
  }

  // Case 1: Exactly 1 observed increase
  if (events.length === 1) {
    return {
      has_enough_history: false,
      insufficient_reason: 'Insufficient sales history: 1 sales increase observed. At least 2 observed increases are required to measure intervals and trend.',
      total_observed_events: 1,
      last_observed_activity: events[0],
      previous_observed_activity: null,
      interval_between_last_two: null,
      average_observed_interval: null,
      activity_trend: 'insufficient_data',
      activity_trend_label: 'Baseline established',
      activity_trend_reason: 'Single sales increase observed. Awaiting further activity to establish interval metrics.',
      events,
    }
  }

  // Case 2: >= 2 observed increases
  const lastActivity = events[events.length - 1]
  const prevActivity = events[events.length - 2]

  const lastMs = new Date(lastActivity.timestamp).getTime()
  const prevMs = new Date(prevActivity.timestamp).getTime()
  const msBetweenLastTwo = Math.max(0, lastMs - prevMs)
  const daysBetweenLastTwo = Math.round((msBetweenLastTwo / (1000 * 60 * 60 * 24)) * 10) / 10

  const intervalBetweenLastTwo = {
    ms: msBetweenLastTwo,
    formatted: formatDurationMs(msBetweenLastTwo),
    days: daysBetweenLastTwo,
  }

  // Calculate intervals between all consecutive events
  const consecutiveIntervalsMs: number[] = []
  for (let k = 1; k < events.length; k++) {
    const tCurr = new Date(events[k].timestamp).getTime()
    const tPrev = new Date(events[k - 1].timestamp).getTime()
    consecutiveIntervalsMs.push(Math.max(0, tCurr - tPrev))
  }

  let averageObservedInterval: SalesActivityTimelineData['average_observed_interval'] = null
  let activityTrend: SalesActivityTimelineData['activity_trend'] = 'stable'
  let activityTrendLabel = 'Stable activity'
  let activityTrendReason = 'Observed interval consistent with recent monitoring cadence.'

  if (consecutiveIntervalsMs.length >= 2) {
    const totalMs = consecutiveIntervalsMs.reduce((acc, v) => acc + v, 0)
    const avgMs = Math.round(totalMs / consecutiveIntervalsMs.length)
    averageObservedInterval = {
      ms: avgMs,
      formatted: formatDurationMs(avgMs),
      days: Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10,
    }

    const recentInt = consecutiveIntervalsMs[consecutiveIntervalsMs.length - 1]
    const priorInt = consecutiveIntervalsMs[consecutiveIntervalsMs.length - 2]

    if (recentInt < priorInt * 0.8) {
      activityTrend = 'accelerating'
      activityTrendLabel = 'Accelerating'
      const pctFaster = Math.round(((priorInt - recentInt) / Math.max(priorInt, 1)) * 100)
      activityTrendReason = `Cadence increased: time between sales narrowed from ${formatDurationMs(priorInt)} to ${formatDurationMs(recentInt)} (${pctFaster}% faster).`
    } else if (recentInt > priorInt * 1.2) {
      activityTrend = 'slowing'
      activityTrendLabel = 'Slowing'
      activityTrendReason = `Cadence widened: time between sales extended from ${formatDurationMs(priorInt)} to ${formatDurationMs(recentInt)}.`
    } else {
      activityTrend = 'stable'
      activityTrendLabel = 'Stable'
      activityTrendReason = `Consistent cadence: ${formatDurationMs(recentInt)} between recent observed increases vs prior ${formatDurationMs(priorInt)}.`
    }
  } else {
    // Exactly 1 interval between events
    const singleInt = consecutiveIntervalsMs[0]
    const timeSinceLast = Date.now() - lastMs
    if (timeSinceLast > singleInt * 2.5) {
      activityTrend = 'slowing'
      activityTrendLabel = 'Cooling'
      activityTrendReason = `Time elapsed since last activity (${formatDurationMs(timeSinceLast)}) exceeds prior observed interval (${formatDurationMs(singleInt)}).`
    } else {
      activityTrend = 'stable'
      activityTrendLabel = 'Steady activity'
      activityTrendReason = `Observed interval between sales is ${formatDurationMs(singleInt)}.`
    }
  }

  return {
    has_enough_history: true,
    total_observed_events: events.length,
    last_observed_activity: lastActivity,
    previous_observed_activity: prevActivity,
    interval_between_last_two: intervalBetweenLastTwo,
    average_observed_interval: averageObservedInterval,
    activity_trend: activityTrend,
    activity_trend_label: activityTrendLabel,
    activity_trend_reason: activityTrendReason,
    events,
  }
}

/**
 * Generates rule-based sales comparison and evidence-backed observations
 */
export function compareSalesData(
  mySales: ProductSalesAnalysis,
  compSales: ProductSalesAnalysis
): SalesComparisonData {
  const myTotal = mySales.current_sales
  const compTotal = compSales.current_sales

  let salesDiff: number | null = null
  let salesDiffText = 'Sales data unavailable for direct comparison.'

  if (myTotal !== null && compTotal !== null) {
    salesDiff = myTotal - compTotal
    if (salesDiff > 0) {
      salesDiffText = `My product leads by ${salesDiff.toLocaleString()} sales`
    } else if (salesDiff < 0) {
      salesDiffText = `Competitor leads by ${Math.abs(salesDiff).toLocaleString()} sales`
    } else {
      salesDiffText = 'Identical verified sales volume'
    }
  }

  let salesGrowthComparison = 'Historical data unavailable'
  if (mySales.sales_growth_percentage !== null && compSales.sales_growth_percentage !== null) {
    const growthDiff = mySales.sales_growth_percentage - compSales.sales_growth_percentage
    if (growthDiff > 0) {
      salesGrowthComparison = `My product is growing ${growthDiff.toFixed(1)}% faster than competitor`
    } else if (growthDiff < 0) {
      salesGrowthComparison = `Competitor is growing ${Math.abs(growthDiff).toFixed(1)}% faster`
    } else {
      salesGrowthComparison = 'Similar sales growth rate'
    }
  } else if (mySales.sales_growth_percentage !== null) {
    salesGrowthComparison = `My product growth: ${mySales.sales_growth_percentage}%. Competitor: waiting for historical data.`
  } else if (compSales.sales_growth_percentage !== null) {
    salesGrowthComparison = `Competitor growth: ${compSales.sales_growth_percentage}%. My product: waiting for historical data.`
  }

  const avgActivity = `My product: ${mySales.sales_activity_status_label} | Competitor: ${compSales.sales_activity_status_label}`

  // Price comparison
  const myPrice = mySales.raw_envato_data?.product_price || 'Not specified'
  const compPrice = compSales.raw_envato_data?.product_price || 'Not specified'
  const priceComp = `My product: ${myPrice} vs Competitor: ${compPrice}`

  // Rating comparison
  const myRating = mySales.raw_envato_data?.rating
  const compRating = compSales.raw_envato_data?.rating
  const ratingComp =
    myRating && compRating
      ? `My product: ${myRating.toFixed(2)} ★ vs Competitor: ${compRating.toFixed(2)} ★`
      : 'Ratings not fully available'

  // Rating count comparison
  const myReviews = mySales.raw_envato_data?.review_count ?? 0
  const compReviews = compSales.raw_envato_data?.review_count ?? 0
  const ratingCountComp = `My product: ${myReviews} reviews vs Competitor: ${compReviews} reviews`

  // Last update comparison
  const myUpdate = mySales.raw_envato_data?.last_update_date || 'Not specified'
  const compUpdate = compSales.raw_envato_data?.last_update_date || 'Not specified'
  const lastUpdateComp = `My product: ${myUpdate} | Competitor: ${compUpdate}`

  // Rule-based Observations
  const observations: SalesObservation[] = []
  const today = new Date().toISOString()

  // Observation 1: Total Sales Volume
  if (myTotal !== null && compTotal !== null) {
    if (compTotal > myTotal) {
      observations.push({
        id: 'obs_total_sales_deficit',
        title: 'Competitor has higher accumulated sales volume',
        reason: 'Competitor has accumulated more sales on Envato Market over their lifetime on the marketplace.',
        supporting_data: `Competitor: ${compTotal.toLocaleString()} sales vs My Product: ${myTotal.toLocaleString()} sales (Difference: ${Math.abs(salesDiff!)} sales).`,
        source_url: compSales.source_url,
        confidence_level: 'high',
        date_generated: today,
      })
    } else if (myTotal > compTotal) {
      observations.push({
        id: 'obs_total_sales_lead',
        title: 'My product has higher accumulated sales volume',
        reason: 'Your product has reached a higher total sales volume in this category.',
        supporting_data: `My Product: ${myTotal.toLocaleString()} sales vs Competitor: ${compTotal.toLocaleString()} sales (+${salesDiff!} sales).`,
        source_url: mySales.source_url,
        confidence_level: 'high',
        date_generated: today,
      })
    }
  }

  // Observation 2: Price vs Sales Dynamic
  const myNumericPrice = parsePriceNumber(myPrice)
  const compNumericPrice = parsePriceNumber(compPrice)
  if (myNumericPrice !== null && compNumericPrice !== null && myTotal !== null && compTotal !== null) {
    if (myNumericPrice < compNumericPrice && myTotal < compTotal) {
      observations.push({
        id: 'obs_price_vs_sales',
        title: 'Lower price point without sales lead',
        reason: 'My product has a lower listed price but fewer accumulated sales. Check visibility, screenshots, demo quality, documentation, ratings, and positioning.',
        supporting_data: `My product price: $${myNumericPrice} (${myTotal} sales) vs Competitor: $${compNumericPrice} (${compTotal} sales).`,
        source_url: mySales.source_url,
        confidence_level: 'high',
        date_generated: today,
      })
    } else if (myNumericPrice < compNumericPrice && myTotal >= compTotal) {
      observations.push({
        id: 'obs_value_pricing_lead',
        title: 'Price advantage driving competitive sales volume',
        reason: 'Economical pricing combined with high feature delivery is driving healthy sales adoption against a higher-priced competitor.',
        supporting_data: `My product price: $${myNumericPrice} (${myTotal} sales) vs Competitor: $${compNumericPrice} (${compTotal} sales).`,
        source_url: mySales.source_url,
        confidence_level: 'high',
        date_generated: today,
      })
    }
  }

  // Observation 3: Rating & Review Volume Influence
  if (typeof myRating === 'number' && typeof compRating === 'number' && myReviews !== null && compReviews !== null) {
    if (compRating > myRating && compReviews > myReviews) {
      observations.push({
        id: 'obs_rating_advantage',
        title: 'Competitor social proof and rating advantage',
        reason: 'Higher rating and stronger review volume may contribute to buyer confidence.',
        supporting_data: `Competitor has ${compRating.toFixed(2)} ★ (${compReviews} reviews) vs My Product: ${myRating.toFixed(2)} ★ (${myReviews} reviews).`,
        source_url: compSales.source_url,
        confidence_level: 'high',
        date_generated: today,
      })
    } else if (myRating >= compRating && myReviews >= compReviews) {
      observations.push({
        id: 'obs_my_social_proof_lead',
        title: 'Strong customer satisfaction and review volume',
        reason: 'Higher ratings and strong review feedback support buyer trust and convert incoming visitors effectively.',
        supporting_data: `My product has ${myRating.toFixed(2)} ★ (${myReviews} reviews) vs Competitor: ${compRating.toFixed(2)} ★ (${compReviews} reviews).`,
        source_url: mySales.source_url,
        confidence_level: 'high',
        date_generated: today,
      })
    }
  }

  // Observation 4: Recency of Product Updates
  if (myUpdate && compUpdate && myUpdate !== 'Not specified' && compUpdate !== 'Not specified') {
    observations.push({
      id: 'obs_update_recency',
      title: 'Update cadence and platform compatibility',
      reason: 'Recent updates improve buyer confidence, bug fixes, and compatibility with the latest mobile OS / backend versions.',
      supporting_data: `My product last updated: ${myUpdate}. Competitor last updated: ${compUpdate}.`,
      source_url: mySales.source_url,
      confidence_level: 'medium',
      date_generated: today,
    })
  }

  // Observation 5: Public Discussion Engagement
  const myComments = mySales.raw_envato_data?.comment_count ?? 0
  const compComments = compSales.raw_envato_data?.comment_count ?? 0
  if (myComments > 0 || compComments > 0) {
    observations.push({
      id: 'obs_discussion_engagement',
      title: 'Marketplace comments & buyer inquiry volume',
      reason: 'Active public discussion indicates significant community and buyer interest.',
      supporting_data: `My product comments: ${myComments} inquiries vs Competitor comments: ${compComments} inquiries.`,
      source_url: compSales.source_url,
      confidence_level: 'medium',
      date_generated: today,
    })
  }

  // Observation 6: Activity Frequency Comparison
  const activityComparison = compareCompetitorActivity(mySales, compSales)
  if (activityComparison.has_enough_history) {
    observations.push({
      id: 'obs_activity_frequency',
      title: 'Observed sales activity frequency comparison',
      reason: 'Comparing the frequency of verified sales increases reveals current market momentum and buyer acquisition cadence.',
      supporting_data: activityComparison.comparison_insight,
      source_url: compSales.source_url,
      confidence_level: 'high',
      date_generated: today,
    })
  }

  return {
    my_total_sales: myTotal,
    competitor_total_sales: compTotal,
    sales_difference: salesDiff,
    sales_difference_text: salesDiffText,
    sales_growth_comparison: salesGrowthComparison,
    average_sales_activity: avgActivity,
    price_comparison: priceComp,
    rating_comparison: ratingComp,
    rating_count_comparison: ratingCountComp,
    last_update_comparison: lastUpdateComp,
    observations,
    activity_comparisons: [activityComparison],
  }
}

/**
 * Compares observed sales activity between target SaaS and a competitor.
 */
export function compareCompetitorActivity(
  mySales: ProductSalesAnalysis,
  compSales: ProductSalesAnalysis
): CompetitorSalesActivityComparison {
  const myTimeline = mySales.sales_activity_timeline
  const compTimeline = compSales.sales_activity_timeline
  const compName = compSales.raw_envato_data?.product_name || 'Competitor Product'
  const myCount = myTimeline?.total_observed_events ?? 0
  const compCount = compTimeline?.total_observed_events ?? 0

  const myAvg = myTimeline?.average_observed_interval?.formatted || myTimeline?.interval_between_last_two?.formatted || null
  const compAvg = compTimeline?.average_observed_interval?.formatted || compTimeline?.interval_between_last_two?.formatted || null

  const hasHistory = Boolean(
    (myTimeline && myTimeline.total_observed_events > 0) ||
    (compTimeline && compTimeline.total_observed_events > 0)
  )

  let insight = 'Insufficient sales history for comparative activity analysis.'

  if (!hasHistory) {
    insight = 'Insufficient sales history: monitoring ongoing to record observed sales increases across products.'
  } else if (compCount > myCount) {
    insight = `${compName} shows more frequent observed sales increases (${compCount} observed increase${compCount === 1 ? '' : 's'}) than your product (${myCount} observed increase${myCount === 1 ? '' : 's'}) over the available observation period.`
  } else if (myCount > compCount) {
    insight = `Your product shows more frequent observed sales increases (${myCount} observed increase${myCount === 1 ? '' : 's'}) than ${compName} (${compCount} observed increase${compCount === 1 ? '' : 's'}) over the available observation period.`
  } else {
    insight = `Comparable sales activity frequency: both products recorded ${myCount} observed sales increase${myCount === 1 ? '' : 's'} over the available observation period.`
  }

  return {
    competitor_url: compSales.source_url,
    competitor_name: compName,
    target_observed_increases: myCount,
    competitor_observed_increases: compCount,
    target_average_interval: myAvg,
    competitor_average_interval: compAvg,
    comparison_insight: insight,
    has_enough_history: hasHistory,
  }
}

function parsePriceNumber(priceStr?: string | null): number | null {
  if (!priceStr) return null
  const m = priceStr.match(/([0-9]+(\.[0-9]+)?)/)
  return m ? parseFloat(m[1]) : null
}

export function compareMultiSalesData(
  mySales: ProductSalesAnalysis | null,
  competitorSalesList: ProductSalesAnalysis[],
  competitorProducts: ExtractedProductData[]
): MultiCompetitorSalesComparison {
  const myTotal = mySales?.current_sales ?? null

  const competitor_rows: CompetitorSalesRow[] = competitorSalesList.map((compSales, idx) => {
    const compProduct = competitorProducts[idx]
    const compTotal = compSales.current_sales ?? null

    let salesDiff: number | null = null
    let salesDiffPct: number | null = null

    if (myTotal !== null && compTotal !== null) {
      salesDiff = compTotal - myTotal
      if (myTotal > 0) {
        salesDiffPct = Math.round(((compTotal - myTotal) / myTotal) * 100)
      }
    }

    const hasSnapshots = (compSales.sales_history && compSales.sales_history.length > 1)
    let activityStatus: 'Growing' | 'Stable' | 'No historical data' = 'No historical data'
    if (hasSnapshots) {
      if ((compSales.sales_difference || 0) > 0 || (compSales.sales_gained_24h || 0) > 0 || (compSales.sales_gained_7d || 0) > 0) {
        activityStatus = 'Growing'
      } else {
        activityStatus = 'Stable'
      }
    }

    return {
      url: compSales.source_url,
      productName: compProduct?.productName || compSales.raw_envato_data?.product_name || 'Competitor Product',
      authorName: compSales.raw_envato_data?.author_name || 'Author',
      price: compSales.raw_envato_data?.product_price || 'Not specified',
      current_sales: compTotal,
      sales_diff_vs_target: salesDiff,
      sales_diff_percentage: salesDiffPct,
      sales_24h: compSales.sales_gained_24h,
      sales_7d: compSales.sales_gained_7d,
      sales_30d: compSales.sales_gained_30d,
      avg_daily_sales: compSales.average_sales_per_day,
      last_observed_increase: compSales.last_sales_increase,
      activity_status: activityStatus,
      latest_observation_time: compSales.sales_history[0]?.collected_at || new Date().toISOString(),
      has_historical_snapshots: hasSnapshots,
      salesAnalysis: compSales,
      activity_timeline: compSales.sales_activity_timeline || null,
    }
  })

  // Aggregate observations across competitors
  const overall_observations: SalesObservation[] = []
  if (mySales && competitorSalesList.length > 0) {
    const primaryComp = competitorSalesList[0]
    const compData = compareSalesData(mySales, primaryComp)
    overall_observations.push(...compData.observations)
  }

  // Activity comparisons across all competitors
  const activity_comparisons: CompetitorSalesActivityComparison[] = []
  if (mySales) {
    competitorSalesList.forEach((compSales) => {
      activity_comparisons.push(compareCompetitorActivity(mySales, compSales))
    })
  }

  return {
    my_sales: mySales,
    competitor_rows,
    overall_observations,
    activity_comparisons,
  }
}

/**
 * Calculates a deterministic trend sales forecast based on historical sales snapshots.
 * Adheres strictly to the requirement: if snapshots < 7 daily observations, returns is_available: false
 * with an honest explanatory reason, never generating unbacked numbers.
 */
export function calculateSalesForecast(
  history: SalesSnapshotItem[],
  currentSales: number | null
): SalesForecastData {
  if (currentSales === null || !history || history.length < 7) {
    return {
      is_available: false,
      historical_data_points: history?.length || 0,
      minimum_points_required: 7,
      model_type: 'Insufficient Data',
      prediction_period_days: 7,
      forecasted_sales_low: null,
      forecasted_sales_expected: null,
      forecasted_sales_high: null,
      projected_units_gain: null,
      confidence_score: null,
      confidence_label: 'Insufficient Data',
      reason: `Forecasting requires at least 7 historical snapshot observations (currently ${history?.length || 0} recorded). Daily automated monitor collects snapshots over time to produce validated predictions.`,
    }
  }

  // Filter valid snapshots with sales numbers
  const valid = history
    .filter((h) => typeof h.total_sales === 'number' && h.total_sales !== null)
    .sort((a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime())

  if (valid.length < 7) {
    return {
      is_available: false,
      historical_data_points: valid.length,
      minimum_points_required: 7,
      model_type: 'Insufficient Data',
      prediction_period_days: 7,
      forecasted_sales_low: null,
      forecasted_sales_expected: null,
      forecasted_sales_high: null,
      projected_units_gain: null,
      confidence_score: null,
      confidence_label: 'Insufficient Data',
      reason: `Forecasting requires at least 7 valid numerical data points (currently ${valid.length} valid snapshots).`,
    }
  }

  // Calculate daily velocity across the timeline
  const first = valid[0]
  const last = valid[valid.length - 1]
  const timeSpanDays = Math.max(
    (new Date(last.collected_at).getTime() - new Date(first.collected_at).getTime()) / (1000 * 60 * 60 * 24),
    0.5
  )
  const salesGained = Math.max((last.total_sales || 0) - (first.total_sales || 0), 0)
  const dailyVelocity = salesGained / timeSpanDays

  // Recent 7-point window velocity
  const recentWindow = valid.slice(-7)
  const recentSpanDays = Math.max(
    (new Date(recentWindow[recentWindow.length - 1].collected_at).getTime() - new Date(recentWindow[0].collected_at).getTime()) / (1000 * 60 * 60 * 24),
    0.5
  )
  const recentGained = Math.max((recentWindow[recentWindow.length - 1].total_sales || 0) - (recentWindow[0].total_sales || 0), 0)
  const recentVelocity = recentGained / recentSpanDays

  // Blended weighted daily run rate (60% recent velocity, 40% overall velocity)
  const blendedDailyRunRate = recentVelocity * 0.6 + dailyVelocity * 0.4
  const projected7DayGain = Math.round(blendedDailyRunRate * 7)

  // Prediction intervals
  const expectedForecast = currentSales + projected7DayGain
  const varianceMargin = Math.max(Math.round(projected7DayGain * 0.25), 1)
  const lowForecast = Math.max(currentSales, expectedForecast - varianceMargin)
  const highForecast = expectedForecast + varianceMargin

  // Confidence estimation based on data volume and stability
  const sampleCountFactor = Math.min(valid.length / 30, 1.0)
  const confidenceScore = Math.round((0.65 + sampleCountFactor * 0.25) * 100) / 100
  const confidenceLabel: 'High' | 'Medium' | 'Low' =
    confidenceScore >= 0.85 ? 'High' : confidenceScore >= 0.7 ? 'Medium' : 'Low'

  return {
    is_available: true,
    historical_data_points: valid.length,
    minimum_points_required: 7,
    model_type: 'Deterministic Trend Extrapolation (Baseline)',
    prediction_period_days: 7,
    forecasted_sales_low: lowForecast,
    forecasted_sales_expected: expectedForecast,
    forecasted_sales_high: highForecast,
    projected_units_gain: projected7DayGain,
    confidence_score: confidenceScore,
    confidence_label: confidenceLabel,
  }
}


