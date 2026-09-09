import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'

const VALID_STATUSES = [
  'New',
  'Under Review',
  'Confirmed',
  'Rejected',
  'Converted to Opportunity',
  'Resolved',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; complaintId: string } }
) {
  try {
    const { id, complaintId } = params
    if (!id || !complaintId) {
      return NextResponse.json({ error: 'Missing analysis id or complaint id' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to update complaint status.' },
        { status: 401 }
      )
    }

    if (session.user.isActive === false) {
      return NextResponse.json(
        { error: 'This account has been deactivated.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const isAdmin = session.user.role === 'admin'
    const updated = await websiteAnalyzerService.updateComplaintStatus(
      id,
      complaintId,
      status,
      session.user.id,
      isAdmin
    )

    return NextResponse.json({ success: true, commentsAnalysis: updated }, { status: 200 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to update this analysis.' },
        { status: 403 }
      )
    }
    console.error('Error updating complaint status:', err)
    const errorMsg = err instanceof Error ? err.message : 'Failed to update complaint status'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
