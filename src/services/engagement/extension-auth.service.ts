import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export interface ExtensionAuthContext {
  token: string
  tenantId: string
  userId: string
  userEmail: string
  userName: string
  tenantName: string
  role: string
}

export class ExtensionAuthService {
  /**
   * Generates a secure, short-lived token for Chrome Extension authentication.
   * Default validity: 72 hours.
   */
  async createExtensionToken(
    userId: string,
    tenantId: string,
    name = 'Chrome Extension'
  ): Promise<{ token: string; expiresAt: Date }> {
    // Generate 48-byte cryptographically secure random token
    const rawToken = `eca_${crypto.randomBytes(36).toString('hex')}`
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // 72 hours expiration
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

    // Revoke any previous active tokens for this user/tenant if desired, or keep multiple devices
    await prisma.engagementExtensionToken.create({
      data: {
        tokenHash,
        tenantId,
        userId,
        name,
        expiresAt,
      },
    })

    return { token: rawToken, expiresAt }
  }

  /**
   * Validates a bearer token sent from the Chrome Extension.
   * Derives tenant and user directly from the authenticated token record.
   * Never trusts client-supplied tenantId.
   */
  async validateToken(rawToken: string): Promise<ExtensionAuthContext | null> {
    if (!rawToken || !rawToken.startsWith('eca_')) {
      return null
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const record = await prisma.engagementExtensionToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
        tenant: true,
      },
    })

    if (!record) {
      return null
    }

    // Check revocation
    if (record.revokedAt) {
      return null
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      return null
    }

    // Check if user is active
    if (!record.user.isActive) {
      return null
    }

    // Update lastUsedAt asynchronously
    prisma.engagementExtensionToken
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => console.error('Error updating token lastUsedAt:', err))

    return {
      token: rawToken,
      tenantId: record.tenantId,
      userId: record.userId,
      userEmail: record.user.email,
      userName: record.user.name,
      tenantName: record.tenant.name,
      role: record.user.role,
    }
  }

  /**
   * Revokes an extension token immediately upon logout or disconnect.
   */
  async revokeToken(rawToken: string): Promise<boolean> {
    if (!rawToken) return false
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    try {
      await prisma.engagementExtensionToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      })
      return true
    } catch {
      return false
    }
  }
}

export const extensionAuthService = new ExtensionAuthService()
