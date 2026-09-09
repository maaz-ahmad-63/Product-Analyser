import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return quick summary of synced threads and pending actions
    const [threadsCount, pendingDraftsCount, lastEvent] = await Promise.all([
      prisma.engagementThread.count({ where: { tenantId: auth.tenantId } }),
      prisma.engagementReplyDraft.count({
        where: { tenantId: auth.tenantId, status: 'needs_review' },
      }),
      prisma.engagementReplyEvent.findFirst({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      summary: {
        totalThreads: threadsCount,
        pendingDrafts: pendingDraftsCount,
        lastEventAt: lastEvent?.createdAt || null,
        lastEventType: lastEvent?.eventType || null,
      },
    })
  } catch (err: any) {
    console.error('Error in /api/engagement/run-sync:', err)
    return NextResponse.json({ error: err.message || 'Failed to run sync status' }, { status: 500 })
  }
}
