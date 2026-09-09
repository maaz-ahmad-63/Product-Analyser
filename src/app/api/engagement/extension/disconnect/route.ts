import { NextResponse } from 'next/server'
import { extensionAuthService } from '@/services/engagement/extension-auth.service'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    let rawToken = ''
    if (authHeader && authHeader.startsWith('Bearer eca_')) {
      rawToken = authHeader.substring(7).trim()
    } else {
      const body = await req.json().catch(() => ({}))
      rawToken = body.token || ''
    }

    if (!rawToken) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const success = await extensionAuthService.revokeToken(rawToken)
    return NextResponse.json({ success })
  } catch (err: any) {
    console.error('Error in /api/engagement/extension/disconnect:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
