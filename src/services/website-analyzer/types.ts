export interface PricingPlanExtracted {
  name: string
  priceMonthly: string
  priceAnnual: string
  features: string[]
  isPopular?: boolean
}

export interface DiscoveredPage {
  title: string
  url: string
  type: 'pricing' | 'features' | 'changelog' | 'blog' | 'docs' | 'about' | 'contact' | 'other'
}

export interface EnvatoSalesData {
  product_name: string
  product_url: string
  current_total_sales: number | null
  product_price: string | null
  discounted_price: string | null
  rating: number | null
  rating_count: number | null
  review_count: number | null
  comment_count: number | null
  publication_date: string | null
  last_update_date: string | null
  version: string | null
  author_name: string | null
  category: string | null
  product_status: string | null
  sales_data_unavailable: boolean
  thumbnail_url?: string | null
}

export interface ExtractedProductData {
  url: string
  normalizedUrl: string
  productName: string
  websiteTitle: string
  description: string
  category: string
  targetCustomers: string[]
  useCases: string[]
  features: string[]
  pricingPlans: PricingPlanExtracted[]
  hasFreePlan: boolean
  hasFreeTrial: boolean
  freeTrialDetails: string
  integrations: string[]
  mainBenefits: string[]
  positioningClaims: string[]
  contactOrDemoCta: string
  changelogLink: string
  blogLink: string
  docsLink: string
  testimonials: Array<{ quote: string; author?: string }>
  discoveredPages: DiscoveredPage[]
  collectionErrors: string[]
  analyzedAt: string
  envatoSales?: EnvatoSalesData | null
  thumbnailUrl?: string | null
  headings?: { h1: string[]; h2: string[]; h3: string[] }
  tags?: string[]
}

export interface ProductComparison {
  myExclusiveFeatures: string[]
  competitorExclusiveFeatures: string[]
  sharedFeatures: string[]
  pricingDifferences: Array<{
    category: string
    myProduct: string
    competitor: string
    difference: string
  }>
  freePlanComparison: {
    myProduct: boolean
    competitor: boolean
    notes: string
  }
  trialComparison: {
    myProduct: string
    competitor: string
    notes: string
  }
  targetAudienceDifferences: {
    myProduct: string[]
    competitor: string[]
    differences: string
  }
  positioningDifferences: {
    myProductHeadline: string
    competitorHeadline: string
    summary: string
  }
  myStrengths: string[]
  competitorStrengths: string[]
  productGaps: string[]
  pricingAdvantages: string[]
  improvementAreas: string[]
  importantRisks: string[]
}

export interface RuleRecommendation {
  id: string
  title: string
  reason: string
  evidence: string
  sourceUrl: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  ruleTriggered: string
  suggestedAction: string
}

export interface SalesSnapshotItem {
  id: string
  source_url: string
  collected_at: string
  total_sales: number | null
  sales_gained_since_previous: number | null
  price: string | null
  rating: number | null
  review_count: number | null
  comment_count: number | null
}

export interface ProductSalesAnalysis {
  current_sales: number | null
  previous_sales: number | null
  sales_difference: number | null
  sales_growth_percentage: number | null
  sales_gained_24h: number | null
  sales_gained_7d: number | null
  sales_gained_30d: number | null
  average_sales_per_day: number | null
  average_sales_per_week: number | null
  sales_activity_status:
    | 'high_activity'
    | 'moderate_activity'
    | 'low_activity'
    | 'no_recent_increase'
    | 'insufficient_historical_data'
  sales_activity_status_label: string
  last_sales_increase: string | null
  time_since_last_increase: string | null
  sales_history: SalesSnapshotItem[]
  source_url: string
  error: string | null
  raw_envato_data?: EnvatoSalesData | null
}

export interface SalesObservation {
  id: string
  title: string
  reason: string
  supporting_data: string
  source_url: string
  confidence_level: 'high' | 'medium' | 'low'
  date_generated: string
}

export interface SalesComparisonData {
  my_total_sales: number | null
  competitor_total_sales: number | null
  sales_difference: number | null
  sales_difference_text: string
  sales_growth_comparison: string
  average_sales_activity: string
  price_comparison: string
  rating_comparison: string
  rating_count_comparison: string
  last_update_comparison: string
  observations: SalesObservation[]
}

