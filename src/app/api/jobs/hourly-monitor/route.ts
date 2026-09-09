// src/app/api/jobs/hourly-monitor/route.ts
// Background hourly monitoring trigger and telemetry endpoint

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activityScheduler } from '@/services/activity-monitor/scheduler'

export async function GET(_req: NextRequest) {
  try {
    const status = await activityScheduler.getStatus()
    return NextResponse.json(status, { status: 200 })
  } catch (err: any) {
    console.error('Error fetching scheduler status:', err)
    return NextResponse.json({ error: err?.message || 'Failed to fetch status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let targetAnalysisId: string | undefined
    try {
      const body = await req.json()
      if (body?.analysisId) {
        targetAnalysisId = String(body.analysisId).trim()
      }
    } catch {
      // Body may be empty
    }

    // Also check query param
    const { searchParams } = new URL(req.url)
    const queryId = searchParams.get('analysisId')
    if (queryId) {
      targetAnalysisId = queryId
    }

    console.log(`[HourlyMonitor API] Manual trigger requested by ${session.user.email} (Target: ${targetAnalysisId || 'ALL'})`)

    // Run cycle
    const results = await activityScheduler.runMonitoringCycle(targetAnalysisId)

    return NextResponse.json({
      success: true,
      message: `Monitoring cycle completed for ${results.length} project(s).`,
      results,
      executedAt: new Date().toISOString(),
    }, { status: 200 })
  } catch (err: any) {
    console.error('Error executing hourly monitoring cycle:', err)
    return NextResponse.json({ error: err?.message || 'Failed to run monitoring cycle' }, { status: 500 })
  }
}
