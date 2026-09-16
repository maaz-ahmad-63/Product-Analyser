import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { organizeFeedbackIntoCategories } from '@/services/website-analyzer/comments-analyzer'
import { isValidShareTokenFormat } from '@/lib/share-token'

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    if (!isValidShareTokenFormat(token)) {
      return NextResponse.json({ error: 'Report unavailable.' }, { status: 404 })
    }

    const record = await prisma.comparisonAnalysis.findUnique({
      where: { shareToken: token },
      include: {
        opportunities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!record || !record.shareEnabled) {
      return NextResponse.json(
        { error: 'Report unavailable.' },
        { status: 404 }
      )
    }

    const selectedModules = record.selectedModules || []
    const isAll = selectedModules.length === 0

    const myProduct = (record.myProduct as any) || {}
    const competitorProduct = (record.competitorProduct as any) || {}
    const competitorsDataRaw = (record.competitorsData as any[]) || []
    const competitorsList =
      competitorsDataRaw.length > 0
        ? competitorsDataRaw
        : competitorProduct && Object.keys(competitorProduct).length > 0
        ? [competitorProduct]
        : []

    // 1. Executive Summary & KPIs
    const mySales = myProduct?.envatoSales || myProduct?.sales || null
    const targetPrice =
      mySales?.discounted_price || mySales?.product_price || myProduct?.pricingPlans?.[0]?.price || null
    const targetSales =
      mySales?.current_total_sales ?? mySales?.total_sales ?? null
    const targetRating =
      mySales?.rating ?? myProduct?.rating ?? null
    const targetReviewCount =
      mySales?.review_count ?? mySales?.rating_count ?? null

    // 2. Competitors Sanitized
    const sanitizedCompetitors = competitorsList.map((c: any, idx: number) => {
      const cSales = c?.envatoSales || c?.sales || null
      return {
        name: c.productName || c.title || `Competitor ${idx + 1}`,
        url: c.url,
        category: c.category || null,
        price: cSales?.discounted_price || cSales?.product_price || c?.pricingPlans?.[0]?.price || null,
        sales: cSales?.current_total_sales ?? cSales?.total_sales ?? null,
        rating: cSales?.rating ?? c?.rating ?? null,
        reviewCount: cSales?.review_count ?? cSales?.rating_count ?? null,
        features: Array.isArray(c.features) ? c.features.slice(0, 10) : [],
      }
    })

    // 3. Customer Feedback (if comments module selected)
    let customerFeedback = null
    if (isAll || selectedModules.includes('comments')) {
      const commentsAnalysis = (record.commentsAnalysis as any) || {}
      const rawComments = commentsAnalysis.comments || []
      const organized = organizeFeedbackIntoCategories(rawComments)
      customerFeedback = {
        totalFeedback: organized.totalFeedback,
        recurringCount: organized.recurringComplaints.length,
        criticalCount: organized.criticalSingleIssues.length,
        groups: organized.groups.map((g) => ({
          category: g.category,
          frequency: g.frequency,
          severity: g.severity,
          summary: g.summary,
          representativeEvidence: g.representativeEvidence,
          isRecurring: g.isRecurring,
        })),
        criticalSingleIssues: organized.criticalSingleIssues.map((c) => ({
          category: c.category,
          severity: c.severity,
          representativeEvidence: c.representativeEvidence,
        })),
      }
    }

    // 4. Strategic Opportunities (if opportunities module selected)
    let opportunities = null
    if (isAll || selectedModules.includes('opportunities')) {
      opportunities = (record.opportunities || []).map((opp) => ({
        issueCategory: opp.issueCategory,
        commentSummary: opp.commentSummary,
        valueProposition: opp.valueProposition,
        mentionCount: opp.mentionCount,
        severity: opp.severity,
        status: opp.status,
      }))
    }

    // 5. On-Page SEO (if seo module selected)
    let seoData = null
    if (isAll || selectedModules.includes('seo')) {
      const rawSeo = (record.seoAnalysis as any) || {}
      seoData = {
        targetKeywords: rawSeo?.target_keywords || [],
        myProductMeta: {
          title: myProduct?.title || null,
          description: myProduct?.metaDescription || null,
        },
        competitorMeta: sanitizedCompetitors[0]
          ? {
              title: sanitizedCompetitors[0].name || null,
              description: competitorsList[0]?.metaDescription || null,
            }
          : null,
      }
    }

    // 6. Sales Benchmarks (if sales module selected)
    let salesData = null
    if (isAll || selectedModules.includes('sales')) {
      salesData = {
        target: {
          price: targetPrice,
          sales: targetSales,
          rating: targetRating,
          licenseType: record.platform === 'amazon' || (myProduct?.url && /amazon\.[a-z.]+/i.test(myProduct.url)) ? 'Current Price' : (mySales ? 'Commercial license' : 'Standard SaaS'),
        },
        competitor: sanitizedCompetitors[0]
          ? {
              name: sanitizedCompetitors[0].name,
              price: sanitizedCompetitors[0].price,
              sales: sanitizedCompetitors[0].sales,
              rating: sanitizedCompetitors[0].rating,
            }
          : null,
      }
    }

    // 7. Sanitized Public Payload
    return NextResponse.json({
      reportTitle: record.projectName || myProduct?.title || 'Competitive Intelligence Report',
      platform: record.platform || 'generic',
      generatedAt: (record.updatedAt || record.createdAt).toISOString(),
      selectedModules,
      executiveSummary: {
        targetProduct: {
          name: record.myProductName || myProduct?.productName || myProduct?.title || 'Target Product',
          url: record.myUrl,
          price: targetPrice,
          sales: targetSales,
          rating: targetRating,
          reviewCount: targetReviewCount,
          featuresCount: Array.isArray(myProduct?.features) ? myProduct.features.length : null,
          features: Array.isArray(myProduct?.features) ? myProduct.features.slice(0, 10) : [],
        },
        competitorCount: sanitizedCompetitors.length,
        competitors: sanitizedCompetitors,
        briefing: record.executiveSummary || null,
      },
      productComparison:
        isAll || selectedModules.includes('product_intelligence')
          ? {
              target: {
                name: record.myProductName || myProduct?.title || 'Target Product',
                features: Array.isArray(myProduct?.features) ? myProduct.features : [],
                docsAvailable: !!myProduct?.docsLink,
                demoAvailable: !!myProduct?.contactOrDemoCta,
              },
              competitors: sanitizedCompetitors,
            }
          : null,
      seo: seoData,
      sales: salesData,
      customerFeedback,
      opportunities,
    })
  } catch (err: unknown) {
    console.error('Error in GET /api/reports/[token]:', err)
    return NextResponse.json({ error: 'Report unavailable.' }, { status: 500 })
  }
}
