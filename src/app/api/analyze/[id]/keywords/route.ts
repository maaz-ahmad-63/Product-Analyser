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

  try {
    const body = await request.json()
    const { target_keywords } = body

    if (!Array.isArray(target_keywords)) {
      return NextResponse.json(
        { error: 'target_keywords must be an array of strings' },
        { status: 400 }
      )
    }

    const updatedSeo = await websiteAnalyzerService.updateProjectKeywords(
      id,
      target_keywords,
      session.user.id,
      session.user.role === 'admin'
    )

    return NextResponse.json({ success: true, seo_analysis: updatedSeo })
  } catch (err: any) {
    console.error('Error updating project keywords:', err)
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(
      { error: err.message || 'Failed to update keywords' },
      { status: 500 }
    )
  }
}
