import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { prisma } from '@/lib/prisma'
import { ownProductsService } from '@/services/engagement/own-products.service'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.ownEnvatoProduct.findFirst({
      where: { id: params.id, tenantId: auth.tenantId },
      include: {
        threads: {
          orderBy: { lastCommentAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (err: any) {
    console.error('Error in GET /api/engagement/own-products/[id]:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const updated = await prisma.ownEnvatoProduct.update({
      where: { id: params.id },
      data: {
        productName: body.productName !== undefined ? body.productName : undefined,
        documentationUrl: body.documentationUrl !== undefined ? body.documentationUrl : undefined,
        supportPolicy: body.supportPolicy !== undefined ? body.supportPolicy : undefined,
        authorUsername: body.authorUsername !== undefined ? body.authorUsername : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      },
    })

    return NextResponse.json({ success: true, product: updated })
  } catch (err: any) {
    console.error('Error in PATCH /api/engagement/own-products/[id]:', err)
    return NextResponse.json({ error: err.message || 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ownProductsService.deleteProduct(auth.tenantId, params.id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in DELETE /api/engagement/own-products/[id]:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete product' }, { status: 500 })
  }
}
