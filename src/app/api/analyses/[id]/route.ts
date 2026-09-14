import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'
import { deleteAnalysisWorkspace } from '@/services/analysis-deletion'
import { websiteAnalyzerService } from '@/services/website-analyzer'

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
    executiveSummary: record.executiveSummary ?? null,
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 })
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

    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
    })

    if (!record) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin'
    const tenantContext = await getTenantContext(request)

    // Verify tenant / user isolation
    const isOwner = record.userId === session.user.id
    const isTenantMember =
      tenantContext?.tenantId && record.tenantId === tenantContext.tenantId

    if (!isAdmin && !isOwner && !isTenantMember) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this analysis.' },
        { status: 403 }
      )
    }

    let analyzedData = null
    try {
      analyzedData = await websiteAnalyzerService.getAnalysisById(
        id,
        session.user.id,
        isAdmin
      )
    } catch {
      // If results are not yet calculated or record in progress, return null data
      analyzedData = null
    }

    return NextResponse.json(
      {
        analysis: formatAnalysis(record),
        data: analyzedData,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('Error in GET /api/analyses/[id]:', err)
    const msg = err instanceof Error ? err.message : 'Failed to fetch analysis'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
    })

    if (!record) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin'
    const tenantContext = await getTenantContext(request)
    const isOwner = record.userId === session.user.id
    const isTenantMember =
      tenantContext?.tenantId && record.tenantId === tenantContext.tenantId

    if (!isAdmin && !isOwner && !isTenantMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const dataToUpdate: any = {}

    if (body.name !== undefined) {
      dataToUpdate.projectName = String(body.name).trim() || 'Untitled Analysis'
    }
    if (body.myProductName !== undefined) {
      dataToUpdate.myProductName = String(body.myProductName).trim() || null
    }
    if (Array.isArray(body.selectedModules)) {
      dataToUpdate.selectedModules = body.selectedModules
    }

    const updated = await prisma.comparisonAnalysis.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({
      success: true,
      analysis: formatAnalysis(updated),
      message: 'Analysis updated successfully.',
    })
  } catch (err: unknown) {
    console.error('Error in PATCH /api/analyses/[id]:', err)
    return NextResponse.json({ error: 'Failed to update analysis' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required to delete analysis.' },
        { status: 401 }
      )
    }

    // STRICT ADMIN REQUIREMENT: Normal users cannot delete workspaces
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required to delete an analysis workspace.' },
        { status: 403 }
      )
    }

    // Parse optional confirmation name
    let confirmName: string | null = null
    try {
      const body = await request.json()
      if (body?.confirmName) {
        confirmName = String(body.confirmName)
      }
    } catch {
      // Body is optional
    }

    const result = await deleteAnalysisWorkspace(
      id,
      session.user.id,
      session.user.email,
      confirmName
    )

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return NextResponse.json(
      { success: true, message: result.message },
      { status: result.status }
    )
  } catch (err: unknown) {
    console.error('Error in DELETE /api/analyses/[id]:', err)
    const msg = err instanceof Error ? err.message : 'Failed to delete analysis'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
