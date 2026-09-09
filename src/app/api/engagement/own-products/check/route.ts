import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { ownProductsService } from '@/services/engagement/own-products.service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({
        allowed: false,
        reason: 'unauthorized',
        message: 'Extension is not paired with an active SaaS account.',
      }, { status: 401 })
    }

    if (!url) {
      return NextResponse.json({
        allowed: false,
        reason: 'missing_url',
        message: 'URL parameter is required.',
      }, { status: 400 })
    }

    const result = await ownProductsService.checkUrlAllowed(auth.tenantId, url)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error in GET /api/engagement/own-products/check:', err)
    return NextResponse.json({
      allowed: false,
      reason: 'error',
      message: err.message || 'Check failed',
    }, { status: 500 })
  }
}
