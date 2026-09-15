// src/app/api/jobs/hourly-monitor/route.ts
// Background hourly monitoring trigger and telemetry endpoint

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activityScheduler } from '@/services/activity-monitor/scheduler'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const isTrigger = searchParams.get('trigger') === 'true'
    const authHeader = req.headers.get('authorization')
    const isVercelCron =
      req.headers.get('x-vercel-cron') === '1' ||
      Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)

    // If triggered via Vercel cron or explicit trigger parameter
    if (isTrigger || isVercelCron) {
      const targetAnalysisId = searchParams.get('analysisId') || undefined
      console.log(`[HourlyMonitor API] Cron/Trigger GET received (Target: ${targetAnalysisId || 'ALL'}, VercelCron: ${isVercelCron})`)
      const results = await activityScheduler.runMonitoringCycle(targetAnalysisId)
      return NextResponse.json({
        success: true,
        message: `Monitoring cycle completed for ${results.length} project(s).`,
        results,
        executedAt: new Date().toISOString(),
      }, { status: 200 })
    }

    const status = await activityScheduler.getStatus()
    return NextResponse.json(status, { status: 200 })
  } catch (err: any) {
    console.error('Error fetching scheduler status or running cron:', err)
    return NextResponse.json({ error: err?.message || 'Failed to fetch status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCronAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      req.headers.get('x-vercel-cron') === '1'

    let userEmail = 'cron-service'
    if (!isCronAuthorized) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      userEmail = session.user.email || 'user'
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

    console.log(`[HourlyMonitor API] Trigger requested by ${userEmail} (Target: ${targetAnalysisId || 'ALL'})`)

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
