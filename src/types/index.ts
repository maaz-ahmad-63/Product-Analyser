export type ChangeType =
  | 'pricing_change'
  | 'new_feature'
  | 'removed_feature'
  | 'website_change'
  | 'positioning_change'
  | 'changelog_update'
  | 'review_trend'
  | 'support_complaint_trend'

export type Importance = 'critical' | 'high' | 'medium' | 'low'
export type ChangeStatus = 'reviewed' | 'pending_review' | 'action_taken' | 'dismissed'

export interface CompetitorChange {
  id: string
  competitorId: string
  competitorName: string
  changeType: ChangeType
  previousValue: string
  newValue: string
  detectedDate: string
  importance: Importance
  impact: string
  status: ChangeStatus
  sourceUrl: string
  sourceType: string
}

export type RecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'postponed'
  | 'in_progress'
  | 'completed'
  | 'successful'
  | 'partially_successful'
  | 'failed'
  | 'inconclusive'

export interface Recommendation {
  id: string
  title: string
  problem: string
  evidence: string
  sourceUrl: string
  reason: string
  priority: Importance
  confidenceScore: number
  expectedImpact: string
  suggestedAction: string
  status: RecommendationStatus
  createdDate: string
  evaluationDate?: string
  actionTaken?: string
}

export type OpportunityStatus =
  | 'detected'
  | 'needs_review'
  | 'draft_created'
  | 'awaiting_approval'
  | 'approved'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'offer_sent'
  | 'converted'
  | 'not_interested'
  | 'no_response'
  | 'invalid'
  | 'do_not_contact'

export interface CustomerOpportunity {
  id: string
  opportunityScore: number // 0.00 to 1.00
  sourcePlatform: string
  competitorName: string
  publicComment: string
  detectedProblem: string
  matchingProductFeature: string
  intentType: 'seeking_alternative' | 'complaining_price' | 'missing_feature' | 'support_frustration'
  relevance: 'high' | 'medium' | 'low'
  status: OpportunityStatus
  dateDetected: string
  sourceUrl: string
  draftMessage?: string
}

export interface CompetitorSummary {
  id: string
  name: string
  websiteUrl: string
  status: 'active' | 'paused' | 'error'
  lastCheckedTime: string
  monitoringFrequency: string
  pricingSummary: string
  featureSummary: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  sourcesCount: number
}

export interface MetricSummary {
  competitorsMonitored: number
  competitorsDelta: number
  changesDetected: number
  changesDelta: number
  negativeFeedbackRate: number
  negativeFeedbackDelta: number
  openRecommendations: number
  opportunitiesDetected: number
  qualifiedLeads: number
  conversionRate: number
  monitoringStatus: 'healthy' | 'degraded' | 'paused'
}
