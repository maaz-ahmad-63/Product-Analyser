import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extensionAuthService, ExtensionAuthContext } from '@/services/engagement/extension-auth.service'

export interface ResolvedEngagementAuth {
  tenantId: string
  userId: string
  userEmail: string
  userName: string
  tenantName: string
  role: string
  isExtension: boolean
}

export async function resolveEngagementAuth(req: Request): Promise<ResolvedEngagementAuth | null> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const rawToken = authHeader.substring(7).trim()
    const extCtx = await extensionAuthService.validateToken(rawToken)
    if (extCtx) {
      return {
        ...extCtx,
        isExtension: true,
      }
    }
    return null
  }

  // Otherwise check NextAuth session (used when called from the web dashboard)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  const tenants = session.user.tenants || []
  if (tenants.length === 0) {
    return null
  }

  // Allow choosing tenant from header or query param if user belongs to multiple
  const url = new URL(req.url)
  const requestedTenantId = req.headers.get('x-tenant-id') || url.searchParams.get('tenantId')
  const matchedTenant = requestedTenantId
    ? tenants.find((t) => t.id === requestedTenantId) || tenants[0]
    : tenants[0]

  return {
    tenantId: matchedTenant.id,
    userId: session.user.id,
    userEmail: session.user.email || '',
    userName: session.user.name || '',
    tenantName: matchedTenant.name,
    role: session.user.role,
    isExtension: false,
  }
}
