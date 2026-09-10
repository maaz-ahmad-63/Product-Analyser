-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'credentials',
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "description" TEXT,
    "targetAudience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "provider" TEXT,
    "accessMethod" TEXT NOT NULL DEFAULT 'http',
    "permissionStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastCollectedAt" TIMESTAMP(3),
    "collectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "monitoringFrequencyHours" INTEGER NOT NULL DEFAULT 24,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT,
    "competitorId" TEXT,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT,
    "headline" TEXT,
    "description" TEXT,
    "features" JSONB,
    "integrations" JSONB,
    "pricingSummary" TEXT,
    "targetAudience" TEXT,
    "useCases" JSONB,
    "testimonials" JSONB,
    "contentHash" TEXT NOT NULL,
    "rawContent" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT,
    "headline" TEXT,
    "description" TEXT,
    "features" JSONB,
    "integrations" JSONB,
    "pricingSummary" TEXT,
    "targetAudience" TEXT,
    "useCases" JSONB,
    "testimonials" JSONB,
    "contentHash" TEXT NOT NULL,
    "rawContent" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "competitorId" TEXT,
    "planName" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "billingPeriod" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "features" JSONB,
    "trialAvailable" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "competitorId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sourceUrl" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "competitorId" TEXT,
    "planName" TEXT NOT NULL,
    "oldPrice" DECIMAL(10,2),
    "newPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitorId" TEXT,
    "productId" TEXT,
    "sourceId" TEXT,
    "externalReviewId" TEXT,
    "reviewerName" TEXT,
    "reviewText" TEXT NOT NULL,
    "rating" DECIMAL(3,1),
    "reviewDate" TIMESTAMP(3),
    "sourceUrl" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitorId" TEXT,
    "sourceId" TEXT,
    "commentText" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "authorReference" TEXT,
    "publishedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissionStatus" TEXT NOT NULL DEFAULT 'public',

    CONSTRAINT "public_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentiment_analyses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewId" TEXT,
    "commentId" TEXT,
    "sentiment" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "complaintCategory" TEXT,
    "topics" JSONB,
    "customerIntent" TEXT,
    "summary" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentiment_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'medium',
    "sourceUrl" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "missingFeatures" JSONB,
    "positioningIssues" JSONB,
    "pricingIssues" JSONB,
    "conversionIssues" JSONB,
    "opportunities" JSONB,
    "evidence" JSONB,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "summary" TEXT,

    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "evidence" JSONB,
    "sourceUrls" JSONB,
    "suggestedAction" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "expectedImpact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "evaluationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_outcomes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "actionTaken" TEXT,
    "completedAt" TIMESTAMP(3),
    "evaluationDate" TIMESTAMP(3),
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "measuredMetrics" JSONB,

    CONSTRAINT "recommendation_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_opportunities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "competitorId" TEXT,
    "sourceId" TEXT,
    "publicCommentId" TEXT,
    "complaintCategory" TEXT,
    "customerIntent" TEXT,
    "opportunityScore" DECIMAL(3,2) NOT NULL,
    "relevanceReason" TEXT,
    "suggestedValueProposition" TEXT,
    "suggestedOffer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "ownerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_drafts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT,
    "response" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "authorizationStatus" TEXT NOT NULL DEFAULT 'not_connected',
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectName" TEXT,
    "myUrl" TEXT NOT NULL,
    "competitorUrl" TEXT NOT NULL,
    "competitorUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'queued',
    "errorMessage" TEXT,
    "myProduct" JSONB,
    "competitorProduct" JSONB,
    "competitorsData" JSONB,
    "comparison" JSONB,
    "recommendations" JSONB,
    "seoAnalysis" JSONB,
    "commentsAnalysis" JSONB,
    "opportunitiesData" JSONB,
    "insights" JSONB,
    "collectionErrors" JSONB,
    "lastActivityCheckAt" TIMESTAMP(3),
    "nextActivityCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "comparison_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envato_sales_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "productName" TEXT,
    "authorName" TEXT,
    "totalSales" INTEGER,
    "price" TEXT,
    "discountedPrice" TEXT,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "reviewCount" INTEGER,
    "commentCount" INTEGER,
    "publicationDate" TEXT,
    "lastUpdateDate" TEXT,
    "version" TEXT,
    "category" TEXT,
    "productStatus" TEXT,
    "demoAvailable" BOOLEAN DEFAULT false,
    "docsAvailable" BOOLEAN DEFAULT false,
    "supportAvailable" BOOLEAN DEFAULT false,
    "featuresCount" INTEGER DEFAULT 0,
    "collectionStatus" TEXT NOT NULL DEFAULT 'success',
    "collectionError" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envato_sales_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_opportunities" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT,
    "competitorUrl" TEXT NOT NULL,
    "commentUrl" TEXT,
    "commentDate" TEXT,
    "issueCategory" TEXT NOT NULL,
    "commentSummary" TEXT NOT NULL,
    "relevantFeature" TEXT,
    "valueProposition" TEXT,
    "draftMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "mentionCount" INTEGER NOT NULL DEFAULT 1,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_keyword_observations" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT,
    "userId" TEXT,
    "keyword" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "searchEngine" TEXT NOT NULL DEFAULT 'Google',
    "country" TEXT,
    "device" TEXT DEFAULT 'desktop',
    "rankPosition" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'checked',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_keyword_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_activity_records" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT,
    "productUrl" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "isOurProduct" BOOLEAN NOT NULL DEFAULT false,
    "activityType" TEXT NOT NULL,
    "activityTitle" TEXT NOT NULL,
    "whatChanged" TEXT NOT NULL,
    "impactType" TEXT NOT NULL DEFAULT 'neutral',
    "previousValue" TEXT,
    "currentValue" TEXT,
    "deltaValue" INTEGER,
    "competitorComparison" TEXT,
    "possibleReasons" TEXT,
    "recommendedActions" TEXT,
    "snapshotTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_activity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_threads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "ownProductId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'envato',
    "productUrl" TEXT NOT NULL,
    "productName" TEXT,
    "rootCommentId" TEXT NOT NULL,
    "commenterUsername" TEXT NOT NULL,
    "commentUrl" TEXT,
    "threadStatus" TEXT NOT NULL DEFAULT 'open',
    "lastCommentAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_thread_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "externalCommentId" TEXT NOT NULL,
    "parentExternalCommentId" TEXT,
    "authorType" TEXT NOT NULL DEFAULT 'customer',
    "authorUsername" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "messageUrl" TEXT,
    "messageCreatedAt" TIMESTAMP(3),
    "rawMetadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_reply_drafts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "targetMessageId" TEXT NOT NULL,
    "generatedReply" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 0.90,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "insertedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_reply_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_reply_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "draftId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_reply_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "globalPaused" BOOLEAN NOT NULL DEFAULT false,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
    "autoInsert" BOOLEAN NOT NULL DEFAULT false,
    "autoPost" BOOLEAN NOT NULL DEFAULT false,
    "dailyReplyLimit" INTEGER NOT NULL DEFAULT 20,
    "requireApprovalForAll" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_extension_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Chrome Extension',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "engagement_extension_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "own_envato_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "productUrl" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "envatoItemId" TEXT NOT NULL,
    "authorUsername" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verificationMethod" TEXT,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "documentationUrl" TEXT,
    "supportPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "own_envato_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenant_users_tenantId_idx" ON "tenant_users"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_users_userId_idx" ON "tenant_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenantId_userId_key" ON "tenant_users"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "saas_products_tenantId_idx" ON "saas_products"("tenantId");

