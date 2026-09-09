'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building,
  Swords,
  Activity,
  MessageSquare,
  Lightbulb,
  Target,
  Users,
  FileBarChart,
  ListTodo,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'

const navigationItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My SaaS', href: '/dashboard/my-saas', icon: Building },
  { name: 'Competitors', href: '/dashboard/competitors', icon: Swords },
  { name: 'Competitor Changes', href: '/dashboard/changes', icon: Activity, badge: '19' },
  { name: 'Reviews & Comments', href: '/dashboard/reviews', icon: MessageSquare },
  { name: 'Product Recommendations', href: '/dashboard/recommendations', icon: Lightbulb, badge: '6' },
  { name: 'Customer Opportunities', href: '/dashboard/opportunities', icon: Target, badge: '14' },
  { name: 'Leads and Outreach', href: '/dashboard/leads', icon: Users },
  { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
  { name: 'Monitoring Jobs', href: '/dashboard/jobs', icon: ListTodo },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar flex flex-col transition-all duration-200 select-none',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-12 items-center justify-between border-b border-sidebar-border px-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/20 text-primary">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden leading-tight">
              <span className="block text-xs font-bold text-foreground truncate">
                ProductScope
              </span>
              <span className="block text-[10px] text-muted-foreground truncate">
                SaaS Intelligence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-sidebar-active-foreground border-l-2 border-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-active/60 hover:text-foreground'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{item.name}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.2 text-[10px] font-semibold',
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Compliance Indicator Footer */}
      {!collapsed && (
        <div className="p-2 border-t border-sidebar-border/60">
          <div className="rounded bg-muted/40 p-2 text-[10px] text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <span className="font-semibold text-foreground">100% Permitted Data</span>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Public pages & sitemaps only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Action */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded p-1 text-muted-foreground hover:bg-sidebar-active hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <div className="flex items-center gap-1.5 text-[11px]">
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
