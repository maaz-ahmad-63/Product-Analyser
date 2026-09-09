'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Swords,
  Activity,
  MessageSquare,
  Lightbulb,
  Target,
  Users,
  Bot,
  Cog,
  Plug,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'

const navigation = [
  {
    label: 'Main',
    items: [
      { name: 'Overview', href: '/overview', icon: LayoutDashboard },
      { name: 'My SaaS', href: '/my-saas', icon: Package },
      { name: 'Competitors', href: '/competitors', icon: Swords },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Changes', href: '/changes', icon: Activity },
      { name: 'Reviews & Comments', href: '/reviews', icon: MessageSquare },
      { name: 'Recommendations', href: '/recommendations', icon: Lightbulb },
    ],
  },
  {
    label: 'Opportunities',
    items: [
      { name: 'Opportunities', href: '/opportunities', icon: Target },
      { name: 'Leads & Outreach', href: '/leads', icon: Users },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'AI Assistant', href: '/assistant', icon: Bot },
      { name: 'Background Jobs', href: '/jobs', icon: ListTodo },
      { name: 'Integrations', href: '/integrations', icon: Plug },
      { name: 'Settings', href: '/settings', icon: Cog },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card/50 flex flex-col transition-sidebar',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo */}
      <div className="flex h-[var(--header-height)] items-center border-b border-border px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold gradient-text whitespace-nowrap">SaaS Growth Agent</h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((group) => (
          <div key={group.label} className="mb-6">
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                      {isActive && !collapsed && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary pulse-glow" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
