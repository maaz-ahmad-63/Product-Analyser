import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { ownProductsService } from '@/services/engagement/own-products.service'

export async function GET(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await ownProductsService.getOwnProducts(auth.tenantId)
    return NextResponse.json({ products })
  } catch (err: any) {
    console.error('Error in GET /api/engagement/own-products:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch own products' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { productUrl, productName, documentationUrl, supportPolicy, authorUsername } = body

    if (!productUrl) {
      return NextResponse.json({ error: 'productUrl is required' }, { status: 400 })
    }

    const product = await ownProductsService.addOwnProduct(auth.tenantId, {
      productUrl,
      productName,
      documentationUrl,
      supportPolicy,
      authorUsername,
    })

    return NextResponse.json({ success: true, product })
  } catch (err: any) {
    console.error('Error in POST /api/engagement/own-products:', err)
    return NextResponse.json({ error: err.message || 'Failed to add own product' }, { status: 400 })
  }
}
