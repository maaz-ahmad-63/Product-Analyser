import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteAnalysisWorkspace } from '@/services/analysis-deletion'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 })
  }

  const resolvedParams = await Promise.resolve(params)
  const id = resolvedParams?.id

  if (!id) {
    return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 })
  }

  // Parse optional confirmation name from request body
  let confirmName: string | null = null
  try {
    const body = await req.json()
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

  return NextResponse.json({ success: true, message: result.message }, { status: result.status })
}
