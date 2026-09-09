import { prisma } from '@/lib/prisma'
import { collectWebsiteData, normalizeUrl, fetchProductPublicComments } from './collector'
import { compareProducts } from './comparator'
import {
  saveSalesSnapshot,
  calculateProductSalesAnalysis,
  compareSalesData,
  compareMultiSalesData,
} from './sales-metrics'
import { analyzeSeo, HistoricalKeywordRanking } from './seo-analyzer'
import { analyzeCompetitorComments } from './comments-analyzer'
import { detectOpportunitiesFromRecurringComplaints } from './opportunity-detector'
import { generateUnifiedInsights } from './insights-engine'
import {
  AnalysisResponseData,
  ExtractedProductData,
  ProductComparison,
  RuleRecommendation,
  ProductSalesAnalysis,
  SalesComparisonData,
  MultiCompetitorSalesComparison,
  SeoAnalysisResult,
  CommentsAnalysisResult,
  OpportunityRecord,
  CompetitorInsightItem,
} from './types'

export class WebsiteAnalyzerService {
  /**
   * Orchestrates multi-competitor analysis workflow:
   * 1. Validates & deduplicates URLs
   * 2. Creates queued/running record in DB associated with userId
   * 3. Collects public data for My SaaS and each Competitor SaaS
   * 4. Saves Envato sales snapshots & calculates multi-competitor sales metrics
   * 5. Runs on-page & keyword SEO analysis
   * 6. Collects permitted public comments & classifies sentiments/topics
   * 7. Detects opportunities from negative competitor complaints & drafts outreach messages
   * 8. Synthesizes cross-functional unified insights
   * 9. Persists complete record and returns structured data
   */
  async runAnalysis(
    myRawUrl: string,
    competitorRawUrls: string | string[],
    userId?: string | null,
    projectName?: string,
    targetKeywords: string[] = []
  ): Promise<AnalysisResponseData> {
    const myUrl = normalizeUrl(myRawUrl)

    // Normalize and deduplicate competitor URLs
    const rawList = Array.isArray(competitorRawUrls) ? competitorRawUrls : [competitorRawUrls]
    const normalizedComps: string[] = []
    for (const raw of rawList) {
      if (!raw || !raw.trim()) continue
      try {
        const norm = normalizeUrl(raw)
        // Prevent duplicate URLs & prevent analyzing own URL as competitor
        if (norm !== myUrl && !normalizedComps.includes(norm)) {
          normalizedComps.push(norm)
        }
      } catch (err) {
        console.warn(`Skipping invalid competitor URL: ${raw}`)
      }
    }

    if (normalizedComps.length === 0) {
      throw new Error('At least one valid, distinct competitor URL is required.')
    }

    const primaryCompetitorUrl = normalizedComps[0]
    const name = projectName || `${myUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0]} vs Competitors`

    // Create DB record with status = running and associated userId
    const record = await prisma.comparisonAnalysis.create({
      data: {
        userId: userId || null,
        projectName: name,
        myUrl,
        competitorUrl: primaryCompetitorUrl,
        competitorUrls: normalizedComps,
        status: 'running',
      },
    })

    try {
      // 1. Collect website data in parallel
      const [myProduct, ...competitorsData] = await Promise.all([
        collectWebsiteData(myUrl),
        ...normalizedComps.map((url) => collectWebsiteData(url)),
      ])

      const primaryCompetitor = competitorsData[0]

      // 2. Multi-Competitor Sales Snapshots & Metrics
      let mySalesAnalysis: ProductSalesAnalysis | null = null
      const competitorSalesList: ProductSalesAnalysis[] = []
      const competitorSalesMap: Record<string, ProductSalesAnalysis> = {}

      // Save snapshots for target product
      if (myProduct.envatoSales || myUrl.includes('codecanyon.net') || myUrl.includes('themeforest.net')) {
        await saveSalesSnapshot(myProduct.envatoSales, myUrl, undefined, userId)
        mySalesAnalysis = await calculateProductSalesAnalysis(myUrl, myProduct.envatoSales)
      }

      // Save snapshots for all competitors
      for (const comp of competitorsData) {
        if (comp.envatoSales || comp.url.includes('codecanyon.net') || comp.url.includes('themeforest.net')) {
          await saveSalesSnapshot(comp.envatoSales, comp.url, undefined, userId)
          const sales = await calculateProductSalesAnalysis(comp.url, comp.envatoSales)
          competitorSalesList.push(sales)
          competitorSalesMap[comp.url] = sales
        }
      }

      // Multi-sales comparison & primary sales comparison
      let multiSalesComparison: MultiCompetitorSalesComparison | null = null
      let salesComparison: SalesComparisonData | null = null

      if (competitorSalesList.length > 0) {
        multiSalesComparison = compareMultiSalesData(mySalesAnalysis, competitorSalesList, competitorsData)
        if (mySalesAnalysis) {
          salesComparison = compareSalesData(mySalesAnalysis, competitorSalesList[0])
        }
      }

      // 3. Deterministic rule-based product comparison
      const { comparison, recommendations } = compareProducts(myProduct, primaryCompetitor)

      // 4. Comprehensive SEO Analysis with Historical Ranking Tracking
      const previousObservations = await prisma.seoKeywordObservation.findMany({
        where: { productUrl: myUrl },
        orderBy: { observedAt: 'desc' },
        take: 100,
      })
      const historicalRankings: Record<string, HistoricalKeywordRanking> = {}
      for (const obs of previousObservations) {
        const kw = obs.keyword.toLowerCase().trim()
        if (!historicalRankings[kw]) {
          historicalRankings[kw] = {
            latestRank: obs.rankPosition,
            previousRank: null,
            observedAt: obs.observedAt.toISOString(),
          }
        } else if (historicalRankings[kw].previousRank === null && obs.rankPosition !== null) {
          historicalRankings[kw].previousRank = obs.rankPosition
        }
      }

      const seoAnalysis: SeoAnalysisResult = analyzeSeo(myProduct, competitorsData, targetKeywords, historicalRankings)

      // Store keyword observation snapshots for this analysis
      try {
        for (const row of seoAnalysis.comparison_table) {
          await prisma.seoKeywordObservation.create({
            data: {
              analysisId: record.id,
              userId: userId || null,
              keyword: row.keyword,
              productUrl: myUrl,
              searchEngine: 'Envato Marketplace & Search Visibility',
              rankPosition: row.my_rank,
              status: row.my_rank !== null ? 'checked' : 'unavailable',
            },
          })
        }
      } catch (seoErr) {
        console.error('Error saving SEO keyword observations:', seoErr)
      }

      // 5. Public Comments & Reviews Scraping and Recurring Complaint Analysis
      const scrapedCommentsMap: Record<string, any[]> = {}
      await Promise.all(
        competitorsData.map(async (comp) => {
          if (comp.url.includes('codecanyon.net') || comp.url.includes('themeforest.net') || comp.url.includes('envato.com')) {
            const comments = await fetchProductPublicComments(comp.url)
            scrapedCommentsMap[comp.url] = comments
          }
        })
      )

      const commentsAnalysis: CommentsAnalysisResult = analyzeCompetitorComments(competitorsData, scrapedCommentsMap)

      // 6. Opportunity Detection from Recurring or Critical Negative Complaints
      const opportunities: OpportunityRecord[] = detectOpportunitiesFromRecurringComplaints(
        commentsAnalysis.recurring_complaints,
        myProduct
      )

      // Persist individual opportunities into database
      if (opportunities.length > 0) {
        try {
          await prisma.competitorOpportunity.createMany({
            data: opportunities.map((opp) => ({
              analysisId: record.id,
              userId: userId || null,
              competitorUrl: opp.competitor_url,
              commentUrl: opp.comment_url,
              commentDate: opp.comment_date,
              issueCategory: opp.issue_category,
              commentSummary: opp.comment_summary,
              relevantFeature: opp.matching_feature,
              valueProposition: opp.value_proposition,
              draftMessage: opp.draft_message,
              status: opp.status,
              mentionCount: opp.mention_count,
              severity: opp.severity,
            })),
          })
        } catch (oppErr) {
          console.error('Error saving individual opportunities to DB:', oppErr)
        }
      }

      // 7. Unified Cross-Functional Insights
      const insights: CompetitorInsightItem[] = generateUnifiedInsights(
        myProduct,
        competitorsData,
        mySalesAnalysis,
        competitorSalesMap,
        seoAnalysis,
        commentsAnalysis
      )

      const collectionErrors = {
        my_product: myProduct.collectionErrors,
        competitor_product: primaryCompetitor.collectionErrors,
      }

      // 8. Update record in database
      await prisma.comparisonAnalysis.update({
        where: { id: record.id },
        data: {
          status: 'completed',
          myProduct: JSON.parse(JSON.stringify(myProduct)),
          competitorProduct: JSON.parse(JSON.stringify(primaryCompetitor)),
          competitorsData: JSON.parse(JSON.stringify(competitorsData)),
          comparison: JSON.parse(JSON.stringify(comparison)),
          recommendations: JSON.parse(JSON.stringify(recommendations)),
          seoAnalysis: JSON.parse(JSON.stringify(seoAnalysis)),
          commentsAnalysis: JSON.parse(JSON.stringify(commentsAnalysis)),
          opportunitiesData: JSON.parse(JSON.stringify(opportunities)),
          insights: JSON.parse(JSON.stringify(insights)),
          collectionErrors: JSON.parse(JSON.stringify(collectionErrors)),
          completedAt: new Date(),
        },
      })

      return {
        analysis_id: record.id,
        project_name: name,
        status: 'completed',
        my_url: myUrl,
        competitor_url: primaryCompetitorUrl,
        competitor_urls: normalizedComps,
        created_at: record.createdAt.toISOString(),
        completed_at: new Date().toISOString(),
        my_product: myProduct,
        competitor_product: primaryCompetitor,
        competitors_data: competitorsData,
        comparison,
        recommendations,
        collection_errors: collectionErrors,
        my_sales_analysis: mySalesAnalysis,
        competitor_sales_analysis: competitorSalesList[0] || null,
        sales_comparison: salesComparison,
        multi_sales_comparison: multiSalesComparison,
        seo_analysis: seoAnalysis,
        comments_analysis: commentsAnalysis,
        opportunities,
        insights,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown analysis error'
      await prisma.comparisonAnalysis.update({
        where: { id: record.id },
        data: {
          status: 'failed',
          errorMessage: msg,
          completedAt: new Date(),
        },
      })

      throw new Error(`Analysis failed: ${msg}`)
    }
  }

  /**
   * Retrieves a completed or in-progress analysis by ID with multi-tenant ownership check.
   */
  async getAnalysisById(
    id: string,
    requestingUserId?: string | null,
    isAdmin = false
  ): Promise<AnalysisResponseData> {
    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
      include: {
        opportunities: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!record) {
      throw new Error(`Analysis ${id} not found`)
    }

    // Strict multi-tenant security: non-admins cannot view other users' records
    if (!isAdmin && record.userId && requestingUserId && record.userId !== requestingUserId) {
      throw new Error('FORBIDDEN')
    }

    const myProduct = record.myProduct as unknown as ExtractedProductData | null
    const competitorProduct = record.competitorProduct as unknown as ExtractedProductData | null
    const competitorsDataRaw = record.competitorsData as unknown as ExtractedProductData[] | null

    const competitorsData = competitorsDataRaw || (competitorProduct ? [competitorProduct] : [])
    const competitorUrls = record.competitorUrls.length > 0 ? record.competitorUrls : [record.competitorUrl]

    // Recalculate sales metrics if Envato data is present
    let mySalesAnalysis: ProductSalesAnalysis | null = null
    const competitorSalesList: ProductSalesAnalysis[] = []

    if (myProduct?.envatoSales || record.myUrl.includes('codecanyon.net') || record.myUrl.includes('themeforest.net')) {
      mySalesAnalysis = await calculateProductSalesAnalysis(record.myUrl, myProduct?.envatoSales)
    }

    for (const comp of competitorsData) {
      if (comp.envatoSales || comp.url.includes('codecanyon.net') || comp.url.includes('themeforest.net')) {
        const s = await calculateProductSalesAnalysis(comp.url, comp.envatoSales)
        competitorSalesList.push(s)
      }
    }

    let multiSalesComparison: MultiCompetitorSalesComparison | null = null
    let salesComparison: SalesComparisonData | null = null

    if (competitorSalesList.length > 0) {
      multiSalesComparison = compareMultiSalesData(mySalesAnalysis, competitorSalesList, competitorsData)
      if (mySalesAnalysis) {
        salesComparison = compareSalesData(mySalesAnalysis, competitorSalesList[0])
      }
    }

    const dbOpportunities = record.opportunities || []
    const opportunities: OpportunityRecord[] =
      dbOpportunities.length > 0
        ? dbOpportunities.map((o) => {
            const hasMatch = o.relevantFeature !== null && o.relevantFeature !== 'No verified matching feature found.'
            return {
              id: o.id,
              competitor_url: o.competitorUrl,
              competitor_name:
                competitorsData.find((c) => c.url === o.competitorUrl)?.productName || 'Competitor',
              comment_url: o.commentUrl,
              comment_date: o.commentDate,
              issue_category: o.issueCategory,
              comment_summary: o.commentSummary,
              why_relevant: o.relevantFeature || '',
              matching_feature: o.relevantFeature || 'No verified matching feature found.',
              has_matching_feature: hasMatch,
              value_proposition: o.valueProposition || '',
              draft_message: o.draftMessage || '',
              mention_count: (o as any).mentionCount || 1,
              severity: ((o as any).severity as any) || 'medium',
              confidence_level: (o as any).severity === 'critical' ? 'High' : 'Medium',
              status: o.status as any,
              created_at: o.createdAt.toISOString(),
            }
          })
        : ((record.opportunitiesData as unknown as OpportunityRecord[]) || [])

    return {
      analysis_id: record.id,
      project_name: record.projectName || undefined,
      status: record.status as any,
      my_url: record.myUrl,
      competitor_url: record.competitorUrl,
      competitor_urls: competitorUrls,
      created_at: record.createdAt.toISOString(),
      completed_at: record.completedAt?.toISOString(),
      error_message: record.errorMessage || undefined,
      my_product: myProduct,
      competitor_product: competitorProduct,
      competitors_data: competitorsData,
      comparison: record.comparison ? (record.comparison as unknown as ProductComparison) : null,
      recommendations: record.recommendations ? (record.recommendations as unknown as RuleRecommendation[]) : [],
      seo_analysis: record.seoAnalysis ? (record.seoAnalysis as unknown as SeoAnalysisResult) : null,
      comments_analysis: record.commentsAnalysis ? (record.commentsAnalysis as unknown as CommentsAnalysisResult) : null,
      opportunities,
      insights: record.insights ? (record.insights as unknown as CompetitorInsightItem[]) : null,
      collection_errors: (record.collectionErrors as unknown as { my_product: string[]; competitor_product: string[] }) || { my_product: [], competitor_product: [] },
      my_sales_analysis: mySalesAnalysis,
      competitor_sales_analysis: competitorSalesList[0] || null,
      sales_comparison: salesComparison,
      multi_sales_comparison: multiSalesComparison,
      activities: record.activities || [],
      last_activity_check_at: record.lastActivityCheckAt?.toISOString() || null,
      next_activity_check_at: record.nextActivityCheckAt?.toISOString() || null,
    }
  }

  /**
   * Adds a new competitor URL to an existing project and runs background update.
   */
  async addCompetitorToProject(
    id: string,
    newCompetitorUrlRaw: string,
    requestingUserId?: string | null,
    isAdmin = false
  ): Promise<AnalysisResponseData> {
    const record = await prisma.comparisonAnalysis.findUnique({ where: { id } })
    if (!record) throw new Error(`Project ${id} not found`)

    if (!isAdmin && record.userId && requestingUserId && record.userId !== requestingUserId) {
      throw new Error('FORBIDDEN')
    }

    const newUrl = normalizeUrl(newCompetitorUrlRaw)
    if (newUrl === record.myUrl) {
      throw new Error('Cannot add your own target URL as a competitor.')
    }

    const currentUrls = record.competitorUrls.length > 0 ? record.competitorUrls : [record.competitorUrl]
    if (currentUrls.includes(newUrl)) {
      throw new Error('This competitor URL is already included in the project.')
    }

    const updatedUrls = [...currentUrls, newUrl]

    // Collect data for new competitor
    const newCompData = await collectWebsiteData(newUrl)
    if (newCompData.envatoSales) {
      await saveSalesSnapshot(newCompData.envatoSales, newUrl, undefined, record.userId)
    }

    const existingComps = (record.competitorsData as unknown as ExtractedProductData[]) || (record.competitorProduct ? [record.competitorProduct as unknown as ExtractedProductData] : [])
    const allComps = [...existingComps, newCompData]

    const myProduct = record.myProduct as unknown as ExtractedProductData

    // Re-run SEO analysis
    const seoAnalysis = analyzeSeo(myProduct, allComps)

    // Re-run public comments for new competitor
    const scrapedComments = await fetchProductPublicComments(newUrl)
    const existingCommentsAnalysis = (record.commentsAnalysis as unknown as CommentsAnalysisResult) || {
      summaries: [],
      recurring_complaints: [],
      comments: [],
      total_analyzed: 0,
      unresolved_count: 0,
      unavailable_competitors: [],
    }
    const newCommentsResult = analyzeCompetitorComments([newCompData], { [newUrl]: scrapedComments })

    const mergedCommentsAnalysis: CommentsAnalysisResult = {
      summaries: [...(existingCommentsAnalysis.summaries || []), ...newCommentsResult.summaries],
      recurring_complaints: [
        ...(existingCommentsAnalysis.recurring_complaints || []),
        ...newCommentsResult.recurring_complaints,
      ],
      comments: [...(existingCommentsAnalysis.comments || []), ...newCommentsResult.comments],
      total_analyzed: (existingCommentsAnalysis.total_analyzed || 0) + newCommentsResult.total_analyzed,
      unresolved_count: (existingCommentsAnalysis.unresolved_count || 0) + newCommentsResult.unresolved_count,
      unavailable_competitors: [
        ...(existingCommentsAnalysis.unavailable_competitors || []),
        ...newCommentsResult.unavailable_competitors,
      ],
    }

    // Re-run opportunities using recurring complaints
    const newOpportunities = detectOpportunitiesFromRecurringComplaints(
      newCommentsResult.recurring_complaints,
      myProduct
    )
    if (newOpportunities.length > 0) {
      await prisma.competitorOpportunity.createMany({
        data: newOpportunities.map((opp) => ({
          analysisId: record.id,
          userId: record.userId || null,
          competitorUrl: opp.competitor_url,
          commentUrl: opp.comment_url,
          commentDate: opp.comment_date,
          issueCategory: opp.issue_category,
          commentSummary: opp.comment_summary,
          relevantFeature: opp.matching_feature,
          valueProposition: opp.value_proposition,
          draftMessage: opp.draft_message,
          status: opp.status,
          mentionCount: opp.mention_count,
          severity: opp.severity,
        })),
      })
    }

    await prisma.comparisonAnalysis.update({
      where: { id },
      data: {
        competitorUrls: updatedUrls,
        competitorsData: JSON.parse(JSON.stringify(allComps)),
        seoAnalysis: JSON.parse(JSON.stringify(seoAnalysis)),
        commentsAnalysis: JSON.parse(JSON.stringify(mergedCommentsAnalysis)),
        completedAt: new Date(),
      },
    })

    return this.getAnalysisById(id, requestingUserId, isAdmin)
  }

  /**
   * Removes a competitor URL from an existing project.
   */
  async removeCompetitorFromProject(
    id: string,
    competitorUrlToRemove: string,
    requestingUserId?: string | null,
    isAdmin = false
  ): Promise<AnalysisResponseData> {
    const record = await prisma.comparisonAnalysis.findUnique({ where: { id } })
    if (!record) throw new Error(`Project ${id} not found`)

    if (!isAdmin && record.userId && requestingUserId && record.userId !== requestingUserId) {
      throw new Error('FORBIDDEN')
    }

    const currentUrls = record.competitorUrls.length > 0 ? record.competitorUrls : [record.competitorUrl]
    if (currentUrls.length <= 1) {
      throw new Error('Cannot remove the only remaining competitor in the project.')
    }

    const normRemove = normalizeUrl(competitorUrlToRemove)
    const updatedUrls = currentUrls.filter((u) => u !== normRemove && u !== competitorUrlToRemove)

    const existingComps = (record.competitorsData as unknown as ExtractedProductData[]) || []
    const remainingComps = existingComps.filter((c) => c.url !== normRemove && c.url !== competitorUrlToRemove)

    const myProduct = record.myProduct as unknown as ExtractedProductData
    const seoAnalysis = analyzeSeo(myProduct, remainingComps)

    // Remove opportunities related to removed competitor
    await prisma.competitorOpportunity.deleteMany({
      where: {
        analysisId: id,
        competitorUrl: normRemove,
      },
    })

    await prisma.comparisonAnalysis.update({
      where: { id },
      data: {
        competitorUrl: updatedUrls[0],
        competitorUrls: updatedUrls,
        competitorsData: JSON.parse(JSON.stringify(remainingComps)),
        seoAnalysis: JSON.parse(JSON.stringify(seoAnalysis)),
      },
    })

    return this.getAnalysisById(id, requestingUserId, isAdmin)
  }

  /**
   * Re-fetches the Envato pages, creates fresh timestamped snapshots, and updates metrics.
   */
  async refreshSalesSnapshots(
    id: string,
    requestingUserId?: string | null,
    isAdmin = false
  ): Promise<AnalysisResponseData> {
    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
    })
    if (!record) {
      throw new Error(`Analysis ${id} not found`)
    }

