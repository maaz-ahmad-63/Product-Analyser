import { PrismaClient } from '@prisma/client'
import { analyzeSeo } from '../src/services/website-analyzer/seo-analyzer'
import { ExtractedProductData } from '../src/services/website-analyzer/types'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.comparisonAnalysis.findMany({
    where: {
      status: 'completed',
    },
  })

  console.log(`Found ${projects.length} completed projects to refresh SEO discoverability analysis.`)

  for (const project of projects) {
    if (!project.myProduct) {
      console.log(`Skipping project ${project.id} (${project.projectName}): no myProduct`)
      continue
    }

    const myProduct = project.myProduct as unknown as ExtractedProductData
    const competitors = (project.competitorsData as unknown as ExtractedProductData[]) ||
      (project.competitorProduct ? [project.competitorProduct as unknown as ExtractedProductData] : [])

    if (competitors.length === 0) {
      console.log(`Skipping project ${project.id} (${project.projectName}): no competitors`)
      continue
    }

    const commentsAnalysis = project.commentsAnalysis as any
    const rawComments = commentsAnalysis?.all_comments || commentsAnalysis?.comments || []

    console.log(`Analyzing SEO for project ${project.id} (${project.projectName || project.myProductName}):`)
    console.log(`- My product: ${myProduct.productName}`)
    console.log(`- Competitors: ${competitors.length}`)
    console.log(`- Comments available: ${rawComments.length}`)

    const updatedSeo = analyzeSeo(
      myProduct,
      competitors,
      [],
      {},
      commentsAnalysis
    )

    console.log(`- Observed my topics: ${updatedSeo.my_topics?.length || 0}`)
    console.log(`- Competitor only topics: ${updatedSeo.competitor_only_topics?.length || 0}`)
    console.log(`- Sample topics:`, updatedSeo.my_topics?.slice(0, 5))
    console.log(`- Sample competitor gaps:`, updatedSeo.competitor_only_topics?.slice(0, 3).map(g => ({
      topic: g.topic,
      mentions: g.customerMentions,
      isHighValue: g.isHighValue
    })))

    await prisma.comparisonAnalysis.update({
      where: { id: project.id },
      data: {
        seoAnalysis: updatedSeo as any,
      },
    })

    console.log(`✓ Project ${project.id} SEO analysis updated successfully.\n`)
  }
}

main()
  .catch((e) => {
    console.error('Error updating SEO analyses:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
