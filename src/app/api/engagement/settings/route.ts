import { NextResponse } from 'next/server'
import { resolveEngagementAuth } from '@/lib/engagement-auth'
import { engagementService } from '@/services/engagement/engagement.service'

export async function GET(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await engagementService.getSettings(auth.tenantId)
    return NextResponse.json(settings)
  } catch (err: any) {
    console.error('Error in GET /api/engagement/settings:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await resolveEngagementAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const updated = await engagementService.updateSettings(auth.tenantId, {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      autoGenerate: typeof body.autoGenerate === 'boolean' ? body.autoGenerate : undefined,
      autoInsert: typeof body.autoInsert === 'boolean' ? body.autoInsert : undefined,
      autoPost: typeof body.autoPost === 'boolean' ? body.autoPost : undefined,
      dailyReplyLimit: typeof body.dailyReplyLimit === 'number' ? body.dailyReplyLimit : undefined,
      requireApprovalForAll: typeof body.requireApprovalForAll === 'boolean' ? body.requireApprovalForAll : undefined,
    })

    return NextResponse.json({ success: true, settings: updated })
  } catch (err: any) {
    console.error('Error in PATCH /api/engagement/settings:', err)
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 })
  }
}
