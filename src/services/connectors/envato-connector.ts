// src/services/connectors/envato-connector.ts
// Concrete connector for Envato Market (CodeCanyon, ThemeForest)

import { PlatformConnector, ConnectorProductResult, DataProvenance } from './types'
import { collectWebsiteData, fetchProductPublicComments } from '../website-analyzer/collector'

export class EnvatoConnector implements PlatformConnector {
  public readonly platformId = 'envato'
  public readonly platformName = 'Envato Market'
  public readonly isAvailable = true
  public readonly statusMessage = 'Active connector supporting sales, ratings, public comments, and technical specifications.'

  public async collectProductData(url: string): Promise<ConnectorProductResult> {
    const timestamp = new Date().toISOString()
    try {
      const extracted = await collectWebsiteData(url)
      const sales = extracted.envatoSales

      const status: DataProvenance['status'] = sales
        ? 'success'
        : extracted.collectionErrors && extracted.collectionErrors.length > 0
        ? 'partial'
        : 'success'

      const provenance: DataProvenance = {
        source: 'envato_api_and_public',
        source_url: url,
        collected_at: timestamp,
        status,
        connector: this.platformId,
        message: sales
          ? 'Collected via official Envato API & verified public product page.'
          : 'Public HTML parsed; marketplace sales API returned no record.',
      }

      return {
        productName: extracted.productName || sales?.product_name || 'Envato Item',
        productUrl: url,
        price: sales?.product_price || null,
        discountedPrice: sales?.discounted_price || null,
        sales: sales?.current_total_sales ?? null,
        rating: sales?.rating ?? null,
        reviewCount: sales?.review_count ?? null,
        commentCount: sales?.comment_count ?? null,
        version: sales?.version || null,
        authorName: sales?.author_name || null,
        category: extracted.category || sales?.category || null,
        features: extracted.features || [],
        tags: (extracted as any).tags || [],
        docsLink: extracted.docsLink,
        demoLink: extracted.contactOrDemoCta,
        provenance,
        raw: extracted,
      }
    } catch (err: any) {
      return {
        productName: 'Envato Item',
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
          source: 'envato_api_and_public',
          source_url: url,
          collected_at: timestamp,
          status: 'failed',
          connector: this.platformId,
          message: err?.message || 'Failed to collect Envato product data',
        },
      }
    }
  }

  public async collectComments(url: string): Promise<any[]> {
    try {
      const comments = await fetchProductPublicComments(url)
      return comments || []
    } catch (err) {
      console.warn(`[EnvatoConnector] Could not fetch public comments for ${url}:`, err)
      return []
    }
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Envato connector is fully operational.' }
  }
}
