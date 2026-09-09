import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draft = await prisma.engagementReplyDraft.findFirst({
      where: { id: params.id, tenantId: auth.tenantId },
      include: {
        thread: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
        targetMessage: true,
      },
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    return NextResponse.json(draft)
  } catch (err: any) {
    console.error('Error in GET /api/engagement/replies/[id]:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch draft' }, { status: 500 })
  }
}