-- CreateIndex
CREATE INDEX "competitors_tenantId_idx" ON "competitors"("tenantId");

-- CreateIndex
CREATE INDEX "sources_tenantId_idx" ON "sources"("tenantId");

-- CreateIndex
CREATE INDEX "sources_tenantId_sourceType_idx" ON "sources"("tenantId", "sourceType");

-- CreateIndex
CREATE INDEX "product_snapshots_tenantId_productId_idx" ON "product_snapshots"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "product_snapshots_productId_capturedAt_idx" ON "product_snapshots"("productId", "capturedAt");

-- CreateIndex
CREATE INDEX "competitor_snapshots_tenantId_competitorId_idx" ON "competitor_snapshots"("tenantId", "competitorId");

-- CreateIndex
CREATE INDEX "competitor_snapshots_competitorId_capturedAt_idx" ON "competitor_snapshots"("competitorId", "capturedAt");

-- CreateIndex
CREATE INDEX "pricing_plans_tenantId_idx" ON "pricing_plans"("tenantId");

-- CreateIndex
CREATE INDEX "pricing_plans_productId_idx" ON "pricing_plans"("productId");

-- CreateIndex
CREATE INDEX "pricing_plans_competitorId_idx" ON "pricing_plans"("competitorId");

-- CreateIndex
CREATE INDEX "features_tenantId_idx" ON "features"("tenantId");