    if (!isAdmin && record.userId && requestingUserId && record.userId !== requestingUserId) {
      throw new Error('FORBIDDEN')
    }

    const competitorUrls = record.competitorUrls.length > 0 ? record.competitorUrls : [record.competitorUrl]

    const [myProduct, ...competitorsData] = await Promise.all([
      collectWebsiteData(record.myUrl),
      ...competitorUrls.map((url) => collectWebsiteData(url)),
    ])

    // Save fresh timestamped snapshots
    await saveSalesSnapshot(myProduct.envatoSales, record.myUrl, undefined, record.userId)
    for (const comp of competitorsData) {
      await saveSalesSnapshot(comp.envatoSales, comp.url, undefined, record.userId)
    }

    // Refresh SEO & public comments
    const seoAnalysis = analyzeSeo(myProduct, competitorsData)

    await prisma.comparisonAnalysis.update({
      where: { id },
      data: {
        myProduct: JSON.parse(JSON.stringify(myProduct)),
        competitorProduct: JSON.parse(JSON.stringify(competitorsData[0])),
        competitorsData: JSON.parse(JSON.stringify(competitorsData)),
        seoAnalysis: JSON.parse(JSON.stringify(seoAnalysis)),
        completedAt: new Date(),
      },
    })

    return this.getAnalysisById(id, requestingUserId, isAdmin)
  }

  /**
   * Updates target keywords for a project, re-evaluates SEO visibility, and records observations.
   */
  async updateProjectKeywords(
    id: string,
    targetKeywords: string[],
    requestingUserId?: string | null,
    isAdmin = false
  ): Promise<SeoAnalysisResult> {
    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
    })
    if (!record) {
      throw new Error(`Analysis ${id} not found`)
    }

    if (!isAdmin && record.userId && requestingUserId && record.userId !== requestingUserId) {
      throw new Error('FORBIDDEN')
    }

    const myProduct = record.myProduct as unknown as ExtractedProductData
    const competitorsData = (record.competitorsData as unknown as ExtractedProductData[]) || [
      record.competitorProduct as unknown as ExtractedProductData,
    ]

    // Fetch previous observations
    const previousObservations = await prisma.seoKeywordObservation.findMany({
      where: { productUrl: record.myUrl },
      orderBy: { observedAt: 'desc' },
      take: 100,
    })
    const historicalRankings: Record<string, HistoricalKeywordRanking> = {}
    for (const obs of previousObservations) {
      const kw = obs.keyword.toLowerCase().trim()
      if (!historicalRankings[kw]) {
        historicalRankings[kw] = {
          latestRank: obs.rankPosition,
          previousRank: null,
          observedAt: obs.observedAt.toISOString(),
        }
      } else if (historicalRankings[kw].previousRank === null && obs.rankPosition !== null) {
        historicalRankings[kw].previousRank = obs.rankPosition
      }
    }

    const seoAnalysis = analyzeSeo(myProduct, competitorsData, targetKeywords, historicalRankings)

    // Record new observations
    try {
      for (const row of seoAnalysis.comparison_table) {
        await prisma.seoKeywordObservation.create({
          data: {
            analysisId: record.id,
            userId: record.userId || null,
            keyword: row.keyword,
            productUrl: record.myUrl,
            searchEngine: 'Envato Marketplace & Search Visibility',
            rankPosition: row.my_rank,
            status: row.my_rank !== null ? 'checked' : 'unavailable',
          },
        })
      }
    } catch (err) {
      console.error('Error recording updated keyword observations:', err)
    }

    await prisma.comparisonAnalysis.update({
      where: { id },
      data: {
        seoAnalysis: JSON.parse(JSON.stringify(seoAnalysis)),
      },
    })

    return seoAnalysis
  }

  /**
   * Updates the workflow status of a recurring complaint group in an analysis.
   */
  async updateComplaintStatus(
    id: string,
    complaintId: string,
    newStatus: 'New' | 'Under Review' | 'Confirmed' | 'Rejected' | 'Converted to Opportunity' | 'Resolved',
    requestingUserId?: string | null,
    isAdmin = false
  ): Promise<CommentsAnalysisResult> {
    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
    })
    if (!record) {
      throw new Error(`Analysis ${id} not found`)
    }

    if (!isAdmin && record.userId && requestingUserId && record.userId !== requestingUserId) {
      throw new Error('FORBIDDEN')
    }

    const commentsAnalysis = record.commentsAnalysis as unknown as CommentsAnalysisResult
    if (!commentsAnalysis || !commentsAnalysis.recurring_complaints) {
      throw new Error('Comments analysis not found for this project')
    }

    let found = false
    for (const group of commentsAnalysis.recurring_complaints) {
      if (group.id === complaintId) {
        group.current_status = newStatus
        found = true
        break
      }
    }

    if (!found) {
      throw new Error(`Complaint group ${complaintId} not found`)
    }

    await prisma.comparisonAnalysis.update({
      where: { id },
      data: {
        commentsAnalysis: JSON.parse(JSON.stringify(commentsAnalysis)),
      },
    })

    return commentsAnalysis
  }

  /**
   * Retrieves recent comparisons scoped to user.
   */
  async getRecentAnalyses(limit = 10, userId?: string | null, isAdmin = false) {
    const whereClause = !isAdmin && userId ? { userId } : {}

    return prisma.comparisonAnalysis.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        projectName: true,
        myUrl: true,
        competitorUrl: true,
        competitorUrls: true,
        status: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
  }
}

export const websiteAnalyzerService = new WebsiteAnalyzerService()
