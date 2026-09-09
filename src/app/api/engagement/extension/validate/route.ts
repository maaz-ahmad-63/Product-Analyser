import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'

export async function GET(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: auth.userId,
        name: auth.userName,
        email: auth.userEmail,
        role: auth.role,
      },
      tenant: {
        id: auth.tenantId,
        name: auth.tenantName,
      },
    })
  } catch (err: any) {
    console.error('Error in /api/engagement/extension/validate:', err)
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
