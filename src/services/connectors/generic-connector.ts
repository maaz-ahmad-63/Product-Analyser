// src/services/connectors/generic-connector.ts
// Generic connector for independent websites and SaaS landing pages

import { PlatformConnector, ConnectorProductResult, DataProvenance } from './types'
import { collectWebsiteData } from '../website-analyzer/collector'

export class GenericConnector implements PlatformConnector {
  public readonly platformId = 'generic'
  public readonly platformName = 'Generic Website / Independent SaaS'
  public readonly isAvailable = true
  public readonly statusMessage = 'Platform connector not available yet.'

  public async collectProductData(url: string): Promise<ConnectorProductResult> {
    const timestamp = new Date().toISOString()
    try {
      const extracted = await collectWebsiteData(url)

      const provenance: DataProvenance = {
        source: 'generic_web',
        source_url: url,
        collected_at: timestamp,
        status: extracted.collectionErrors?.length ? 'partial' : 'success',
        connector: this.platformId,
        message: 'Public web crawl completed. Platform connector not available yet for proprietary marketplace metrics.',
      }

      // First pricing plan if available
      const firstPlan = extracted.pricingPlans?.[0]
      const priceText = firstPlan
        ? (firstPlan as any).price || (firstPlan as any).priceMonthly || (firstPlan as any).priceAnnual || null
        : null

      return {
        productName: extracted.productName || extracted.websiteTitle || 'Target Product',
        productUrl: url,
        price: priceText,
        sales: null, // Marketplace sales not available for generic web
        rating: null, // Verified ratings not available for generic web
        reviewCount: null,
        version: null,
        authorName: null,
        category: extracted.category || 'SaaS Application',
        features: extracted.features || [],
        tags: (extracted as any).tags || [],
        docsLink: extracted.docsLink,
        demoLink: extracted.contactOrDemoCta,
        provenance,
        raw: extracted,
      }
    } catch (err: any) {
      return {
        productName: 'Target Product',
        productUrl: url,
        price: null,
        sales: null,
        rating: null,
        reviewCount: null,
        version: null,
        authorName: null,
        category: null,
        features: [],
        tags: [],
        provenance: {
          source: 'generic_web',
          source_url: url,
          collected_at: timestamp,
          status: 'failed',
          connector: this.platformId,
          message: err?.message || 'Failed to scrape target website',
        },
      }
    }
  }

  public async collectComments(_url: string): Promise<any[]> {
    // Generic websites do not have a standard comments feed API
    return []
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Generic HTML web collector is active.' }
  }
}
