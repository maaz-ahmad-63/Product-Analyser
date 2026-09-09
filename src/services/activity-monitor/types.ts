// src/services/activity-monitor/types.ts
// Domain types for hourly product activity monitoring and rule-based change analysis

export type ActivityType =
  | 'sales_increase'
  | 'rating_changed'
  | 'comments_count_changed'
  | 'recurring_complaint_detected'
  | 'suggestive_feedback_detected'
  | 'price_changed'
  | 'product_updated'
  | 'feature_support_changed'
  | 'collection_failed';

export type ActivityImpact = 'positive' | 'negative' | 'neutral';

export interface ProductActivityItem {
  id?: string;
  analysisId: string;
  userId?: string | null;
  productUrl: string;
  productName: string;
  isOurProduct: boolean;
  activityType: ActivityType;
  activityTitle: string;
  whatChanged: string;
  impactType: ActivityImpact;
  previousValue?: string | null;
  currentValue?: string | null;
  deltaValue?: number | null;
  competitorComparison?: string | null;
  possibleReasons?: string | null;
  recommendedActions?: string | null;
  snapshotTimestamp: Date;
  createdAt?: Date;
}

export interface ProductSnapshotData {
  sourceUrl: string;
  productName: string;
  authorName?: string | null;
  totalSales: number | null;
  price?: string | null;
  discountedPrice?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  reviewCount?: number | null;
  commentCount?: number | null;
  publicationDate?: string | null;
  lastUpdateDate?: string | null;
  version?: string | null;
  category?: string | null;
  productStatus?: string | null;
  demoAvailable?: boolean | null;
  docsAvailable?: boolean | null;
  supportAvailable?: boolean | null;
  featuresCount?: number | null;
  recentComments?: Array<{
    id?: string;
    text: string;
    date?: string;
    sentiment?: string;
    rating?: number;
  }>;
  collectionStatus: 'success' | 'partial' | 'failed';
  collectionError?: string | null;
}

export interface ActivityAnalysisReport {
  whatChanged: string;
  productName: string;
  productUrl: string;
  isOurProduct: boolean;
  impactType: ActivityImpact;
  competitorComparison: string;
  possibleReasons: string;
  recommendedActions: string;
}

export interface MonitoringCycleProjectResult {
  analysisId: string;
  projectName?: string | null;
  productsChecked: number;
  activitiesCreated: number;
  errors: string[];
  lastCheckedAt: Date;
  nextScheduledCheckAt: Date;
}

export interface HourlyMonitoringStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  activeProjectsCount: number;
  totalActivitiesCount: number;
  lastError: string | null;
}
