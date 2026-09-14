// src/services/connectors/future-connectors.ts
// Architectural stubs for planned future platform connectors
// Strictly indicates: "Platform connector not available yet."

import { PlatformConnector, ConnectorProductResult } from './types'

abstract class UnavailablePlatformConnector implements PlatformConnector {
  public abstract readonly platformId: string
  public abstract readonly platformName: string
  public readonly isAvailable = false
  public readonly statusMessage = 'Platform connector not available yet.'

  public async collectProductData(url: string): Promise<ConnectorProductResult> {
    return {
      productName: `${this.platformName} Product`,
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
        source: this.platformId,
        source_url: url,
        collected_at: new Date().toISOString(),
        status: 'unavailable',
        connector: this.platformId,
        message: 'Platform connector not available yet.',
      },
    }
  }

  public async collectComments(_url: string): Promise<any[]> {
    return []
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: 'Platform connector not available yet.' }
  }
}

export class ShopifyConnector extends UnavailablePlatformConnector {
  public readonly platformId = 'shopify'
  public readonly platformName = 'Shopify App Store'
}

export class AmazonConnector extends UnavailablePlatformConnector {
  public readonly platformId = 'amazon'
  public readonly platformName = 'Amazon Marketplace'
}

export class ChromeWebStoreConnector extends UnavailablePlatformConnector {
  public readonly platformId = 'chrome_web_store'
  public readonly platformName = 'Chrome Web Store'
}

export class WordPressConnector extends UnavailablePlatformConnector {
  public readonly platformId = 'wordpress'
  public readonly platformName = 'WordPress Plugin Directory'
}
