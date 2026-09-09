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

    const updated = await engagementService.markDraftPosted(
      auth.tenantId,
      auth.userId,
      params.id
    )

    return NextResponse.json({ success: true, draft: updated })
  } catch (err: any) {
    console.error('Error in POST /api/engagement/replies/[id]/mark-posted:', err)
    return NextResponse.json({ error: err.message || 'Failed to mark draft posted' }, { status: 500 })
  }
}
