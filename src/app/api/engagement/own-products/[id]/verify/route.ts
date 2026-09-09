import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { ownProductsService } from '@/services/engagement/own-products.service'

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
    const { method = 'author_claim', authorUsername } = body

    const verified = await ownProductsService.verifyOwnership(
      auth.tenantId,
      params.id,
      method,
      authorUsername
    )

    return NextResponse.json({ success: true, product: verified })
  } catch (err: any) {
    console.error('Error in POST /api/engagement/own-products/[id]/verify:', err)
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 400 })
  }
}
