import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { engagementService, SyncCommentsPayload } from '@/services/engagement/engagement.service'

export async function POST(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as SyncCommentsPayload

    if (!body || !body.product_url || !Array.isArray(body.threads)) {
      return NextResponse.json(
        { error: 'Invalid payload. product_url and threads array are required.' },
        { status: 400 }
      )
    }

    const result = await engagementService.syncComments(auth.tenantId, auth.userId, body)

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      result,
    })
  } catch (err: any) {
    console.error('Error in /api/engagement/comments/sync:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to sync comments' },
      { status: 500 }
    )
  }
}
