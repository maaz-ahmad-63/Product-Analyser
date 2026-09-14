import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'
import { generateUniqueShareToken } from '@/lib/share-token'

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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
      select: {
        id: true,
        projectName: true,
        myUrl: true,
        userId: true,
        tenantId: true,
        shareEnabled: true,
        shareToken: true,
      },
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

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = record.shareToken
      ? `${baseUrl}/report/${record.shareToken}`
      : null

    return NextResponse.json({
      shareEnabled: record.shareEnabled,
      shareToken: record.shareToken,
      shareUrl,
    })
  } catch (err: unknown) {
    console.error('Error in GET /api/analyses/[id]/share:', err)
    return NextResponse.json({ error: 'Failed to fetch share status' }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const record = await prisma.comparisonAnalysis.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        tenantId: true,
        shareEnabled: true,
        shareToken: true,
      },
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
    const enable =
      typeof body.shareEnabled === 'boolean' ? body.shareEnabled : !record.shareEnabled

    // Reuse existing valid token if already assigned, otherwise generate new 32-character URL-safe token
    let token = record.shareToken
    if (!token) {
      token = await generateUniqueShareToken() // Exactly 32 URL-safe characters
    }

    const updated = await prisma.comparisonAnalysis.update({
      where: { id },
      data: {
        shareEnabled: enable,
        shareToken: token,
      },
      select: {
        id: true,
        shareEnabled: true,
        shareToken: true,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/report/${updated.shareToken}`

    return NextResponse.json({
      success: true,
      shareEnabled: updated.shareEnabled,
      shareToken: updated.shareToken,
      shareUrl,
      message: updated.shareEnabled
        ? 'Public report enabled.'
        : 'Public report disabled.',
    })
  } catch (err: unknown) {
    console.error('Error in POST /api/analyses/[id]/share:', err)
    return NextResponse.json({ error: 'Failed to update share status' }, { status: 500 })
  }
}
