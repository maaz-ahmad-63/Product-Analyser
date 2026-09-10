/**
 * Phase 0 backfill: populate the new nullable `tenantId` column on legacy
 * analyzer-path tables (ComparisonAnalysis, EnvatoSalesSnapshot,
 * CompetitorOpportunity, SeoKeywordObservation, ProductActivityRecord)
 * by resolving each row's existing `userId` through TenantUser.
 *
 * Idempotent: only touches rows where tenantId IS NULL AND userId IS NOT NULL.
 * Safe to re-run after a partial failure.
 *
 * Rules:
 * - userId IS NULL            -> left untouched (anonymous/pre-auth rows).
 * - no TenantUser for userId  -> left NULL, logged as "no_tenant_found".
 * - >1 TenantUser for userId  -> left NULL, logged as "ambiguous" (no fallback).
 * - exactly 1 TenantUser      -> tenantId set to that tenant's id.
 */

import { prisma } from '../src/lib/prisma'

interface BackfillSummary {
  model: string
  totalCandidates: number
  updated: number
  skippedNoTenant: string[]
  skippedAmbiguous: string[]
}

async function resolveTenantForUser(
  userId: string,
  cache: Map<string, string[] | null>
): Promise<string[] | null> {
  if (cache.has(userId)) return cache.get(userId)!
  const memberships = await prisma.tenantUser.findMany({
    where: { userId },
    select: { tenantId: true },
  })
  const tenantIds = memberships.map((m) => m.tenantId)
  cache.set(userId, tenantIds)
  return tenantIds
}

async function backfillModel<T extends { id: string; userId: string | null }>(
  modelName: string,
  findCandidates: () => Promise<T[]>,
  updateTenantId: (id: string, tenantId: string) => Promise<void>,
  tenantCache: Map<string, string[] | null>
): Promise<BackfillSummary> {
  const candidates = await findCandidates()
  const summary: BackfillSummary = {
    model: modelName,
    totalCandidates: candidates.length,
    updated: 0,
    skippedNoTenant: [],
    skippedAmbiguous: [],
  }

  for (const row of candidates) {
    if (!row.userId) continue // defensive; findCandidates should already filter this

    const tenantIds = await resolveTenantForUser(row.userId, tenantCache)

    if (!tenantIds || tenantIds.length === 0) {
      summary.skippedNoTenant.push(row.id)
      continue
    }

    if (tenantIds.length > 1) {
      summary.skippedAmbiguous.push(row.id)
      continue
    }

    await updateTenantId(row.id, tenantIds[0])
    summary.updated++
  }

  return summary
}

async function main() {
  const tenantCache = new Map<string, string[] | null>()
  const summaries: BackfillSummary[] = []

  summaries.push(
    await backfillModel(
      'ComparisonAnalysis',
      () =>
        prisma.comparisonAnalysis.findMany({
          where: { tenantId: null, userId: { not: null } },
          select: { id: true, userId: true },
        }),
      (id, tenantId) => prisma.comparisonAnalysis.update({ where: { id }, data: { tenantId } }).then(() => {}),
      tenantCache
    )
  )

  summaries.push(
    await backfillModel(
      'EnvatoSalesSnapshot',
      () =>
        prisma.envatoSalesSnapshot.findMany({
          where: { tenantId: null, userId: { not: null } },
          select: { id: true, userId: true },
        }),
      (id, tenantId) => prisma.envatoSalesSnapshot.update({ where: { id }, data: { tenantId } }).then(() => {}),
      tenantCache
    )
  )

  summaries.push(
    await backfillModel(
      'CompetitorOpportunity',
      () =>
        prisma.competitorOpportunity.findMany({
          where: { tenantId: null, userId: { not: null } },
          select: { id: true, userId: true },
        }),
      (id, tenantId) => prisma.competitorOpportunity.update({ where: { id }, data: { tenantId } }).then(() => {}),
      tenantCache
    )
  )

  summaries.push(
    await backfillModel(
      'SeoKeywordObservation',
      () =>
        prisma.seoKeywordObservation.findMany({
          where: { tenantId: null, userId: { not: null } },
          select: { id: true, userId: true },
        }),
      (id, tenantId) => prisma.seoKeywordObservation.update({ where: { id }, data: { tenantId } }).then(() => {}),
      tenantCache
    )
  )

  summaries.push(
    await backfillModel(
      'ProductActivityRecord',
      () =>
        prisma.productActivityRecord.findMany({
          where: { tenantId: null, userId: { not: null } },
          select: { id: true, userId: true },
        }),
      (id, tenantId) => prisma.productActivityRecord.update({ where: { id }, data: { tenantId } }).then(() => {}),
      tenantCache
    )
  )

  console.log('\n=== Phase 0 Tenant Backfill Summary ===\n')
  for (const s of summaries) {
    console.log(`${s.model}:`)
    console.log(`  candidates checked : ${s.totalCandidates}`)
    console.log(`  updated            : ${s.updated}`)
    console.log(`  skipped (no tenant): ${s.skippedNoTenant.length}${s.skippedNoTenant.length ? ' -> ' + s.skippedNoTenant.join(', ') : ''}`)
    console.log(`  skipped (ambiguous): ${s.skippedAmbiguous.length}${s.skippedAmbiguous.length ? ' -> ' + s.skippedAmbiguous.join(', ') : ''}`)
    console.log('')
  }

  const totalAmbiguous = summaries.reduce((sum, s) => sum + s.skippedAmbiguous.length, 0)
  const totalNoTenant = summaries.reduce((sum, s) => sum + s.skippedNoTenant.length, 0)
  if (totalAmbiguous > 0 || totalNoTenant > 0) {
    console.log(
      `NOTE: ${totalAmbiguous} row(s) skipped as ambiguous (user belongs to multiple tenants) and ${totalNoTenant} row(s) skipped with no tenant found. These require manual review; tenantId was left NULL for all of them.`
    )
  }
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
