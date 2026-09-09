import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { prisma } from '@/lib/prisma'
import { engagementService } from '@/services/engagement/engagement.service'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const thread = await engagementService.getThreadById(auth.tenantId, params.id)
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json(thread)
  } catch (err: any) {
    console.error('Error in GET /api/engagement/threads/[id]:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch thread' }, { status: 500 })
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
    const { threadStatus } = body

    if (!threadStatus) {
      return NextResponse.json({ error: 'threadStatus is required' }, { status: 400 })
    }

    const updated = await prisma.engagementThread.update({
      where: { id: params.id, tenantId: auth.tenantId },
      data: { threadStatus },
    })

    // Emit event
    await prisma.engagementReplyEvent.create({
      data: {
        tenantId: auth.tenantId,
        threadId: updated.id,
        eventType: 'status_changed',
        eventData: { newStatus: threadStatus, userId: auth.userId },
      },
    })

    return NextResponse.json({ success: true, thread: updated })
  } catch (err: any) {
    console.error('Error in PATCH /api/engagement/threads/[id]:', err)
    return NextResponse.json({ error: err.message || 'Failed to update thread' }, { status: 500 })
  }
}
