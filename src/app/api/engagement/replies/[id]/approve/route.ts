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

    const updated = await engagementService.approveDraft(
      auth.tenantId,
      auth.userId,
      params.id
    )

    return NextResponse.json({ success: true, draft: updated })
  } catch (err: any) {
    console.error('Error in POST /api/engagement/replies/[id]/approve:', err)
    return NextResponse.json({ error: err.message || 'Failed to approve draft' }, { status: 500 })
  }
}
