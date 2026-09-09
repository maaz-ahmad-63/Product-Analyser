import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { engagementService, GetThreadsFilter } from '@/services/engagement/engagement.service'

export async function GET(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const productUrl = searchParams.get('product_url') || undefined
    const search = searchParams.get('search') || undefined
    const needsReview = searchParams.get('needs_review') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const filter: GetThreadsFilter = {
      status,
      product_url: productUrl,
      search,
      needs_review: needsReview,
      limit,
      offset,
    }

    const data = await engagementService.getThreads(auth.tenantId, filter)
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Error in GET /api/engagement/threads:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch threads' }, { status: 500 })
  }
}
