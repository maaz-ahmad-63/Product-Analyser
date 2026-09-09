import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authService } from '@/services/auth.service'
import { extensionAuthService } from '@/services/engagement/extension-auth.service'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, password, deviceName, tenantId: requestedTenantId } = body

    let userId: string | null = null
    let tenantId: string | null = null
    let userName: string = ''
    let userEmail: string = ''
    let tenantName: string = ''

    // 1. If credentials provided in body
    if (email && password) {
      const user = await authService.validateCredentials(
        email.trim().toLowerCase(),
        password
      )
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      userId = user.id
      userName = user.name
      userEmail = user.email

      // Select requested tenant, or tenant where user is direct owner (e.g. SIZH IT Solution), or first owner role
      let chosenTu = null
      if (requestedTenantId) {
        chosenTu = user.tenantUsers.find((tu) => tu.tenantId === requestedTenantId)
      }
      if (!chosenTu) {
        chosenTu = user.tenantUsers.find((tu) => tu.tenant.ownerId === user.id)
      }
      if (!chosenTu) {
        chosenTu = user.tenantUsers.find((tu) => tu.role === 'owner') || user.tenantUsers[0]
      }

      const tenant = chosenTu?.tenant
      if (!tenant) {
        return NextResponse.json(
          { error: 'User is not associated with any active tenant' },
          { status: 403 }
        )
      }
      tenantId = tenant.id
      tenantName = tenant.name
    } else {
      // 2. Check NextAuth session
      const session = await getServerSession(authOptions)
      if (session?.user?.id && session.user.tenants?.length) {
        userId = session.user.id
        userName = session.user.name || ''
        userEmail = session.user.email || ''

        let chosen = null
        if (requestedTenantId) {
          chosen = session.user.tenants.find((t) => t.id === requestedTenantId)
        }
        if (!chosen) {
          // Check if user owns a tenant
          const owned = await prisma.tenant.findFirst({
            where: { ownerId: session.user.id, status: 'active' },
          })
          if (owned) {
            chosen = session.user.tenants.find((t) => t.id === owned.id)
          }
        }
        if (!chosen) {
          chosen = session.user.tenants[0]
        }

        tenantId = chosen.id
        tenantName = chosen.name
      }
    }

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide credentials or login via SaaS dashboard.' },
        { status: 401 }
      )
    }

    const tokenRecord = await extensionAuthService.createExtensionToken(
      userId,
      tenantId,
      deviceName || 'Envato Comment Assistant Extension'
    )

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      expiresAt: tokenRecord.expiresAt.toISOString(),
      user: {
        id: userId,
        name: userName,
        email: userEmail,
      },
      tenant: {
        id: tenantId,
        name: tenantName,
      },
    })
  } catch (err: any) {
    console.error('Error in /api/engagement/extension/connect:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to connect extension' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
