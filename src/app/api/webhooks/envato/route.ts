// src/app/api/webhooks/envato/route.ts
// Optional webhook listener for official permitted Envato Market webhook events
// Provides a faster update mechanism when authorized webhooks or API events are configured.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activityScheduler } from '@/services/activity-monitor/scheduler'

export async function GET() {
  return NextResponse.json({
    status: 'active',
    mechanism: 'Envato Permitted Webhook Endpoint',
    description: 'Receives authorized webhook events (item_update, new_sale, new_comment) for instant monitoring triggers.',
    fallback: 'Hourly background polling active every 60 minutes.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log('[Envato Webhook] Received event payload:', payload)

    // Verify event structure
    const eventType = payload.event || payload.action || payload.type
    const itemUrl = payload.item_url || payload.url || payload.product_url

    if (!itemUrl) {
      return NextResponse.json({ error: 'Missing item_url in webhook payload' }, { status: 400 })
    }

    // Find any active comparison analysis that includes this product URL
    const matchingAnalyses = await prisma.comparisonAnalysis.findMany({
      where: {
        OR: [
          { myUrl: { contains: itemUrl } },
          { competitorUrl: { contains: itemUrl } },
          { competitorUrls: { has: itemUrl } },
        ],
      },
    })

    if (matchingAnalyses.length === 0) {
      return NextResponse.json({
        received: true,
        message: 'Webhook processed; no active projects tracking this product URL.',
      })
    }

    // Trigger on-demand check for matching projects
    for (const analysis of matchingAnalyses) {
      await activityScheduler.runMonitoringCycle(analysis.id)
    }

    return NextResponse.json({
      received: true,
      eventType: eventType || 'product_event',
      projectsUpdated: matchingAnalyses.length,
      processedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Envato Webhook] Error processing event:', err)
    return NextResponse.json({ error: err?.message || 'Failed to process webhook' }, { status: 500 })
  }
}
