'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building,
  Swords,
  Layers,
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
  Sparkles,
  DollarSign,
  Star,
  TrendingUp,
  Search,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: any
  moduleId?: string // maps to AVAILABLE_MODULES id
  badgeKey?: string
  badgeFallback?: string
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Intelligence Modules',
    items: [
      {
        name: 'Product Intelligence',
        href: '/dashboard/changes',
        icon: Sparkles,
        moduleId: 'product_intelligence',
        badgeKey: 'Product Intelligence',
      },
      {
        name: 'Sales & Pricing',
        href: '/dashboard/my-saas',
        icon: DollarSign,
        moduleId: 'sales',
        badgeKey: 'Sales & Pricing',
      },
      {
        name: 'Reviews & Ratings',
        href: '/dashboard/reviews',
        icon: Star,
        moduleId: 'reviews',
        badgeKey: 'Reviews & Ratings',
      },
      {
        name: 'Comments & Sentiment',
        href: '/dashboard/comments',
        icon: MessageSquare,
        moduleId: 'comments',
        badgeKey: 'Comments & Sentiment',
      },
      {
        name: 'Opportunities & Leads',
        href: '/dashboard/opportunities',
        icon: TrendingUp,
        moduleId: 'opportunities',
        badgeKey: 'Opportunities & Leads',
      },
      {
        name: 'SEO & Keywords',
        href: '/dashboard/seo',
        icon: Search,
        moduleId: 'seo',
        badgeKey: 'SEO & Keywords',
      },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { name: 'Competitors', href: '/dashboard/competitors', icon: Swords, badgeKey: 'Competitors' },
      { name: 'All Analyses', href: '/analyses', icon: Layers },
      { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
      { name: 'Settings & Modules', href: '/dashboard/settings', icon: Settings },
    ],
  },
]

import { useB2bShell } from '@/components/layout/b2b-shell'
import { useProject } from '@/context/project-provider'

interface AppSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function AppSidebar({ collapsed: controlledCollapsed, onToggle }: AppSidebarProps = {}) {
  const pathname = usePathname()
  const { currentProjectData, currentProjectMeta } = useProject()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed
  const handleToggle = onToggle || (() => setInternalCollapsed(!internalCollapsed))
  const { collapsed: mainCollapsed } = useB2bShell()

  const selectedModules: string[] = currentProjectMeta?.selectedModules || []
  const hasModuleFilter = selectedModules.length > 0

  const dynamicBadges: Record<string, string | undefined> = {
    'Product Intelligence': currentProjectData?.comparison?.competitorExclusiveFeatures?.length
      ? String(currentProjectData.comparison.competitorExclusiveFeatures.length)
      : currentProjectData?.my_product?.features?.length
      ? String(currentProjectData.my_product.features.length)
      : undefined,
    'Sales & Pricing': currentProjectData?.comparison?.pricingDifferences?.length
      ? String(currentProjectData.comparison.pricingDifferences.length)
      : undefined,
    'Reviews & Ratings': (() => {
      const myReviews = currentProjectData?.my_product?.envatoSales?.review_count ?? currentProjectData?.my_product?.envatoSales?.rating_count ?? 0
      const compReviews = (currentProjectData?.competitors_data || []).reduce(
        (acc: number, c: any) => acc + (c.envatoSales?.review_count ?? c.envatoSales?.rating_count ?? 0),
        0
      )
      const total = myReviews + compReviews
      return total > 0 ? String(total) : undefined
    })(),
    'Comments & Sentiment': currentProjectData?.comments_analysis?.total_analyzed
      ? String(currentProjectData.comments_analysis.total_analyzed)
      : currentProjectData?.comments_analysis?.all_comments?.length
      ? String(currentProjectData.comments_analysis.all_comments.length)
      : currentProjectData?.comments_analysis?.clusters?.length
      ? String(currentProjectData.comments_analysis.clusters.length)
      : undefined,
    'Opportunities & Leads': currentProjectData?.opportunities?.length
      ? String(currentProjectData.opportunities.length)
      : undefined,
    'SEO & Keywords': currentProjectData?.seo_analysis?.keyword_matrix?.top_target_keywords?.length
      ? String(currentProjectData.seo_analysis.keyword_matrix.top_target_keywords.length)
      : undefined,
    'Competitors': currentProjectData?.competitors_data?.length
      ? String(currentProjectData.competitors_data.length)
      : undefined,
  }

  const mainOffset = mainCollapsed ? '3.5rem' : '14rem'

  return (
    <aside
      style={{ left: mainOffset }}
      className={cn(
        'fixed top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar flex flex-col transition-all duration-200 select-none left-0 lg:left-[var(--main-sidebar-width,3.5rem)]',
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
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {navSections.map((section, sIdx) => {
          // Filter items based on selectedModules if applicable
          const visibleItems = section.items.filter((item) => {
            if (!item.moduleId || !hasModuleFilter) return true
            return selectedModules.includes(item.moduleId)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={sIdx} className="space-y-0.5">
              {!collapsed && section.title && (
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === '/dashboard' && (pathname === '/dashboard' || pathname === '/overview')) ||
                  (item.href !== '/dashboard' && !item.href.includes('#') && pathname?.startsWith(item.href))

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
                        {(() => {
                          const badge = item.badgeKey ? dynamicBadges[item.badgeKey] : item.badgeFallback
                          if (!badge) return null
                          return (
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.2 text-[10px] font-semibold',
                                isActive
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {badge}
                            </span>
                          )
                        })()}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
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
          onClick={handleToggle}
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
