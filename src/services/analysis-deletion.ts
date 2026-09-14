import { prisma } from '@/lib/prisma'

export interface DeleteAnalysisResult {
  success: boolean
  message: string
  deletedAnalysisId?: string
  status: number
}

/**
 * Permanently deletes an analysis workspace and all associated dependent records
 * across opportunities, activity records, SEO keyword observations, and background jobs.
 * 
 * Strict safety constraints:
 * - Scoped strictly to the specified analysisId
 * - Executed in an atomic database transaction
 * - Does NOT touch users, tenants, or unrelated analyses
 * - Does NOT touch the Chrome extension/engagement subsystem
 */
export async function deleteAnalysisWorkspace(
  analysisId: string,
  adminUserId: string,
  adminEmail?: string | null,
  confirmName?: string | null
): Promise<DeleteAnalysisResult> {
  // 1. Fetch analysis to verify existence and name
  const analysis = await prisma.comparisonAnalysis.findUnique({
    where: { id: analysisId },
  })

  if (!analysis) {
    return {
      success: false,
      message: 'Analysis workspace not found.',
      status: 404,
    }
  }

  // 2. Validate confirmation name if provided
  const expectedName = (analysis.projectName || analysis.myProductName || analysis.myUrl || '').trim()
  if (confirmName !== undefined && confirmName !== null) {
    const cleanConfirm = confirmName.trim().toLowerCase()
    const cleanExpected = expectedName.toLowerCase()

    // Accept matching project name, product name, or product URL
    const cleanUrl = analysis.myUrl.trim().toLowerCase()
    const matches = cleanConfirm === cleanExpected || (cleanUrl && cleanConfirm === cleanUrl)

    if (!matches) {
      return {
        success: false,
        message: `Confirmation mismatch. You typed "${confirmName}", but expected "${expectedName}".`,
        status: 400,
      }
    }
  }

  // 3. Atomic transactional deletion of all dependent records
  try {
    await prisma.$transaction(async (tx) => {
      // a. Delete non-relational SEO observations belonging strictly to this analysis
      await tx.seoKeywordObservation.deleteMany({
        where: { analysisId },
      })

      // b. Delete background jobs scoped strictly to this analysis
      await tx.backgroundJob.deleteMany({
        where: {
          OR: [
            { relatedEntityId: analysisId },
            { relatedEntityType: 'analysis', relatedEntityId: analysisId },
          ],
        },
      })

      // c. Explicitly delete child opportunities (also guarded by FK Cascade in DB)
      await tx.competitorOpportunity.deleteMany({
        where: { analysisId },
      })

      // d. Explicitly delete child activity records (also guarded by FK Cascade in DB)
      await tx.productActivityRecord.deleteMany({
        where: { analysisId },
      })

      // e. Delete the main ComparisonAnalysis record
      await tx.comparisonAnalysis.delete({
        where: { id: analysisId },
      })

      // f. Log administrative audit trail if tenant is present
      if (analysis.tenantId) {
        await tx.auditLog.create({
          data: {
            tenantId: analysis.tenantId,
            userId: adminUserId,
            action: 'delete',
            entityType: 'ComparisonAnalysis',
            entityId: analysisId,
            metadata: {
              projectName: analysis.projectName,
              myUrl: analysis.myUrl,
              competitorUrl: analysis.competitorUrl,
              platform: analysis.platform,
              adminUserId,
              adminEmail: adminEmail || null,
              deletedAt: new Date().toISOString(),
            },
          },
        })
      }
    })

    return {
      success: true,
      message: `Analysis "${expectedName}" and all associated data permanently deleted.`,
      deletedAnalysisId: analysisId,
      status: 200,
    }
  } catch (err: unknown) {
    console.error(`[DeleteAnalysis] Failed to delete analysis ${analysisId}:`, err)
    const errorMsg = err instanceof Error ? err.message : 'Database transaction failed during deletion.'
    return {
      success: false,
      message: errorMsg,
      status: 500,
    }
  }
}
