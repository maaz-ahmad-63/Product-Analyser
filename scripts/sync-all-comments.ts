import { prisma } from '../src/lib/prisma'
import { analyzeCompetitorComments } from '../src/services/website-analyzer/comments-analyzer'
import { execSync } from 'child_process'

async function syncAllComments() {
  console.log('[SyncComments] Finding active analysis...')
  const analysis = await prisma.comparisonAnalysis.findFirst({
    orderBy: { updatedAt: 'desc' },
  })
  if (!analysis) {
    console.error('[SyncComments] No analysis found')
    return
  }
  console.log(`[SyncComments] Found analysis ID: ${analysis.id} (${analysis.projectName})`)

  const myProduct = (analysis.myProduct as any) || {}
  const competitorsData = (analysis.competitorsData as any[]) || []
  const existingCa = (analysis.commentsAnalysis as any) || {}

  console.log('[SyncComments] Scraping live RideOn comments via stealth scraper...')
  let rideonComments: any[] = []
  let rideonCommentCount: number | null = null

  try {
    const raw = execSync(
      `python3 src/services/website-analyzer/stealth_scraper.py "${analysis.myUrl}"`,
      { maxBuffer: 15 * 1024 * 1024, timeout: 60000 }
    ).toString()
    const scraped = JSON.parse(raw)
    if (scraped.comments && scraped.comments.length > 0) {
      rideonComments = scraped.comments
      console.log(`[SyncComments] Successfully scraped ${rideonComments.length} RideOn comments!`)
    }
    if (scraped.envatoSales?.comment_count) {
      rideonCommentCount = scraped.envatoSales.comment_count
      console.log(`[SyncComments] Total marketplace comment count: ${rideonCommentCount}`)
    }
  } catch (err: any) {
    console.error('[SyncComments] Scraper error:', err?.message || err)
  }

  // Scraped comments map for analyzeCompetitorComments
  const scrapedCommentsMap: Record<string, any[]> = {
    [analysis.myUrl]: rideonComments,
  }

  // Preserve existing competitor comments from all_comments
  const allExistingComments = existingCa.all_comments || []
  for (const comp of competitorsData) {
    const compComments = allExistingComments.filter((c: any) => {
      const u = (c.product_url || '').toLowerCase()
      const compU = (comp.url || '').toLowerCase()
      return (
        (compU && (u === compU || u.includes(compU) || compU.includes(u))) ||
        (c.product_name && comp.productName && c.product_name.toLowerCase() === comp.productName.toLowerCase())
      )
    })

    scrapedCommentsMap[comp.url] = compComments.map((c: any) => ({
      author_name: c.author_name || 'Customer',
      comment_text: c.comment_text,
      comment_date: c.comment_date || 'Recent public review',
      comment_url: c.comment_url || null,
      rating: c.rating ?? null,
    }))
    console.log(`[SyncComments] Extracted ${scrapedCommentsMap[comp.url].length} comments for competitor: ${comp.productName?.slice(0, 30)}`)
  }

  // Update myProduct comment count
  if (rideonCommentCount) {
    myProduct.envatoSales = {
      ...(myProduct.envatoSales || {}),
      comment_count: rideonCommentCount,
    }
  }

  const allProducts = [myProduct, ...competitorsData]
  console.log('[SyncComments] Running analyzeCompetitorComments for all 6 products...')
  const newCa = await analyzeCompetitorComments(allProducts, scrapedCommentsMap)

  console.log(`[SyncComments] New total_analyzed: ${newCa.total_analyzed}`)
  console.log(`[SyncComments] New all_comments length: ${(newCa as any).all_comments?.length}`)
  console.log(`[SyncComments] Summaries:`, newCa.summaries.map((s) => `${s.product_name?.slice(0, 25)}: ${s.total_comments}`))

  // Persist updated analysis
  await prisma.comparisonAnalysis.update({
    where: { id: analysis.id },
    data: {
      myProduct,
      commentsAnalysis: JSON.parse(JSON.stringify(newCa)),
    },
  })

  console.log('[SyncComments] Successfully saved updated commentsAnalysis to database!')
}

syncAllComments()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
