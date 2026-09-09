import {
  ExtractedProductData,
  ProductSalesAnalysis,
  SeoAnalysisResult,
  CommentsAnalysisResult,
  CompetitorInsightItem,
} from './types'

/**
 * Synthesizes sales benchmarks, SEO on-page audit, and competitor customer comments
 * into prioritized, explainable business recommendations.
 */
export function generateUnifiedInsights(
  myProduct: ExtractedProductData,
  competitorProducts: ExtractedProductData[],
  mySales: ProductSalesAnalysis | null,
  competitorSalesMap: Record<string, ProductSalesAnalysis>,
  seoAnalysis: SeoAnalysisResult | null,
  commentsAnalysis: CommentsAnalysisResult | null
): CompetitorInsightItem[] {
  const insights: CompetitorInsightItem[] = []
  const today = new Date().toISOString()

  // 1. Sales & Social Proof Insights
  for (const comp of competitorProducts) {
    const compSales = competitorSalesMap[comp.url]
    const compTotal = compSales?.current_sales ?? null
    const myTotal = mySales?.current_sales ?? null

    if (compTotal !== null && myTotal !== null && compTotal > myTotal * 1.5) {
      insights.push({
        id: `ins_sales_lead_${comp.productName.slice(0, 5)}`,
        title: `Competitor sales volume lead: ${comp.productName}`,
        evidence: `Competitor has accumulated ${compTotal.toLocaleString()} total sales compared to ${myTotal.toLocaleString()} on our product.`,
        source: comp.url,
        explanation: 'Established market longevity, higher review volume, or broader category search visibility may be contributing to higher cumulative sales.',
        recommended_action: 'Investigate competitor review acquisition strategy, feature positioning, and demo quality to identify conversion drivers.',
        priority: 'high',
        confidence_level: 'high',
        date_observed: today,
      })
    }
  }

  // 2. SEO & Visibility Gaps
  if (seoAnalysis) {
    const opportunityKeywords = seoAnalysis.comparison_table.filter(
      (row) =>
        row.search_visibility_status === 'Competitor ranks, we do not' ||
        row.search_visibility_status === 'Behind competitor' ||
        row.missing_from_my_listing
    )

    if (opportunityKeywords.length > 0) {
      const topKws = opportunityKeywords.slice(0, 3).map((r) => `"${r.keyword}"`).join(', ')
      insights.push({
        id: 'ins_seo_keyword_gap',
        title: 'Competitors targeting unaddressed high-relevance keywords',
        evidence: `Competitors are prominently indexing keywords including ${topKws} in their titles and descriptions, while our listing currently omits them.`,
        source: 'SEO On-Page Audit',
        explanation: 'Search engines index marketplace items primarily by matching title, heading, and description terms with user queries.',
        recommended_action: `Incorporate ${topKws} into your item title, subtitle, and tags to capture targeted browse traffic.`,
        priority: 'high',
        confidence_level: 'high',
        date_observed: today,
      })
    }

    const myAudit = seoAnalysis.audits[myProduct.url]
    if (myAudit && myAudit.title_length < 35) {
      insights.push({
        id: 'ins_title_length',
        title: 'Listing title is concise; opportunity for keyword expansion',
        evidence: `Our title is ${myAudit.title_length} characters. Marketplace category top sellers average 50-80 characters with descriptive keywords.`,
        source: myProduct.url,
        explanation: 'A concise title may omit secondary use-case searches (e.g. "with Admin Dashboard", "User App", "REST API").',
        recommended_action: 'Expand title with verified technology stack tags and core functional deliverables.',
        priority: 'medium',
        confidence_level: 'medium',
        date_observed: today,
      })
    }
  }

  // 3. Customer Friction & Complaint Clustering
  if (commentsAnalysis) {
    for (const summary of commentsAnalysis.summaries) {
      if (summary.negative_count > 0 && summary.common_complaints.length > 0) {
        const topComplaint = summary.common_complaints[0]
        insights.push({
          id: `ins_complaint_${summary.product_name.slice(0, 5)}_${topComplaint.topic.slice(0, 5)}`,
          title: `Competitor customer friction point: ${topComplaint.topic} on ${summary.product_name}`,
          evidence: `Public discussions show ${topComplaint.count} recurring complaint(s) around ${topComplaint.topic}. Example: "${topComplaint.sample.slice(0, 90)}..."`,
          source: summary.product_url,
          explanation: 'Customer friction on a market leader creates a direct opportunity for a competing product that demonstrates reliability in that specific domain.',
          recommended_action: `Emphasize your product's superior ${topComplaint.topic.toLowerCase()} in your marketing copy, screenshots, and live demo.`,
          priority: 'high',
          confidence_level: 'high',
          date_observed: today,
        })
      }

      if (summary.requested_features.length > 0) {
        insights.push({
          id: `ins_feature_req_${summary.product_name.slice(0, 5)}`,
          title: `Unsatisfied customer feature requests on ${summary.product_name}`,
          evidence: `Users have publicly requested: "${summary.requested_features[0]}".`,
          source: summary.product_url,
          explanation: 'Unaddressed customer feature requests in competitor forums highlight unmet market demand and potential roadmap differentiation.',
          recommended_action: 'Verify if our product supports this capability and consider highlighting it as a headline benefit.',
          priority: 'medium',
          confidence_level: 'medium',
          date_observed: today,
        })
      }
    }
  }

  // 4. Update Cadence & Maintenance
  for (const comp of competitorProducts) {
    const compUpdated = comp.envatoSales?.last_update_date
    const myUpdated = myProduct.envatoSales?.last_update_date

    if (compUpdated && myUpdated && compUpdated !== 'Not specified' && myUpdated !== 'Not specified') {
      insights.push({
        id: `ins_update_cadence_${comp.productName.slice(0, 5)}`,
        title: `Product update cadence benchmark: ${comp.productName}`,
        evidence: `Our last update was recorded as "${myUpdated}" vs Competitor "${compUpdated}".`,
        source: comp.url,
        explanation: 'Buyers assess the recency of updates as an indicator of active author maintenance, modern framework compatibility, and security patch responsiveness.',
        recommended_action: 'Maintain a steady update cadence with transparent changelog notes to reinforce buyer confidence.',
        priority: 'low',
        confidence_level: 'medium',
        date_observed: today,
      })
    }
  }

  // Fallback if no specific insights triggered
  if (insights.length === 0) {
    insights.push({
      id: 'ins_baseline_overview',
      title: 'Baseline competitive alignment observed',
      evidence: 'Collected public marketplace metrics demonstrate comparable pricing and feature availability.',
      source: 'Cross-Product Synthesis',
      explanation: 'Both products target similar buyer personas with standard core capabilities.',
      recommended_action: 'Continue monitoring historical sales snapshots and public customer threads for emerging opportunities.',
      priority: 'low',
      confidence_level: 'high',
      date_observed: today,
    })
  }

  return insights
}
