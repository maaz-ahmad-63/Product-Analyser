import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'

export async function GET(
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
        { error: 'Authentication required to view analysis.' },
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

    const analysis = await websiteAnalyzerService.getAnalysisById(
      id,
      session.user.id,
      isAdmin
    )

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json(analysis, { status: 200 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to view this analysis.' },
        { status: 403 }
      )
    }
    console.error('Error fetching analysis by id:', err)
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch analysis'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
