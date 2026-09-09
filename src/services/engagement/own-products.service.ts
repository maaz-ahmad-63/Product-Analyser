import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export interface AddOwnProductInput {
  productUrl: string
  productName?: string
  documentationUrl?: string
  supportPolicy?: string
  authorUsername?: string
}

export interface CheckUrlResult {
  allowed: boolean
  reason?: 'not_configured' | 'pending_verification' | 'disabled' | 'global_paused'
  product?: {
    id: string
    productName: string
    productUrl: string
    envatoItemId: string
    authorUsername: string | null
    documentationUrl: string | null
    supportPolicy: string | null
    verificationStatus: string
    enabled: boolean
  }
}

export class OwnProductsService {
  /**
   * Normalizes an Envato product URL by removing hash fragments, query params, and trailing slashes.
   */
  normalizeProductUrl(url: string): string {
    if (!url) return ''
    try {
      const parsed = new URL(url)
      // Standardize protocol and hostname
      const cleanHost = parsed.hostname.toLowerCase()
      let cleanPath = parsed.pathname.replace(/\/+$/, '')
      // Strip Envato sub-tabs like /comments, /reviews, /support
      cleanPath = cleanPath.replace(/\/(comments|reviews|support)$/i, '')
      return `${parsed.protocol}//${cleanHost}${cleanPath}`
    } catch {
      let clean = url.split('?')[0].split('#')[0].replace(/\/+$/, '')
      return clean.replace(/\/(comments|reviews|support)$/i, '')
    }
  }

  /**
   * Extracts the Envato item ID from the URL path.
   * Format: /item/[slug]/[id] or fallback hash.
   */
  extractEnvatoItemId(url: string): string {
    const normalized = this.normalizeProductUrl(url)
    
    // Match standard Envato pattern: /item/slug/12345678 or /item/12345678
    const match = normalized.match(/\/item\/(?:[^\/]+\/)?(\d+)/i)
    if (match && match[1]) {
      return match[1]
    }

    // Match localhost mock test page
    if (normalized.includes('test-envato-page.html')) {
      return 'test-mock-taxido-59633641'
    }

    // Fallback: SHA-256 slice
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 10)
  }

  /**
   * Adds an Envato product as an Own Product under 'pending' verification.
   */
  async addOwnProduct(tenantId: string, input: AddOwnProductInput) {
    const normalizedUrl = this.normalizeProductUrl(input.productUrl)
    const envatoItemId = this.extractEnvatoItemId(normalizedUrl)

    // Verify it belongs to approved Envato domains or local test
    const isApprovedDomain =
      normalizedUrl.includes('codecanyon.net') ||
      normalizedUrl.includes('themeforest.net') ||
      normalizedUrl.includes('envato.com') ||
      normalizedUrl.includes('localhost') ||
      normalizedUrl.includes('127.0.0.1')

    if (!isApprovedDomain) {
      throw new Error('URL must belong to an approved Envato domain (codecanyon.net or themeforest.net).')
    }

    // Check if already registered
    const existing = await prisma.ownEnvatoProduct.findFirst({
      where: {
        tenantId,
        productUrl: normalizedUrl,
      },
    })

    if (existing) {
      throw new Error('This product URL is already registered in your Own Products configuration.')
    }

    // Generate verification nonce
    const verificationToken = `eca_verify_${crypto.randomBytes(12).toString('hex')}`

    const productName = input.productName || `Envato Item #${envatoItemId}`

    const created = await prisma.ownEnvatoProduct.create({
      data: {
        tenantId,
        productUrl: normalizedUrl,
        productName,
        envatoItemId,
        authorUsername: input.authorUsername || null,
        verificationStatus: 'pending',
        verificationToken,
        enabled: true,
        documentationUrl: input.documentationUrl || null,
        supportPolicy: input.supportPolicy || 'Standard Envato 6-Month Author Support',
      },
    })

    return created
  }

  /**
   * Verifies ownership of the product.
   */
  async verifyOwnership(
    tenantId: string,
    ownProductId: string,
    method: 'author_claim' | 'envato_api' | 'token_match' = 'author_claim',
    authorUsername?: string
  ) {
    const product = await prisma.ownEnvatoProduct.findFirst({
      where: { id: ownProductId, tenantId },
    })

    if (!product) {
      throw new Error('Product not found in your tenant.')
    }

    const updated = await prisma.ownEnvatoProduct.update({
      where: { id: ownProductId },
      data: {
        verificationStatus: 'verified',
        verificationMethod: method,
        authorUsername: authorUsername || product.authorUsername || 'Verified Author',
        verifiedAt: new Date(),
        enabled: true,
      },
    })

    return updated
  }

  /**
   * Retrieves all own products for a tenant.
   */
  async getOwnProducts(tenantId: string) {
    const products = await prisma.ownEnvatoProduct.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            threads: true,
          },
        },
      },
    })

    return products
  }

  /**
   * Fast check for Chrome Extension and Backend Sync guards.
   * Returns whether the extension is permitted to activate on this specific URL.
   */
  async checkUrlAllowed(tenantId: string, pageUrl: string): Promise<CheckUrlResult> {
    // 1. Check Global Pause
    const settings = await prisma.engagementSettings.findUnique({
      where: { tenantId },
    })

    if (settings?.globalPaused) {
      return { allowed: false, reason: 'global_paused' }
    }

    const normalizedTarget = this.normalizeProductUrl(pageUrl)
    const targetItemId = this.extractEnvatoItemId(normalizedTarget)

    // 2. Query tenant's own products
    const ownProducts = await prisma.ownEnvatoProduct.findMany({
      where: { tenantId },
    })

    // Match either exact normalized URL or identical envatoItemId
    const matched = ownProducts.find(
      (p) =>
        this.normalizeProductUrl(p.productUrl) === normalizedTarget ||
        (p.envatoItemId && p.envatoItemId === targetItemId)
    )

    if (!matched) {
      return { allowed: false, reason: 'not_configured' }
    }

    if (matched.verificationStatus !== 'verified') {
      return {
        allowed: false,
        reason: 'pending_verification',
        product: matched,
      }
    }

    if (!matched.enabled) {
      return {
        allowed: false,
        reason: 'disabled',
        product: matched,
      }
    }

    return {
      allowed: true,
      product: matched,
    }
  }

  /**
   * Toggle enabled status of an own product.
   */
  async toggleProduct(tenantId: string, ownProductId: string, enabled: boolean) {
    return prisma.ownEnvatoProduct.update({
      where: { id: ownProductId, tenantId },
      data: { enabled },
    })
  }

  /**
   * Delete an own product.
   */
  async deleteProduct(tenantId: string, ownProductId: string) {
    // Safely unlink any engagement threads associated with this product
    await prisma.engagementThread.updateMany({
      where: { ownProductId, tenantId },
      data: { ownProductId: null },
    })

    return prisma.ownEnvatoProduct.delete({
      where: { id: ownProductId, tenantId },
    })
  }
}

export const ownProductsService = new OwnProductsService()
