import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { engagementService } from '@/services/engagement/engagement.service'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = body.reason || 'Rejected by user'

    const updated = await engagementService.rejectDraft(
      auth.tenantId,
      auth.userId,
      params.id,
      reason
    )

    return NextResponse.json({ success: true, draft: updated })
  } catch (err: any) {
    console.error('Error in POST /api/engagement/replies/[id]/reject:', err)
    return NextResponse.json({ error: err.message || 'Failed to reject draft' }, { status: 500 })
  }
}