export interface CompetitorSalesRow {
  url: string
  productName: string
  authorName: string
  price: string
  current_sales: number | null
  sales_diff_vs_target: number | null
  sales_diff_percentage: number | null
  sales_24h: number | null
  sales_7d: number | null
  sales_30d: number | null
  avg_daily_sales: number | null
  last_observed_increase: string | null
  activity_status: 'Growing' | 'Stable' | 'No historical data'
  latest_observation_time: string
  has_historical_snapshots: boolean
  salesAnalysis: ProductSalesAnalysis
}

export interface MultiCompetitorSalesComparison {
  my_sales: ProductSalesAnalysis | null
  competitor_rows: CompetitorSalesRow[]
  overall_observations: SalesObservation[]
}

// ─────────────────────────────────────────────
// SEO ANALYSIS TYPES
// ─────────────────────────────────────────────

export interface SeoOnPageAudit {
  url: string
  product_name: string
  title: string
  title_length: number
  title_words: number
  main_keyword: string
  keyword_in_title: boolean
  keyword_placement: 'beginning' | 'middle' | 'end' | 'missing'
  description_length: number
  description_words: number
  keyword_usage_description: number
  keyword_stuffing_warning: boolean
  heading_structure: {
    h1: string[]
    h2_count: number
    h3_count: number
  }
  relevant_feature_keywords: string[]
  tags: string[]
  category_relevance: string
  image_alts_count: number
  links: {
    has_demo: boolean
    has_docs: boolean
    has_changelog: boolean
    has_support: boolean
  }
  readability_score: 'Clear & Concise' | 'Moderate' | 'Complex / Dense'
  duplicate_generic_warnings: string[]
  missing_important_info: string[]
  on_page_score: number
}

export interface SeoKeywordComparisonRow {
  keyword: string
  my_rank: number | null
  previous_rank: number | null
  rank_trend: 'Improved' | 'Declined' | 'Stable' | 'Unranked' | 'New'
  rank_diff: number | null
  competitor_ranks: Record<string, number | null>
  rank_gap: number | null
  search_visibility_status:
    | 'Leading'
    | 'Competitive'
    | 'Behind competitor'
    | 'Competitor ranks, we do not'
    | 'Ranking data unavailable for this keyword'
  missing_from_my_listing: boolean
  in_my_title: boolean
  in_my_tags: boolean
  in_competitor_titles: Record<string, boolean>
  content_strength: 'Higher' | 'Equal' | 'Lower'
  recommended_action: string
}

export interface SeoRecommendationItem {
  id: string
  category: 'title' | 'subtitle' | 'tags' | 'description' | 'faq' | 'headings' | 'features'
  title: string
  what_was_detected: string
  why_it_matters: string
  what_should_be_changed: string
  expected_benefit: string
  confidence_level: 'High' | 'Medium' | 'Low'
  triggering_source: string
  suggested_content: string | string[]
}

export interface SeoAnalysisResult {
  audits: Record<string, SeoOnPageAudit>
  target_keywords: string[]
  suggested_keywords: string[]
  comparison_table: SeoKeywordComparisonRow[]
  recommendations: SeoRecommendationItem[]
  search_metadata: {
    last_checked: string
    location: string
    engine: string
    device: string
    source: string
  }
}

// ─────────────────────────────────────────────
// PUBLIC COMMENTS & REVIEWS ANALYSIS TYPES
// ─────────────────────────────────────────────

export interface RecurringComplaintGroup {
  id: string
  competitor_url: string
  competitor_name: string
  complaint_category: string
  short_summary: string
  mention_count: number
  first_detected_date?: string
  latest_occurrence_date: string
  representative_comment: string
  comment_url: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence_score?: number
  confidence_level: 'High' | 'Medium' | 'Low'
  is_critical: boolean
  related_product_update?: string | null
  current_status?:
    | 'New'
    | 'Under Review'
    | 'Confirmed'
    | 'Rejected'
    | 'Converted to Opportunity'
    | 'Resolved'
  trend?:
    | 'New'
    | 'Increasing'
    | 'Decreasing'
    | 'Persistent'
    | 'After Competitor Update'
    | 'Critical Spike'
    | 'Stable'
  related_opportunity_id?: string | null
  feedback_type?: 'complaint' | 'suggestion' | 'feature_request' | 'improvement' | 'inquiry'
  is_suggestive?: boolean
  comments?: PublicComment[]
}