-- CreateIndex
CREATE INDEX "features_productId_idx" ON "features"("productId");

-- CreateIndex
CREATE INDEX "features_competitorId_idx" ON "features"("competitorId");

-- CreateIndex
CREATE INDEX "price_history_tenantId_idx" ON "price_history"("tenantId");

-- CreateIndex
CREATE INDEX "price_history_detectedAt_idx" ON "price_history"("detectedAt");

-- CreateIndex
CREATE INDEX "reviews_tenantId_idx" ON "reviews"("tenantId");

-- CreateIndex
CREATE INDEX "reviews_competitorId_idx" ON "reviews"("competitorId");

-- CreateIndex
CREATE INDEX "reviews_collectedAt_idx" ON "reviews"("collectedAt");

-- CreateIndex
CREATE INDEX "public_comments_tenantId_idx" ON "public_comments"("tenantId");

-- CreateIndex
CREATE INDEX "public_comments_competitorId_idx" ON "public_comments"("competitorId");

-- CreateIndex
CREATE INDEX "public_comments_collectedAt_idx" ON "public_comments"("collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sentiment_analyses_reviewId_key" ON "sentiment_analyses"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "sentiment_analyses_commentId_key" ON "sentiment_analyses"("commentId");

-- CreateIndex
CREATE INDEX "sentiment_analyses_tenantId_idx" ON "sentiment_analyses"("tenantId");

-- CreateIndex
CREATE INDEX "sentiment_analyses_sentiment_idx" ON "sentiment_analyses"("sentiment");

-- CreateIndex
CREATE INDEX "sentiment_analyses_customerIntent_idx" ON "sentiment_analyses"("customerIntent");

-- CreateIndex
CREATE INDEX "change_events_tenantId_idx" ON "change_events"("tenantId");

-- CreateIndex
CREATE INDEX "change_events_ownerType_ownerId_idx" ON "change_events"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "change_events_detectedAt_idx" ON "change_events"("detectedAt");

-- CreateIndex
CREATE INDEX "change_events_importance_idx" ON "change_events"("importance");

-- CreateIndex
CREATE INDEX "product_analyses_tenantId_idx" ON "product_analyses"("tenantId");

-- CreateIndex
CREATE INDEX "product_analyses_productId_analysisDate_idx" ON "product_analyses"("productId", "analysisDate");

-- CreateIndex
CREATE INDEX "recommendations_tenantId_idx" ON "recommendations"("tenantId");

-- CreateIndex
CREATE INDEX "recommendations_productId_idx" ON "recommendations"("productId");

-- CreateIndex
CREATE INDEX "recommendations_status_idx" ON "recommendations"("status");

-- CreateIndex
CREATE INDEX "recommendations_priority_idx" ON "recommendations"("priority");

-- CreateIndex
CREATE INDEX "recommendation_outcomes_tenantId_idx" ON "recommendation_outcomes"("tenantId");

-- CreateIndex
CREATE INDEX "recommendation_outcomes_recommendationId_idx" ON "recommendation_outcomes"("recommendationId");

-- CreateIndex
CREATE INDEX "customer_opportunities_tenantId_idx" ON "customer_opportunities"("tenantId");

-- CreateIndex
CREATE INDEX "customer_opportunities_status_idx" ON "customer_opportunities"("status");

-- CreateIndex
CREATE INDEX "customer_opportunities_opportunityScore_idx" ON "customer_opportunities"("opportunityScore");

-- CreateIndex
CREATE INDEX "leads_tenantId_idx" ON "leads"("tenantId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "outreach_drafts_tenantId_idx" ON "outreach_drafts"("tenantId");

-- CreateIndex
CREATE INDEX "outreach_drafts_approvalStatus_idx" ON "outreach_drafts"("approvalStatus");

-- CreateIndex
CREATE INDEX "outreach_events_tenantId_idx" ON "outreach_events"("tenantId");

-- CreateIndex
CREATE INDEX "outreach_events_leadId_idx" ON "outreach_events"("leadId");

-- CreateIndex
CREATE INDEX "integrations_tenantId_idx" ON "integrations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_tenantId_provider_key" ON "integrations"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "background_jobs_tenantId_idx" ON "background_jobs"("tenantId");

-- CreateIndex
CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");

-- CreateIndex
CREATE INDEX "background_jobs_type_idx" ON "background_jobs"("type");

-- CreateIndex
CREATE INDEX "background_jobs_createdAt_idx" ON "background_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_idx" ON "notifications"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "comparison_analyses_userId_idx" ON "comparison_analyses"("userId");

-- CreateIndex
CREATE INDEX "comparison_analyses_createdAt_idx" ON "comparison_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "envato_sales_snapshots_userId_idx" ON "envato_sales_snapshots"("userId");

-- CreateIndex
CREATE INDEX "envato_sales_snapshots_sourceUrl_collectedAt_idx" ON "envato_sales_snapshots"("sourceUrl", "collectedAt");

-- CreateIndex
CREATE INDEX "envato_sales_snapshots_collectedAt_idx" ON "envato_sales_snapshots"("collectedAt");

-- CreateIndex
CREATE INDEX "analysis_opportunities_analysisId_idx" ON "analysis_opportunities"("analysisId");

-- CreateIndex
CREATE INDEX "analysis_opportunities_userId_idx" ON "analysis_opportunities"("userId");

-- CreateIndex
CREATE INDEX "seo_keyword_observations_keyword_productUrl_idx" ON "seo_keyword_observations"("keyword", "productUrl");

-- CreateIndex
CREATE INDEX "seo_keyword_observations_observedAt_idx" ON "seo_keyword_observations"("observedAt");

-- CreateIndex
CREATE INDEX "product_activity_records_analysisId_createdAt_idx" ON "product_activity_records"("analysisId", "createdAt");

-- CreateIndex
CREATE INDEX "product_activity_records_productUrl_createdAt_idx" ON "product_activity_records"("productUrl", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_activity_records_analysisId_productUrl_activityType_key" ON "product_activity_records"("analysisId", "productUrl", "activityType", "currentValue", "snapshotTimestamp");

-- CreateIndex
CREATE INDEX "engagement_threads_tenantId_threadStatus_idx" ON "engagement_threads"("tenantId", "threadStatus");

-- CreateIndex
CREATE INDEX "engagement_threads_tenantId_productUrl_idx" ON "engagement_threads"("tenantId", "productUrl");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_threads_tenantId_platform_productUrl_rootComment_key" ON "engagement_threads"("tenantId", "platform", "productUrl", "rootCommentId");

-- CreateIndex
CREATE INDEX "engagement_thread_messages_threadId_createdAt_idx" ON "engagement_thread_messages"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_thread_messages_threadId_externalCommentId_key" ON "engagement_thread_messages"("threadId", "externalCommentId");

-- CreateIndex
CREATE INDEX "engagement_reply_drafts_tenantId_status_idx" ON "engagement_reply_drafts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "engagement_reply_drafts_threadId_idx" ON "engagement_reply_drafts"("threadId");

-- CreateIndex
CREATE INDEX "engagement_reply_events_tenantId_eventType_idx" ON "engagement_reply_events"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "engagement_reply_events_threadId_idx" ON "engagement_reply_events"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_settings_tenantId_key" ON "engagement_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_extension_tokens_tokenHash_key" ON "engagement_extension_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "engagement_extension_tokens_tenantId_idx" ON "engagement_extension_tokens"("tenantId");

-- CreateIndex
CREATE INDEX "engagement_extension_tokens_userId_idx" ON "engagement_extension_tokens"("userId");

-- CreateIndex
CREATE INDEX "own_envato_products_tenantId_idx" ON "own_envato_products"("tenantId");

-- CreateIndex
CREATE INDEX "own_envato_products_envatoItemId_idx" ON "own_envato_products"("envatoItemId");

-- CreateIndex
CREATE UNIQUE INDEX "own_envato_products_tenantId_productUrl_key" ON "own_envato_products"("tenantId", "productUrl");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_products" ADD CONSTRAINT "saas_products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentiment_analyses" ADD CONSTRAINT "sentiment_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentiment_analyses" ADD CONSTRAINT "sentiment_analyses_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentiment_analyses" ADD CONSTRAINT "sentiment_analyses_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_outcomes" ADD CONSTRAINT "recommendation_outcomes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_outcomes" ADD CONSTRAINT "recommendation_outcomes_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_opportunities" ADD CONSTRAINT "customer_opportunities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_opportunities" ADD CONSTRAINT "customer_opportunities_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_opportunities" ADD CONSTRAINT "customer_opportunities_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_opportunities" ADD CONSTRAINT "customer_opportunities_publicCommentId_fkey" FOREIGN KEY ("publicCommentId") REFERENCES "public_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "customer_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "customer_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_events" ADD CONSTRAINT "outreach_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_events" ADD CONSTRAINT "outreach_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_analyses" ADD CONSTRAINT "comparison_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envato_sales_snapshots" ADD CONSTRAINT "envato_sales_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_opportunities" ADD CONSTRAINT "analysis_opportunities_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "comparison_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_opportunities" ADD CONSTRAINT "analysis_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_activity_records" ADD CONSTRAINT "product_activity_records_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "comparison_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_activity_records" ADD CONSTRAINT "product_activity_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_threads" ADD CONSTRAINT "engagement_threads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_threads" ADD CONSTRAINT "engagement_threads_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_threads" ADD CONSTRAINT "engagement_threads_ownProductId_fkey" FOREIGN KEY ("ownProductId") REFERENCES "own_envato_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_thread_messages" ADD CONSTRAINT "engagement_thread_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "engagement_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reply_drafts" ADD CONSTRAINT "engagement_reply_drafts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reply_drafts" ADD CONSTRAINT "engagement_reply_drafts_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "engagement_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reply_drafts" ADD CONSTRAINT "engagement_reply_drafts_targetMessageId_fkey" FOREIGN KEY ("targetMessageId") REFERENCES "engagement_thread_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reply_events" ADD CONSTRAINT "engagement_reply_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reply_events" ADD CONSTRAINT "engagement_reply_events_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "engagement_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reply_events" ADD CONSTRAINT "engagement_reply_events_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "engagement_reply_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_settings" ADD CONSTRAINT "engagement_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_extension_tokens" ADD CONSTRAINT "engagement_extension_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_extension_tokens" ADD CONSTRAINT "engagement_extension_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "own_envato_products" ADD CONSTRAINT "own_envato_products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "own_envato_products" ADD CONSTRAINT "own_envato_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "saas_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

