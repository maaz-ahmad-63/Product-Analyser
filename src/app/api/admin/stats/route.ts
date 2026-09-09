import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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

    const [
      totalUsers,
      activeUsers,
      totalAnalyses,
      completedAnalyses,
      failedAnalyses,
      totalSalesSnapshots,
      recentUsers,
      recentAnalyses,
      failedJobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.comparisonAnalysis.count(),
      prisma.comparisonAnalysis.count({ where: { status: 'COMPLETED' } }),
      prisma.comparisonAnalysis.count({ where: { status: 'FAILED' } }),
      prisma.envatoSalesSnapshot.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              analyses: true,
            },
          },
        },
      }),
      prisma.comparisonAnalysis.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          myUrl: true,
          competitorUrl: true,
          status: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.comparisonAnalysis.findMany({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          myUrl: true,
          competitorUrl: true,
          errorMessage: true,
          createdAt: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
    ])

    const overview = {
      totalUsers,
      activeUsers,
      deactivatedUsers: totalUsers - activeUsers,
      totalAnalyses,
      completedAnalyses,
      failedAnalyses,
      processingAnalyses: totalAnalyses - completedAnalyses - failedAnalyses,
      totalSalesSnapshots,
      successRate:
        totalAnalyses > 0
          ? Math.round((completedAnalyses / totalAnalyses) * 100)
          : 100,
    }

    return NextResponse.json(
      {
        overview,
        stats: overview,
        recentUsers,
        recentAnalyses,
        recentFailures: failedJobs,
        recentErrors: failedJobs,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('Error fetching admin stats:', err)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
