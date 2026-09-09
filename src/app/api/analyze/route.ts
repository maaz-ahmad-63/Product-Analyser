import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to run product analysis.' },
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
    const myUrl = body.my_url || body.myUrl
    const rawCompetitorUrls =
      body.competitor_urls || body.competitorUrls || body.competitor_url || body.competitorUrl
    const projectName = body.project_name || body.projectName
    const targetKeywords = body.target_keywords || body.targetKeywords || []

    if (!myUrl) {
      return NextResponse.json(
        { error: 'My product URL is required.' },
        { status: 400 }
      )
    }

    if (!rawCompetitorUrls || (Array.isArray(rawCompetitorUrls) && rawCompetitorUrls.length === 0)) {
      return NextResponse.json(
        { error: 'At least one competitor URL is required.' },
        { status: 400 }
      )
    }

    // Ensure userId is valid in DB or fallback to email lookup
    let userId = session.user.id
    const userExists = await prisma.user.findUnique({ where: { id: userId } })
    if (!userExists && session.user.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (byEmail) userId = byEmail.id
    }

    // Execute multi-competitor analysis scoped to current authenticated user
    const result = await websiteAnalyzerService.runAnalysis(
      myUrl,
      rawCompetitorUrls,
      userId,
      projectName,
      targetKeywords
    )

    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    console.error('Error in /api/analyze:', err)
    const errorMsg = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const isAdmin = session?.user?.role === 'admin'

    const recent = await websiteAnalyzerService.getRecentAnalyses(20, userId, isAdmin)
    return NextResponse.json({ recent }, { status: 200 })
  } catch (err: unknown) {
    console.error('Error fetching recent analyses:', err)
    return NextResponse.json({ error: 'Failed to fetch recent analyses' }, { status: 500 })
  }
}
