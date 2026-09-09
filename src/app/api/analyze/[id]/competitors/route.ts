import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const competitorUrl = body.competitor_url || body.competitorUrl

  if (!competitorUrl) {
    return NextResponse.json({ error: 'Competitor URL is required' }, { status: 400 })
  }

  try {
    const updated = await websiteAnalyzerService.addCompetitorToProject(
      id,
      competitorUrl,
      session.user.id,
      session.user.role === 'admin'
    )
    return NextResponse.json(updated, { status: 200 })
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden: You do not own this project.' }, { status: 403 })
    }
    return NextResponse.json({ error: err.message || 'Failed to add competitor' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const competitorUrl = searchParams.get('url')

  if (!competitorUrl) {
    return NextResponse.json({ error: 'Competitor URL parameter is required' }, { status: 400 })
  }

  try {
    const updated = await websiteAnalyzerService.removeCompetitorFromProject(
      id,
      competitorUrl,
      session.user.id,
      session.user.role === 'admin'
    )
    return NextResponse.json(updated, { status: 200 })
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden: You do not own this project.' }, { status: 403 })
    }
    return NextResponse.json({ error: err.message || 'Failed to remove competitor' }, { status: 400 })
  }
}
