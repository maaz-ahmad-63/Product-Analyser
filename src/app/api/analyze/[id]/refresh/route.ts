import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing analysis id' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to refresh analysis.' },
        { status: 401 }
      )
    }

    if (session.user.isActive === false) {
      return NextResponse.json(
        { error: 'This account has been deactivated.' },
        { status: 403 }
      )
    }

    const isAdmin = session.user.role === 'admin'

    const updated = await websiteAnalyzerService.refreshSalesSnapshots(
      id,
      session.user.id,
      isAdmin
    )

    return NextResponse.json(updated, { status: 200 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to refresh this analysis.' },
        { status: 403 }
      )
    }
    console.error('Error refreshing sales snapshots:', err)
    const errorMsg = err instanceof Error ? err.message : 'Failed to refresh sales analysis'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
