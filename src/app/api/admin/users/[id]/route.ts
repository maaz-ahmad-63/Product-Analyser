import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isActive, role } = body

    const targetUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Safety checks
    if (id === session.user.id && isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own administrative account.' },
        { status: 400 }
      )
    }

    if (id === session.user.id && role && role !== 'admin') {
      const otherAdmins = await prisma.user.count({
        where: { role: 'admin', isActive: true, NOT: { id } },
      })
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot revoke admin role: system must retain at least one active administrator.' },
          { status: 400 }
        )
      }
    }

    const updateData: { isActive?: boolean; role?: string } = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (role === 'user' || role === 'admin') updateData.role = role

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    })

    return NextResponse.json({ user: updated }, { status: 200 })
  } catch (err: unknown) {
    console.error('Error updating user:', err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