export interface PublicComment {
  id: string
  product_url: string
  product_name: string
  author_name: string
  comment_text: string
  comment_url: string | null
  comment_date: string | null
  rating?: number | null
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | 'uncertain'
  topic:
    | 'bugs_errors'
    | 'installation_problems'
    | 'poor_documentation'
    | 'missing_feature'
    | 'compatibility_problem'
    | 'slow_performance'
    | 'poor_support'
    | 'outdated_code'
    | 'security_concern'
    | 'pricing_dissatisfaction'
    | 'update_request'
    | 'feature_suggestion'
    | 'improvement_suggestion'
    | 'integration_request'
    | 'workflow_customization'
    | 'general_question'
  topic_label: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detected_issue: string
  relevant_feature: string
  suggested_angle: string
  confidence: 'high' | 'medium' | 'low'
  confidence_score?: number
  feedback_type?: 'complaint' | 'suggestion' | 'feature_request' | 'improvement' | 'inquiry'
  is_suggestive?: boolean
  collected_at: string
}

export interface CompetitorCommentsSummary {
  product_url: string
  product_name: string
  competitor_name?: string
  total_comments: number
  positive_count: number
  negative_count: number
  neutral_count: number
  suggestive_count?: number
  comments_unavailable: boolean
  common_complaints: Array<{ topic: string; count: number; sample: string; comments?: PublicComment[] }>
  suggestions?: Array<{ topic: string; count: number; sample: string; comments?: PublicComment[] }>
  requested_features: string[]
  recent_negative_count: number
  sentiment_trend: 'Positive' | 'Mixed' | 'Heavy Complaints' | 'Comments unavailable' | 'Insufficient data'
}

export interface SalesCommentCorrelationObservation {
  competitor_name: string
  trend_text: string
  sales_impact_text: string
}

export interface SalesCommentCorrelation {
  correlation_summary: string
  label: 'Possible correlation; not a proven cause'
  observations: SalesCommentCorrelationObservation[]
}

export interface CommentsAnalysisResult {
  summaries: CompetitorCommentsSummary[]
  recurring_complaints: RecurringComplaintGroup[]
  comments: PublicComment[]
  total_analyzed: number
  unresolved_count: number
  unavailable_competitors: string[]
  sales_comment_correlation?: SalesCommentCorrelation | null
}

// ─────────────────────────────────────────────
// OPPORTUNITIES & INSIGHTS TYPES
// ─────────────────────────────────────────────

export interface OpportunityRecord {
  id: string
  competitor_url: string
  competitor_name: string
  comment_url: string | null
  comment_date: string | null
  issue_category: string
  comment_summary: string
  why_relevant: string
  matching_feature: string
  has_matching_feature: boolean
  value_proposition: string
  draft_message: string
  mention_count: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence_level: 'High' | 'Medium' | 'Low'
  status:
    | 'New'
    | 'Needs review'
    | 'Reviewed'
    | 'Relevant'
    | 'Not relevant'
    | 'Message drafted'
    | 'Contacted manually'
    | 'Converted'
    | 'Closed'
  created_at: string
}

export interface CompetitorInsightItem {
  id: string
  title: string
  evidence: string
  source: string
  explanation: string
  recommended_action: string
  priority: 'high' | 'medium' | 'low'
  confidence_level: 'high' | 'medium' | 'low'
  date_observed: string
}

// ─────────────────────────────────────────────
// COMPLETE ANALYSIS RESPONSE
// ─────────────────────────────────────────────

export interface AnalysisResponseData {
  analysis_id: string
  project_name?: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  my_url: string
  competitor_url: string
  competitor_urls: string[]
  created_at: string
  completed_at?: string
  error_message?: string
  my_product: ExtractedProductData | null
  competitor_product: ExtractedProductData | null
  competitors_data: ExtractedProductData[]
  comparison: ProductComparison | null
  recommendations: RuleRecommendation[]
  collection_errors: {
    my_product: string[]
    competitor_product: string[]
  }
  my_sales_analysis?: ProductSalesAnalysis | null
  competitor_sales_analysis?: ProductSalesAnalysis | null
  sales_comparison?: SalesComparisonData | null
  multi_sales_comparison?: MultiCompetitorSalesComparison | null
  seo_analysis?: SeoAnalysisResult | null
  comments_analysis?: CommentsAnalysisResult | null
  opportunities?: OpportunityRecord[] | null
  insights?: CompetitorInsightItem[] | null
  activities?: any[] | null
  last_activity_check_at?: string | null
  next_activity_check_at?: string | null
}
