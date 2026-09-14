import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'

const VALID_MODULES = [
  'product_intelligence',
  'seo',
  'sales',
  'reviews',
  'comments',
  'opportunities',
] as const

function formatAnalysis(record: any) {
  const competitorUrls: string[] =
    Array.isArray(record.competitorUrls) && record.competitorUrls.length > 0
      ? record.competitorUrls
      : record.competitorUrl
      ? [record.competitorUrl]
      : []

  const competitorNames = (record.competitorNames as Record<string, string>) || {}

  return {
    id: record.id,
    name: record.projectName || record.myProductName || record.myUrl || 'Untitled Analysis',
    platform: record.platform || 'generic',
    ownProduct: {
      url: record.myUrl,
      name: record.myProductName || (record.myProduct as any)?.name || null,
    },
    competitors: competitorUrls.map((url: string) => ({
      url,
      name: competitorNames[url] || null,
    })),
    selectedModules: record.selectedModules || [],
    status: record.status,
    shareEnabled: record.shareEnabled ?? false,
    shareToken: record.shareToken ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt || record.createdAt,
    lastRefreshedAt: record.lastRefreshedAt ? new Date(record.lastRefreshedAt).toISOString() : null,
    nextRefreshAt: record.nextRefreshAt ? new Date(record.nextRefreshAt).toISOString() : null,
    refreshLock: record.refreshLock ? true : false,
    tenantId: record.tenantId,
    userId: record.userId,
    errorMessage: record.errorMessage,
  }
}

function isValidHttpUrl(stringUrl: string): boolean {
  try {
    const url = new URL(stringUrl)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to view analyses.' },
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
    const tenantContext = await getTenantContext(request)

    // Build isolation where clause:
    // 1. If admin with no tenant requested, see all
    // 2. If tenant context exists, match tenantId OR user's own analyses
    // 3. Fallback: match userId
    let whereClause: any = {}
    if (!isAdmin) {
      if (tenantContext?.tenantId) {
        whereClause = {
          OR: [
            { tenantId: tenantContext.tenantId },
            { userId: session.user.id },
          ],
        }
      } else {
        whereClause = { userId: session.user.id }
      }
    }

    const records = await prisma.comparisonAnalysis.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const analyses = records.map(formatAnalysis)

    return NextResponse.json({ analyses }, { status: 200 })
  } catch (err: unknown) {
    console.error('Error in GET /api/analyses:', err)
    const msg = err instanceof Error ? err.message : 'Failed to fetch analyses'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to create analysis.' },
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

    // 1. Validate Analysis Name
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Analysis name is required (minimum 2 characters).' },
        { status: 400 }
      )
    }

    // 2. Validate Platform
    const rawPlatform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : ''
    const platform = rawPlatform === 'envato' ? 'envato' : 'generic'

    // 3. Validate Own Product
    const ownProductUrl =
      typeof body.ownProduct?.url === 'string'
        ? body.ownProduct.url.trim()
        : typeof body.myUrl === 'string'
        ? body.myUrl.trim()
        : ''
    const ownProductName =
      typeof body.ownProduct?.name === 'string'
        ? body.ownProduct.name.trim()
        : typeof body.myProductName === 'string'
        ? body.myProductName.trim()
        : undefined

    if (!ownProductUrl || !isValidHttpUrl(ownProductUrl)) {
      return NextResponse.json(
        { error: 'A valid Own Product URL starting with http:// or https:// is required.' },
        { status: 400 }
      )
    }

    // 4. Validate Competitors
    let competitorUrls: string[] = []
    if (Array.isArray(body.competitors)) {
      competitorUrls = body.competitors
        .map((c: any) => (typeof c === 'string' ? c.trim() : typeof c?.url === 'string' ? c.url.trim() : ''))
        .filter(Boolean)
    } else if (Array.isArray(body.competitorUrls)) {
      competitorUrls = body.competitorUrls.map((u: any) => String(u).trim()).filter(Boolean)
    }

    if (competitorUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one competitor URL is required.' },
        { status: 400 }
      )
    }

    for (const url of competitorUrls) {
      if (!isValidHttpUrl(url)) {
        return NextResponse.json(
          { error: `Invalid competitor URL format: ${url}. URLs must begin with http:// or https://.` },
          { status: 400 }
        )
      }
    }

    const normalizedOwn = ownProductUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
    const normalizedCompetitors = competitorUrls.map((u) =>
      u.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
    )

    if (normalizedCompetitors.includes(normalizedOwn)) {
      return NextResponse.json(
        { error: 'Your product URL cannot also be listed as a competitor.' },
        { status: 400 }
      )
    }

    const uniqueSet = new Set(normalizedCompetitors)
    if (uniqueSet.size !== normalizedCompetitors.length) {
      return NextResponse.json(
        { error: 'Duplicate competitor URLs detected. Please provide distinct URLs.' },
        { status: 400 }
      )
    }

    // 5. Validate Modules
    let selectedModules: string[] = []
    if (Array.isArray(body.selectedModules) && body.selectedModules.length > 0) {
      selectedModules = body.selectedModules.filter((m: string) =>
        VALID_MODULES.includes(m as any)
      )
    } else {
      // Default to all modules if unspecified
      selectedModules = [...VALID_MODULES]
    }

    // Resolve userId & tenantId
    let userId = session.user.id
    const userExists = await prisma.user.findUnique({ where: { id: userId } })
    if (!userExists && session.user.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: session.user.email } })
      if (byEmail) userId = byEmail.id
    }

    const tenantContext = await getTenantContext(request)
    const tenantId = tenantContext?.tenantId || session.user.tenants?.[0]?.id || null

    // Run analysis through WebsiteAnalyzerService with Phase 1 options
    const result = await websiteAnalyzerService.runAnalysis(
      ownProductUrl,
      competitorUrls,
      userId,
      name,
      [],
      {
        platform,
        selectedModules,
        myProductName: ownProductName,
        tenantId,
      }
    )

    // Fetch the created record to format it accurately
    const createdRecord = await prisma.comparisonAnalysis.findUnique({
      where: { id: result.analysis_id },
    })

    return NextResponse.json(
      {
        success: true,
        analysisId: result.analysis_id,
        analysis: createdRecord ? formatAnalysis(createdRecord) : null,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error('Error in POST /api/analyses:', err)
    const msg = err instanceof Error ? err.message : 'Analysis creation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
