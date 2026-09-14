import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { websiteAnalyzerService } from '@/services/website-analyzer'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'

export async function POST(
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
        { error: 'Authentication required to run analysis.' },
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

    const isOwner = record.userId === session.user.id
    const isTenantMember =
      tenantContext?.tenantId && record.tenantId === tenantContext.tenantId

    if (!isAdmin && !isOwner && !isTenantMember) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to run this analysis.' },
        { status: 403 }
      )
    }

    const competitorUrls =
      record.competitorUrls.length > 0 ? record.competitorUrls : [record.competitorUrl]

    // Execute safe in-place analysis refresh
    const refreshedData = await websiteAnalyzerService.refreshExistingAnalysis(
      id,
      session.user.id,
      isAdmin
    )

    const updatedRecord = await prisma.comparisonAnalysis.findUnique({
      where: { id },
    })

    return NextResponse.json(
      {
        success: true,
        analysis: updatedRecord,
        data: refreshedData,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('Error in POST /api/analyses/[id]/run:', err)
    const msg = err instanceof Error ? err.message : 'Failed to run analysis'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
