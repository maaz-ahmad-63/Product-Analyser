import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      prisma.comparisonAnalysis.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.comparisonAnalysis.count(),
    ]);

    const formatted = analyses.map((a) => {
      const myProduct = a.myProduct as any;
      const competitorProduct = a.competitorProduct as any;

      const mySales = myProduct?.envatoSales?.total_sales ?? myProduct?.envato_sales?.total_sales ?? null;
      const myPrice = myProduct?.envatoSales?.price ?? myProduct?.envato_sales?.price ?? null;

      const compSales = competitorProduct?.envatoSales?.total_sales ?? competitorProduct?.envato_sales?.total_sales ?? null;
      const compPrice = competitorProduct?.envatoSales?.price ?? competitorProduct?.envato_sales?.price ?? null;

      return {
        id: a.id,
        status: a.status,
        myUrl: a.myUrl,
        competitorUrl: a.competitorUrl,
        errorMessage: a.errorMessage,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
        user: a.user || { id: 'anonymous', name: 'Anonymous', email: 'N/A' },
        sales: {
          target: mySales !== null ? { sales: Number(mySales), price: myPrice } : null,
          competitor: compSales !== null ? { sales: Number(compSales), price: compPrice } : null,
        },
      };
    });

    return NextResponse.json({
      analyses: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin analyses list error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
