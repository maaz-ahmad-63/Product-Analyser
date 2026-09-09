import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = [
  'New',
  'Needs review',
  'Reviewed',
  'Relevant',
  'Not relevant',
  'Message drafted',
  'Contacted manually',
  'Converted',
  'Closed',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, draftMessage } = body

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const opp = await prisma.competitorOpportunity.findUnique({
      where: { id },
      include: { analysis: true },
    })

    if (!opp) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // User ownership or admin check
    const isOwner = opp.userId === session.user.id || opp.analysis.userId === session.user.id
    if (!isOwner && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.competitorOpportunity.update({
      where: { id },
      data: {
        status: status || opp.status,
        draftMessage: draftMessage !== undefined ? draftMessage : opp.draftMessage,
      },
    })

    return NextResponse.json({ opportunity: updated }, { status: 200 })
  } catch (err: any) {
    console.error('Error updating opportunity status:', err)
    return NextResponse.json({ error: err.message || 'Failed to update opportunity' }, { status: 500 })
  }
}
