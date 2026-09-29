// src/app/api/analyses/[id]/daily-sales/route.ts
// Dedicated endpoint: returns actual database rows grouped by day × product
// This is separate from the computed activity timeline — it reflects exact DB records.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    // Fetch the analysis record
    const record = await prisma.comparisonAnalysis.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Access control
    const isAdmin = session.user.role === 'admin'
    const tenantContext = await getTenantContext(request)
    const isOwner = record.userId === session.user.id
    const isTenantMember = tenantContext?.tenantId && record.tenantId === tenantContext.tenantId
    if (!isAdmin && !isOwner && !isTenantMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build the list of URLs to query
    const myUrl = record.myUrl as string
    const competitorUrls: string[] =
      Array.isArray(record.competitorUrls) && record.competitorUrls.length > 0
        ? (record.competitorUrls as string[])
        : record.competitorUrl
        ? [record.competitorUrl as string]
        : []

    const allUrls = [myUrl, ...competitorUrls]

    // 1. Pull all snapshots for these URLs
    const snapshots = await prisma.envatoSalesSnapshot.findMany({
      where: { sourceUrl: { in: allUrls } },
      orderBy: { collectedAt: 'asc' },
      select: {
        id: true,
        sourceUrl: true,
        productName: true,
        totalSales: true,
        price: true,
        rating: true,
        collectionStatus: true,
        collectedAt: true,
      },
    })

    // 2. Pull all activity records for this analysis
    const activities = await prisma.productActivityRecord.findMany({
      where: { analysisId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        productUrl: true,
        productName: true,
        isOurProduct: true,
        activityType: true,
        activityTitle: true,
        impactType: true,
        previousValue: true,
        currentValue: true,
        deltaValue: true,
        createdAt: true,
      },
    })

    // 3. Group snapshots by url → date → array of snapshots
    const byUrl: Record<string, typeof snapshots> = {}
    for (const s of snapshots) {
      if (!byUrl[s.sourceUrl]) byUrl[s.sourceUrl] = []
      byUrl[s.sourceUrl].push(s)
    }

    // 4. Group activities by url → date → array
    const actByUrl: Record<string, typeof activities> = {}
    for (const a of activities) {
      if (!actByUrl[a.productUrl]) actByUrl[a.productUrl] = []
      actByUrl[a.productUrl].push(a)
    }

    // 5. Build per-product day-wise summary
    const competitorNames = (record.competitorNames as Record<string, string>) || {}

    const products = allUrls.map((url) => {
      const isOwn = url === myUrl
      const urlSnaps = byUrl[url] || []
      const urlActs = actByUrl[url] || []

      // Group snapshots by calendar date
      const dateMap: Record<string, typeof urlSnaps> = {}
      for (const s of urlSnaps) {
        const day = s.collectedAt.toISOString().split('T')[0]
        if (!dateMap[day]) dateMap[day] = []
        dateMap[day].push(s)
      }

      // Group activities by calendar date
      const actDateMap: Record<string, typeof urlActs> = {}
      for (const a of urlActs) {
        const day = a.createdAt.toISOString().split('T')[0]
        if (!actDateMap[day]) actDateMap[day] = []
        actDateMap[day].push(a)
      }

      const days = Object.entries(dateMap)
        .sort(([a], [b]) => b.localeCompare(a)) // newest first
        .map(([date, snaps]) => {
          const first = snaps[0]
          const last = snaps[snaps.length - 1]
          const openingSales = first.totalSales
          const closingSales = last.totalSales
          const dailyGrowth =
            openingSales !== null && closingSales !== null
              ? closingSales - openingSales
              : null

          return {
            date,
            snapshots_saved: snaps.length,
            opening_sales: openingSales,
            closing_sales: closingSales,
            daily_growth: dailyGrowth,
            price: last.price,
            rating: last.rating,
            collection_status: last.collectionStatus,
            first_captured_at: first.collectedAt.toISOString(),
            last_captured_at: last.collectedAt.toISOString(),
            activities: (actDateMap[date] || []).map((a) => ({
              id: a.id,
              type: a.activityType,
              title: a.activityTitle,
              impact: a.impactType,
              from: a.previousValue,
              to: a.currentValue,
              delta: a.deltaValue,
            })),
          }
        })

      // Derive product name from first snapshot or competitorNames map
      const firstName = urlSnaps[0]?.productName || null
      const productName = isOwn
        ? (record.myProductName as string) || firstName || 'Your Product'
        : competitorNames[url] || firstName || url

      return {
        url,
        productName,
        isOwnProduct: isOwn,
        total_snapshots: urlSnaps.length,
        first_ever: urlSnaps[0]?.collectedAt.toISOString() || null,
        latest: urlSnaps[urlSnaps.length - 1]?.collectedAt.toISOString() || null,
        days_with_data: days.length,
        days,
      }
    })

    return NextResponse.json({
      analysisId: id,
      analysisName: record.projectName || record.myProductName || 'Analysis',
      generated_at: new Date().toISOString(),
      products,
    })
  } catch (err: any) {
    console.error('[DailySales API] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch daily sales data' },
      { status: 500 }
    )
  }
}
