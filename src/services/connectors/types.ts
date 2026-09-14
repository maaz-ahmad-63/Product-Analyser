// src/services/connectors/types.ts
// Platform connector contracts and provenance types for Phase 5

export interface DataProvenance {
  source: string
  source_url: string
  collected_at: string
  status: 'success' | 'partial' | 'failed' | 'unavailable'
  connector: string
  message?: string
}

export interface ConnectorProductResult {
  productName: string
  productUrl: string
  price: string | null
  discountedPrice?: string | null
  sales: number | null
  rating: number | null
  reviewCount: number | null
  commentCount?: number | null
  version: string | null
  authorName: string | null
  category: string | null
  features: string[]
  tags: string[]
  docsLink?: string | null
  demoLink?: string | null
  provenance: DataProvenance
  raw?: any
}

export interface PlatformConnector {
  readonly platformId: string
  readonly platformName: string
  readonly isAvailable: boolean
  readonly statusMessage: string

  /**
   * Fetches product details and metadata using the platform's API or verified public scraper
   */
  collectProductData(url: string): Promise<ConnectorProductResult>

  /**
   * Optional method to fetch public feedback or comments if supported
   */
  collectComments?(url: string): Promise<any[]>

  /**
   * Checks if connection or scraping capability is functional
   */
  checkHealth?(): Promise<{ ok: boolean; message: string }>
}
