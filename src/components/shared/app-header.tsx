'use client'

import { usePathname } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  Search,
  Bell,
  Check,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function AppHeader() {
  const pathname = usePathname()
  const [currentOrg, setCurrentOrg] = useState('Acme Analytics')

  // Generate breadcrumb title from path
  const pathSegments = pathname.split('/').filter(Boolean)
  const currentPageTitle =
    pathSegments.length > 1
      ? pathSegments[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Overview'

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      {/* Left: Breadcrumbs + Workspace Switcher */}
      <div className="flex items-center gap-3">
        {/* Organization Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs font-semibold text-foreground border-border bg-card/60"
            >
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                {currentOrg}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Workspaces
            </div>
            {['Acme Analytics', 'Dev Staging Sandbox'].map((org) => (
              <DropdownMenuItem
                key={org}
                onClick={() => setCurrentOrg(org)}
                className="flex items-center justify-between text-xs"
              >
                <span>{org}</span>
                {org === currentOrg && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground">
              + Add Organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-muted-foreground/40 text-xs">/</span>

        {/* Current Section Breadcrumb */}
        <span className="text-xs font-medium text-muted-foreground truncate hidden sm:inline">
          {currentPageTitle}
        </span>
      </div>

      {/* Right: Search, Notifications, User Menu */}
      <div className="flex items-center gap-2">
        {/* Global Search Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-2 px-2.5 text-xs text-muted-foreground border-border bg-card/40 hover:text-foreground hidden md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search competitors, changes...</span>
          <kbd className="ml-2 rounded border border-border/80 bg-muted/60 px-1 py-0.2 text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="relative text-muted-foreground hover:text-foreground border-border bg-card/40"
              aria-label="View notifications"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground">
                Alerts & Updates
              </span>
            </div>
            <div className="p-2 text-xs space-y-2">
              <div className="p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                <span className="font-semibold text-foreground block">
                  Mixpanel raised Starter tier
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Detected price increase of 40% (4 hours ago)
                </span>
              </div>
              <div className="p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                <span className="font-semibold text-foreground block">
                  3 Sales Opportunities Ready
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Public competitor dissatisfaction detected
                </span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs border-border bg-card/60"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
                A
              </div>
              <span className="truncate max-w-[80px] hidden sm:inline text-foreground">
                Alex Rivera
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="p-2 border-b border-border text-xs">
              <span className="font-medium text-foreground block">Alex Rivera</span>
              <span className="text-[11px] text-muted-foreground block truncate">
                founder@acmeanalytics.io
              </span>
            </div>
            <DropdownMenuItem className="text-xs gap-2">
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Profile & Role</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs gap-2 text-rose-400">
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
