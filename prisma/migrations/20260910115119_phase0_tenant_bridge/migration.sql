-- AlterTable
ALTER TABLE "comparison_analyses" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "envato_sales_snapshots" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "analysis_opportunities" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "seo_keyword_observations" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "product_activity_records" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "comparison_analyses_tenantId_idx" ON "comparison_analyses"("tenantId");

-- CreateIndex
CREATE INDEX "envato_sales_snapshots_tenantId_idx" ON "envato_sales_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "analysis_opportunities_tenantId_idx" ON "analysis_opportunities"("tenantId");

-- CreateIndex
CREATE INDEX "seo_keyword_observations_tenantId_idx" ON "seo_keyword_observations"("tenantId");

-- CreateIndex
CREATE INDEX "product_activity_records_tenantId_idx" ON "product_activity_records"("tenantId");

-- AddForeignKey
ALTER TABLE "comparison_analyses" ADD CONSTRAINT "comparison_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envato_sales_snapshots" ADD CONSTRAINT "envato_sales_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_opportunities" ADD CONSTRAINT "analysis_opportunities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_keyword_observations" ADD CONSTRAINT "seo_keyword_observations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_activity_records" ADD CONSTRAINT "product_activity_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

