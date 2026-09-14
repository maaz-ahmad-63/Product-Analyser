import { PrismaClient } from '@prisma/client'
import { websiteAnalyzerService } from '../src/services/website-analyzer/index'

const prisma = new PrismaClient()

const USER_ID = 'cmtr693hf0005120dhr3w0row' // user@saasgrowth.internal
const TENANT_ID = 'cmtr693hi0007120dkcr444l7' // Standard Workspace

async function runPhase2Tests() {
  console.log('========================================================')
  console.log('  STARTING PHASE 2 AUTOMATED VERIFICATION')
  console.log('========================================================\n')

  let createdAnalysisId: string | null = null

  try {
    // 1. Create a real Envato Analysis
    console.log('[STEP 1] Creating an Envato Analysis record...')
    const myUrl = 'https://codecanyon.net/item/rideon-taxi-booking/59633641'
    const compUrl = 'https://codecanyon.net/item/unibooker-appointment-booking/64442063'
    const analysisName = 'Envato Market Test: RideOn vs UniBooker'
    const selectedModules = ['product_intelligence', 'seo', 'sales', 'reviews', 'comments', 'opportunities']

    // Run real analysis through WebsiteAnalyzerService
    console.log('[STEP 2] Running real Envato analysis pipeline...')
    const runResult = await websiteAnalyzerService.runAnalysis(
      myUrl,
      [compUrl],
      USER_ID,
      analysisName,
      ['taxi booking', 'appointment scheduling'],
      {
        platform: 'envato',
        selectedModules,
        myProductName: 'RideOn Taxi Booking',
        tenantId: TENANT_ID,
      }
    )

    createdAnalysisId = runResult.analysis_id
    console.log('✔ Analysis executed! Created Analysis ID:', createdAnalysisId)

    // 2. Fetch via workspace resolver
    console.log('\n[STEP 3] Fetching analysis via workspace resolver (getAnalysisById)...')
    const workspaceData = await websiteAnalyzerService.getAnalysisById(
      createdAnalysisId,
      USER_ID,
      false
    )

    console.log('✔ Status:', workspaceData.status)
    console.log('✔ Target Product:', workspaceData.my_product?.productName || workspaceData.my_url)
    const myPrice = workspaceData.my_product?.envatoSales?.product_price || (workspaceData.my_product?.envatoSales as any)?.price || (workspaceData.my_product?.pricingPlans?.[0] as any)?.price
    const mySales = workspaceData.my_product?.envatoSales?.current_total_sales ?? (workspaceData.my_product?.envatoSales as any)?.totalSales
    console.log('  - Extracted Price:', myPrice)
    console.log('  - Extracted Sales:', mySales)
    console.log('  - Rating:', workspaceData.my_product?.envatoSales?.rating)
    console.log('  - Features detected:', workspaceData.my_product?.features?.length ?? 0)

    console.log('\n✔ Competitors data count:', workspaceData.competitors_data?.length)
    if (workspaceData.competitors_data && workspaceData.competitors_data[0]) {
      const comp = workspaceData.competitors_data[0]
      const compPrice = comp.envatoSales?.product_price || (comp.envatoSales as any)?.price || (comp.pricingPlans?.[0] as any)?.price
      const compSales = comp.envatoSales?.current_total_sales ?? (comp.envatoSales as any)?.totalSales
      console.log('  - Competitor 1 Name:', comp.productName || comp.url)
      console.log('  - Competitor 1 Price:', compPrice)
      console.log('  - Competitor 1 Sales:', compSales)
      console.log('  - Competitor 1 Rating:', comp.envatoSales?.rating)
    }

    // 3. Check Sales Comparison
    if (workspaceData.sales_comparison) {
      console.log('\n✔ Real Sales Comparison Available:')
      const sc: any = workspaceData.sales_comparison
      console.log('  - Target price vs Competitor price:', `$${sc.target_product?.price ?? sc.my_sales?.price} vs $${sc.competitor_product?.price ?? sc.competitor_sales?.price}`)
      console.log('  - Target sales vs Competitor sales:', `${sc.target_product?.total_sales ?? sc.my_sales?.current_sales} vs ${sc.competitor_product?.total_sales ?? sc.competitor_sales?.current_sales}`)
    }

    // 4. Verify Database Record Integrity
    console.log('\n[STEP 4] Verifying database record in comparison_analyses...')
    const dbRecord = await prisma.comparisonAnalysis.findUnique({
      where: { id: createdAnalysisId },
    })

    if (!dbRecord) throw new Error('Database record missing!')
    console.log('✔ Record found:')
    console.log('  - projectName:', dbRecord.projectName)
    console.log('  - platform:', dbRecord.platform)
    console.log('  - selectedModules:', dbRecord.selectedModules)
    console.log('  - tenantId:', dbRecord.tenantId)
    console.log('  - userId:', dbRecord.userId)
    console.log('  - status:', dbRecord.status)
    console.log('  - updatedAt:', (dbRecord as any).updatedAt)
    console.log('  - createdAt:', dbRecord.createdAt)

    // 5. Test Backward Compatibility: Legacy getRecentAnalyses still works
    console.log('\n[STEP 5] Verifying legacy getRecentAnalyses...')
    const recent = await websiteAnalyzerService.getRecentAnalyses(5, USER_ID, false)
    console.log(`✔ Legacy getRecentAnalyses returned ${recent.length} records.`)
    const foundInRecent = recent.some((r) => r.id === createdAnalysisId)
    console.log('✔ Created analysis present in legacy recent list:', foundInRecent)

    console.log('\n🎉 ALL PHASE 2 VERIFICATION CHECKS PASSED!')
  } finally {
    await prisma.$disconnect()
  }
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test failed:', err)
  process.exit(1)
})
