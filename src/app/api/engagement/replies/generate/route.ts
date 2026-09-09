import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { engagementService } from '@/services/engagement/engagement.service'

export async function POST(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { threadId, targetMessageId } = body

    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
    }

    const draft = await engagementService.generateReplyForMessage(
      auth.tenantId,
      auth.userId,
      threadId,
      targetMessageId
    )

    return NextResponse.json({ success: true, draft })
  } catch (err: any) {
    console.error('Error in /api/engagement/replies/generate:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate reply' }, { status: 500 })
  }
}
