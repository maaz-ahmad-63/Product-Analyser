// src/services/activity-monitor/scheduler.ts
// Server-side background hourly activity-monitoring service for SaaS Growth Agent

import { prisma } from '@/lib/prisma'
import { collectWebsiteData, normalizeUrl, fetchProductPublicComments } from '../website-analyzer/collector'
import { saveSalesSnapshot } from '../website-analyzer/sales-metrics'
import { detectActivities } from './activity-detector'
import {
  ProductSnapshotData,
  ProductActivityItem,
  MonitoringCycleProjectResult,
  HourlyMonitoringStatus,
} from './types'

export class ActivityMonitoringScheduler {
  private static instance: ActivityMonitoringScheduler
  private timer: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private isProcessingCycle: boolean = false
  private lastRunAt: Date | null = null
  private nextRunAt: Date | null = null
  private lastError: string | null = null
  private readonly intervalMs: number = 60 * 60 * 1000 // 1 hour

  private constructor() {}

  public static getInstance(): ActivityMonitoringScheduler {
    if (!ActivityMonitoringScheduler.instance) {
      ActivityMonitoringScheduler.instance = new ActivityMonitoringScheduler()
    }
    return ActivityMonitoringScheduler.instance
  }

  /**
   * Starts the hourly server-side scheduler.
   */
  public start(): void {
    if (this.isRunning) {
      console.log('[ActivityScheduler] Already running.')
      return
    }

    this.isRunning = true
    this.nextRunAt = new Date(Date.now() + this.intervalMs)
    console.log(`[ActivityScheduler] Started hourly monitor. Next run scheduled for ${this.nextRunAt.toISOString()}`)

    this.timer = setInterval(async () => {
      try {
        console.log('[ActivityScheduler] Executing scheduled hourly check...')
        await this.runMonitoringCycle()
      } catch (err: any) {
        console.error('[ActivityScheduler] Error in scheduled cycle:', err)
        this.lastError = err?.message || String(err)
      }
    }, this.intervalMs)
  }

  /**
   * Stops the background scheduler.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isRunning = false
    console.log('[ActivityScheduler] Scheduler stopped.')
  }

  /**
   * Executes a full monitoring cycle across all active projects or for a specific analysisId.
   */
  public async runMonitoringCycle(targetAnalysisId?: string): Promise<MonitoringCycleProjectResult[]> {
    if (this.isProcessingCycle) {
      console.warn('[ActivityScheduler] Cycle already in progress, skipping concurrent run.')
      return []
    }

    this.isProcessingCycle = true
    this.lastRunAt = new Date()
    this.nextRunAt = new Date(Date.now() + this.intervalMs)
    const results: MonitoringCycleProjectResult[] = []

    try {
      // Find eligible analyses: only refresh if >= 50 minutes have elapsed since last check
      const fiftyMinutesAgo = new Date(Date.now() - 50 * 60 * 1000)
      const analyses = await prisma.comparisonAnalysis.findMany({
        where: targetAnalysisId
          ? { id: targetAnalysisId }
          : {
              status: { in: ['completed', 'running'] },
              autoRefreshEnabled: true,
              OR: [
                { lastActivityCheckAt: null },
                { lastActivityCheckAt: { lte: fiftyMinutesAgo } },
              ],
            },
        orderBy: { createdAt: 'desc' },
        take: 20, // process up to 20 projects per cycle
      })

      console.log(`[ActivityScheduler] Checking ${analyses.length} eligible projects for hourly updates...`)

      for (const analysis of analyses) {
        const projectResult = await this.monitorProject(analysis)
        results.push(projectResult)
      }
    } catch (err: any) {
      this.lastError = err?.message || String(err)
      console.error('[ActivityScheduler] Cycle execution error:', err)
    } finally {
      this.isProcessingCycle = false
    }

    return results
  }

