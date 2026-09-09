'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface TenantContextType {
  currentTenantId: string | null
  currentTenantName: string | null
  currentTenantSlug: string | null
  currentTenantRole: string | null
  tenants: Array<{
    id: string
    name: string
    slug: string
    role: string
  }>
  switchTenant: (tenantId: string) => void
  isLoading: boolean
}

const TenantContext = createContext<TenantContextType>({
  currentTenantId: null,
  currentTenantName: null,
  currentTenantSlug: null,
  currentTenantRole: null,
  tenants: [],
  switchTenant: () => {},
  isLoading: true,
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)

  const tenants = session?.user?.tenants || []

  // Determine current tenant: selected, or first available
  const currentTenant = selectedTenantId
    ? tenants.find((t) => t.id === selectedTenantId) || tenants[0]
    : tenants[0]

  const switchTenant = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId)
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('sga_current_tenant', tenantId)
    }
  }, [])

  // Restore from localStorage on mount
  if (typeof window !== 'undefined' && !selectedTenantId) {
    const stored = localStorage.getItem('sga_current_tenant')
    if (stored && tenants.some((t) => t.id === stored)) {
      setSelectedTenantId(stored)
    }
  }

  return (
    <TenantContext.Provider
      value={{
        currentTenantId: currentTenant?.id || null,
        currentTenantName: currentTenant?.name || null,
        currentTenantSlug: currentTenant?.slug || null,
        currentTenantRole: currentTenant?.role || null,
        tenants,
        switchTenant,
        isLoading: status === 'loading',
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
