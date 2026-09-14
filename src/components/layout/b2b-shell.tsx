'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Layers,
  Building,
  Swords,
  FileBarChart,
  Settings,
  PlusCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  LogIn,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { cn } from '@/lib/utils'

const SIDEBAR_NAV = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Analyses', href: '/analyses', icon: Layers },
  { name: 'Products', href: '/dashboard/my-saas', icon: Building },
  { name: 'Competitors', href: '/dashboard/competitors', icon: Swords },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface B2bShellContextType {
  collapsed: boolean
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  isDashboardRoute: boolean
}

export const B2bShellContext = React.createContext<B2bShellContextType>({
  collapsed: false,
  setCollapsed: () => {},
  isDashboardRoute: false,
})

export const useB2bShell = () => React.useContext(B2bShellContext)

export function B2bShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const DASHBOARD_PATHS = [
    '/dashboard',
    '/overview',
    '/my-saas',
    '/changes',
    '/comments',
    '/competitors',
    '/integrations',
    '/jobs',
    '/leads',
    '/opportunities',
    '/recommendations',
    '/reviews',
    '/settings',
  ]
  const isDashboardRoute = DASHBOARD_PATHS.some(
    (route) => pathname === route || pathname?.startsWith(route + '/')
  )

  const [collapsed, setCollapsed] = useState(isDashboardRoute)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Automatically collapse main sidebar when opening overview or dashboard routes
  React.useEffect(() => {
    if (isDashboardRoute) {
      setCollapsed(true)
    }
  }, [pathname, isDashboardRoute])

  // Bypass shell completely for standalone public reports and dedicated auth pages
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/signup' ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/signup')

  if (pathname?.startsWith('/report/') || isAuthPage) {
    return <>{children}</>
  }

  const isAuthenticated = status === 'authenticated' && !!session?.user
  const isAdmin = session?.user?.role === 'admin'

  return (
    <B2bShellContext.Provider value={{ collapsed, setCollapsed, isDashboardRoute }}>
      <div
        style={{ '--main-sidebar-width': collapsed ? '3.5rem' : '14rem' } as React.CSSProperties}
        className="min-h-screen bg-background text-foreground flex antialiased"
      >
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card/90 backdrop-blur-md transition-all duration-200 select-none',
          collapsed ? 'w-14' : 'w-56',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <Link href="/analyses" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/20 text-primary">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden leading-tight">
                <span className="block text-xs font-bold text-foreground tracking-tight truncate">
                  ProductScope
                </span>
                <span className="block text-[10px] text-muted-foreground truncate font-mono">
                  B2B Intelligence
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Button: + New Analysis */}
        <div className="p-2 border-b border-border/50">
          <Link href="/analyses/new" onClick={() => setMobileOpen(false)}>
            <Button
              size="sm"
              className={cn(
                'w-full h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm',
                collapsed && 'px-0 justify-center'
              )}
              title="Create New Analysis"
            >
              <PlusCircle className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>New Analysis</span>}
            </Button>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
          {SIDEBAR_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/overview' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}

          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-border/60">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 font-medium transition-colors text-purple-400 hover:bg-purple-500/10 hover:text-purple-300',
                  pathname?.startsWith('/admin') && 'bg-purple-500/15 text-purple-300 font-semibold border border-purple-500/30'
                )}
                title={collapsed ? 'Admin Console' : undefined}
              >
                <Shield className="h-4 w-4 shrink-0 text-purple-400" />
                {!collapsed && <span className="truncate">Admin Console</span>}
              </Link>
            </div>
          )}
        </nav>

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:block border-t border-border p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-[11px]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <div className="flex items-center gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          collapsed ? 'lg:ml-14' : 'lg:ml-56'
        )}
      >
        {/* Top Header Bar (hidden on dashboard routes to avoid duplicate stacked headers with AppHeader) */}
        {!isDashboardRoute && (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur-sm">
            {/* Mobile hamburger toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="text-xs font-semibold text-muted-foreground capitalize hidden sm:inline">
                {pathname?.split('/')?.[1] || 'Dashboard'}
              </span>
            </div>

            {/* Right Header Utilities */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <ThemeToggle />

              {isAuthenticated ? (
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <div className="hidden sm:flex flex-col items-end text-right leading-none">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        {session.user.name || session.user.email?.split('@')[0]}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] uppercase px-1 py-0 h-4 font-mono',
                          isAdmin
                            ? 'border-purple-500/40 text-purple-400 bg-purple-500/10'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {session.user.role}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[140px] truncate">
                      {session.user.email}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                    <LogIn className="h-3.5 w-3.5 text-primary" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )}
            </div>
          </header>
        )}

        {/* Page Children Container */}
        <main
          className={cn(
            'flex-1 w-full',
            isDashboardRoute ? 'p-0 max-w-full' : 'p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto'
          )}
        >
          {children}
        </main>
      </div>
    </div>
    </B2bShellContext.Provider>
  )
}
