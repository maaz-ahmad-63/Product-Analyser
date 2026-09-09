import { prisma } from '@/lib/prisma'
import {
  EnvatoSalesData,
  ProductSalesAnalysis,
  SalesSnapshotItem,
  SalesComparisonData,
  SalesObservation,
  MultiCompetitorSalesComparison,
  CompetitorSalesRow,
  ExtractedProductData,
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
    }
  })

  // Aggregate observations across competitors
  const overall_observations: SalesObservation[] = []
  if (mySales && competitorSalesList.length > 0) {
    const primaryComp = competitorSalesList[0]
    const compData = compareSalesData(mySales, primaryComp)
    overall_observations.push(...compData.observations)
  }

  return {
    my_sales: mySales,
    competitor_rows,
    overall_observations,
  }
}

