'use client'

import { useSession, signOut } from 'next-auth/react'
import { useTenant } from '@/context/tenant-provider'
import { Bell, LogOut, ChevronDown, Building2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function Header() {
  const { data: session } = useSession()
  const { currentTenantName, tenants, switchTenant, currentTenantId } = useTenant()
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const tenantRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) {
        setTenantDropdownOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      {/* Left: Tenant Selector */}
      <div ref={tenantRef} className="relative">
        <button
          onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors"
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{currentTenantName || 'Select Business'}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        {tenantDropdownOpen && tenants.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-card shadow-xl animate-fade-in">
            <div className="p-1">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => {
                    switchTenant(tenant.id)
                    setTenantDropdownOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    tenant.id === currentTenantId
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-secondary/50'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{tenant.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground capitalize">{tenant.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary pulse-glow" />
        </button>

        {/* User */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {session?.user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-sm font-medium hidden sm:block">{session?.user?.name || 'User'}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {userDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl animate-fade-in">
              <div className="p-2 border-b border-border">
                <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
