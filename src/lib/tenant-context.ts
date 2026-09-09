import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tenantService } from '@/services/tenant.service'
import { apiError } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export interface TenantContext {
  tenantId: string
  userId: string
  userRole: string // role in tenant
}

/**
 * Extracts and validates tenant context from request.
 * Checks x-tenant-id header or falls back to user's first tenant.
 * Verifies the user is a member of the requested tenant.
 */
export async function getTenantContext(
  request: NextRequest
): Promise<TenantContext | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  const requestedTenantId = request.headers.get('x-tenant-id')

  // If tenant ID specified, verify membership
  if (requestedTenantId) {
    const membership = await tenantService.verifyMembership(
      requestedTenantId,
      session.user.id
    )
    if (!membership) {
      return null
    }
    return {
      tenantId: requestedTenantId,
      userId: session.user.id,
      userRole: membership.role,
    }
  }

  // Fallback: use first tenant from session
  if (session.user.tenants && session.user.tenants.length > 0) {
    const firstTenant = session.user.tenants[0]
    return {
      tenantId: firstTenant.id,
      userId: session.user.id,
      userRole: firstTenant.role,
    }
  }

  return null
}

/**
 * Middleware helper that requires tenant context.
 * Returns tenant context or an error response.
 */
export async function requireTenantContext(request: NextRequest) {
  const context = await getTenantContext(request)
  if (!context) {
    return { error: apiError('Unauthorized or no tenant access', 401) }
  }
  return { context }
}
