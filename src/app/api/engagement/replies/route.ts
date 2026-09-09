import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { engagementService } from '@/services/engagement/engagement.service'

export async function GET(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const drafts = await engagementService.getDrafts(auth.tenantId, {
      status,
      limit,
      offset,
    })

    return NextResponse.json({ drafts })
  } catch (err: any) {
    console.error('Error in GET /api/engagement/replies:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch drafts' }, { status: 500 })
  }
}