  /**
   * Monitors a single project: checks our product and all saved competitor URLs.
   */
  public async monitorProject(analysis: {
    id: string
    userId: string | null
    projectName: string | null
    myUrl: string
    competitorUrl: string
    competitorUrls: string[]
  }): Promise<MonitoringCycleProjectResult> {
    const checkTimestamp = new Date()
    const nextCheckAt = new Date(Date.now() + this.intervalMs)
    const errors: string[] = []
    let activitiesCreated = 0
    let productsChecked = 0

    // Gather distinct URLs to check
    const urlsToCheck: Array<{ url: string; isOurProduct: boolean }> = [
      { url: analysis.myUrl, isOurProduct: true },
    ]

    const compUrls = analysis.competitorUrls.length > 0
      ? analysis.competitorUrls
      : [analysis.competitorUrl].filter(Boolean)

    for (const cUrl of compUrls) {
      if (cUrl && cUrl !== analysis.myUrl && !urlsToCheck.some((u) => u.url === cUrl)) {
        urlsToCheck.push({ url: cUrl, isOurProduct: false })
      }
    }

    // Step 1: Pre-fetch latest previous snapshots for all products in this project
    const previousSnapshotsMap: Record<string, any> = {}
    for (const item of urlsToCheck) {
      const prev = await prisma.envatoSalesSnapshot.findFirst({
        where: { sourceUrl: item.url },
        orderBy: { collectedAt: 'desc' },
      })
      if (prev) {
        previousSnapshotsMap[item.url] = prev
      }
    }

    // Step 2: Check each product publicly
    const detectedActivitiesForProject: ProductActivityItem[] = []
    let ourProductSales: number | null = null
    const competitorSalesMap: Record<string, number> = {}

    for (const item of urlsToCheck) {
      productsChecked++
      try {
        // Collect latest publicly available web & Envato data
        const extracted = await collectWebsiteData(item.url)
        const prevSnapshot = previousSnapshotsMap[item.url] || null

        // Public comments if available
        let recentComments: any[] = []
        if (item.url.includes('codecanyon.net') || item.url.includes('themeforest.net') || item.url.includes('envato.com')) {
          try {
            const rawComments = await fetchProductPublicComments(item.url)
            recentComments = (rawComments || []).slice(0, 15).map((c: any) => ({
              text: c.comment_text || c.text || '',
              date: c.comment_date || c.date || '',
              rating: c.rating || null,
            }))
          } catch (cErr) {
            console.warn(`[ActivityScheduler] Could not fetch public comments for ${item.url}`)
          }
        }

        const demoAvailable = Boolean(extracted.contactOrDemoCta && !extracted.contactOrDemoCta.includes('Not found'))
        const docsAvailable = Boolean(extracted.docsLink && !extracted.docsLink.includes('Not found'))
        const supportAvailable = true // Envato listed products include author support by default
        const featuresCount = extracted.features?.length || 0

        const isFailed = extracted.collectionErrors && extracted.collectionErrors.length > 0 && !extracted.envatoSales

        const currentSnapshotData: ProductSnapshotData = {
          sourceUrl: item.url,
          productName: extracted.productName || prevSnapshot?.productName || 'Product',
          authorName: extracted.envatoSales?.author_name || prevSnapshot?.authorName || null,
          totalSales: extracted.envatoSales?.current_total_sales ?? prevSnapshot?.totalSales ?? null,
          price: extracted.envatoSales?.product_price || prevSnapshot?.price || null,
          discountedPrice: extracted.envatoSales?.discounted_price || prevSnapshot?.discountedPrice || null,
          rating: extracted.envatoSales?.rating ?? prevSnapshot?.rating ?? null,
          ratingCount: extracted.envatoSales?.rating_count ?? prevSnapshot?.ratingCount ?? null,
          reviewCount: extracted.envatoSales?.review_count ?? prevSnapshot?.reviewCount ?? null,
          commentCount: extracted.envatoSales?.comment_count ?? prevSnapshot?.commentCount ?? null,
          publicationDate: extracted.envatoSales?.publication_date || prevSnapshot?.publicationDate || null,
          lastUpdateDate: extracted.envatoSales?.last_update_date || prevSnapshot?.lastUpdateDate || null,
          version: extracted.envatoSales?.version || prevSnapshot?.version || null,
          category: extracted.category || prevSnapshot?.category || null,
          productStatus: extracted.envatoSales?.product_status || prevSnapshot?.productStatus || 'Active',
          demoAvailable,
          docsAvailable,
          supportAvailable,
          featuresCount,
          recentComments,
          collectionStatus: isFailed ? 'failed' : 'success',
          collectionError: isFailed ? extracted.collectionErrors.join(', ') : null,
        }

        // Save new timestamped product snapshot
        await saveSalesSnapshot(
          extracted.envatoSales || {
            product_name: currentSnapshotData.productName,
            current_total_sales: currentSnapshotData.totalSales,
            product_price: currentSnapshotData.price,
            discounted_price: currentSnapshotData.discountedPrice,
            rating: currentSnapshotData.rating,
            rating_count: currentSnapshotData.ratingCount,
            review_count: currentSnapshotData.reviewCount,
            comment_count: currentSnapshotData.commentCount,
            last_update_date: currentSnapshotData.lastUpdateDate,
            version: currentSnapshotData.version,
            sales_data_unavailable: currentSnapshotData.totalSales === null,
          } as any,
          item.url,
          isFailed ? extracted.collectionErrors.join(', ') : undefined,
          analysis.userId,
          { demoAvailable, docsAvailable, supportAvailable, featuresCount }
        )

        if (item.isOurProduct && typeof currentSnapshotData.totalSales === 'number') {
          ourProductSales = currentSnapshotData.totalSales
        } else if (!item.isOurProduct && typeof currentSnapshotData.totalSales === 'number') {
          competitorSalesMap[currentSnapshotData.productName] = currentSnapshotData.totalSales
        }

        // Compare new snapshot with previous snapshot
        const itemActivities = detectActivities(
          currentSnapshotData,
          prevSnapshot,
          {
            analysisId: analysis.id,
            userId: analysis.userId,
            isOurProduct: item.isOurProduct,
            ourProductName: analysis.projectName || 'Our SaaS Product',
            ourProductSales,
            competitorSalesMap,
          },
          checkTimestamp
        )

        detectedActivitiesForProject.push(...itemActivities)
      } catch (prodErr: any) {
        const msg = `Error checking ${item.url}: ${prodErr?.message || String(prodErr)}`
        console.error(`[ActivityScheduler] ${msg}`)
        errors.push(msg)
      }
    }

    // Step 3: Persist detected meaningful activities with deduplication
    for (const act of detectedActivitiesForProject) {
      try {
        // Prevent duplicate activities: check if same (analysisId, productUrl, activityType, currentValue) was recorded in last 50 minutes
        const fiftyMinutesAgo = new Date(Date.now() - 50 * 60 * 1000)
        const existing = await prisma.productActivityRecord.findFirst({
          where: {
            analysisId: act.analysisId,
            productUrl: act.productUrl,
            activityType: act.activityType,
            currentValue: act.currentValue || '',
            createdAt: { gte: fiftyMinutesAgo },
          },
        })

        if (!existing) {
          await prisma.productActivityRecord.create({
            data: {
              analysisId: act.analysisId,
              userId: act.userId || null,
              productUrl: act.productUrl,
              productName: act.productName,
              isOurProduct: act.isOurProduct,
              activityType: act.activityType,
              activityTitle: act.activityTitle,
              whatChanged: act.whatChanged,
              impactType: act.impactType,
              previousValue: act.previousValue || null,
              currentValue: act.currentValue || null,
              deltaValue: act.deltaValue || null,
              competitorComparison: act.competitorComparison || null,
              possibleReasons: act.possibleReasons || null,
              recommendedActions: act.recommendedActions || null,
              snapshotTimestamp: act.snapshotTimestamp,
            },
          })
          activitiesCreated++
        }
      } catch (dbErr: any) {
        // If unique constraint triggers, it's safely deduplicated
        if (!String(dbErr).includes('Unique constraint')) {
          console.error('[ActivityScheduler] Failed to persist activity:', dbErr)
        }
      }
    }

    // Step 4: Update analysis tracking timestamps and live product models
    try {
      const existingRecord = await prisma.comparisonAnalysis.findUnique({
        where: { id: analysis.id },
        select: { myProduct: true, competitorsData: true },
      })

      const updatePayload: any = {
        lastActivityCheckAt: checkTimestamp,
        nextActivityCheckAt: nextCheckAt,
        lastRefreshedAt: checkTimestamp,
        nextRefreshAt: nextCheckAt,
      }

      // If our product was extracted and has envatoSales, merge it into myProduct
      if (existingRecord?.myProduct) {
        const myProdObj = existingRecord.myProduct as any
        const latestOurSnapshot = previousSnapshotsMap[analysis.myUrl]
        if (ourProductSales !== null || latestOurSnapshot) {
          myProdObj.envatoSales = {
            ...(myProdObj.envatoSales || {}),
            current_total_sales: ourProductSales ?? myProdObj.envatoSales?.current_total_sales,
          }
          updatePayload.myProduct = myProdObj
        }
      }

      await prisma.comparisonAnalysis.update({
        where: { id: analysis.id },
        data: updatePayload,
      })
    } catch (updateErr) {
      console.error('[ActivityScheduler] Error updating analysis with live sales:', updateErr)
    }

    return {
      analysisId: analysis.id,
      projectName: analysis.projectName,
      productsChecked,
      activitiesCreated,
      errors,
      lastCheckedAt: checkTimestamp,
      nextScheduledCheckAt: nextCheckAt,
    }
  }

  /**
   * Returns current scheduler status & health metrics.
   */
  public async getStatus(): Promise<HourlyMonitoringStatus> {
    const [activeProjectsCount, totalActivitiesCount] = await Promise.all([
      prisma.comparisonAnalysis.count({
        where: { status: { in: ['completed', 'running'] } },
      }),
      prisma.productActivityRecord.count(),
    ])

    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt ? this.lastRunAt.toISOString() : null,
      nextRunAt: this.nextRunAt ? this.nextRunAt.toISOString() : null,
      activeProjectsCount,
      totalActivitiesCount,
      lastError: this.lastError,
    }
  }
}

export const activityScheduler = ActivityMonitoringScheduler.getInstance()
