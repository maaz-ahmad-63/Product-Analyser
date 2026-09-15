'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/context/project-provider'
import {
  Search,
  X,
  Building2,
  Swords,
  TrendingUp,
  MessageSquare,
  Star,
  Settings,
  Zap,
  Activity,
  PlusCircle,
  ArrowRight,
  Search as SearchIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlobalSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchItem {
  id: string
  title: string
  subtitle?: string
  category: 'Pages' | 'Competitors' | 'Workspaces' | 'Actions'
  icon: React.ReactNode
  action: () => void
  badge?: string
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const router = useRouter()
  const { projects, currentProjectId, currentProjectMeta, setCurrentProjectId } = useProject()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Build searchable items
  const items: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = []

    // 1. Pages Navigation
    const pages = [
      {
        title: 'Executive Overview',
        subtitle: 'Key growth signals, market position, and high-priority action items',
        path: '/overview',
        icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
      },
      {
        title: 'Competitors & Feature Gaps',
        subtitle: 'Head-to-head feature matrix and competitive comparison',
        path: '/dashboard/competitors',
        icon: <Swords className="h-4 w-4 text-amber-400" />,
      },
      {
        title: 'Buyer Inquiries & Pre-Sale Questions',
        subtitle: 'Public buyer queries, developer replies, and friction topics',
        path: '/dashboard/comments',
        icon: <MessageSquare className="h-4 w-4 text-sky-400" />,
      },
      {
        title: 'Customer Reviews & Feedback',
        subtitle: 'Categorized customer feedback and product complaints',
        path: '/dashboard/reviews',
        icon: <Star className="h-4 w-4 text-yellow-400" />,
      },
      {
        title: 'Feature Changes & Timeline',
        subtitle: 'Live change tracker and version updates',
        path: '/dashboard/changes',
        icon: <Activity className="h-4 w-4 text-indigo-400" />,
      },
      {
        title: 'SEO & Discoverability',
        subtitle: 'Keyword coverage, meta tags, and organic visibility',
        path: '/dashboard/seo',
        icon: <SearchIcon className="h-4 w-4 text-teal-400" />,
      },
      {
        title: 'Sales Opportunities',
        subtitle: 'Actionable lead generation from dissatisfied competitor users',
        path: '/dashboard/opportunities',
        icon: <Zap className="h-4 w-4 text-amber-300" />,
      },
      {
        title: 'Sync Jobs & Hourly Monitor',
        subtitle: 'Background scheduler status and automated tracking runs',
        path: '/dashboard/jobs',
        icon: <Activity className="h-4 w-4 text-purple-400" />,
      },
      {
        title: 'Workspace Settings',
        subtitle: 'Manage tracking preferences, notification thresholds, and refresh schedule',
        path: '/dashboard/settings',
        icon: <Settings className="h-4 w-4 text-zinc-400" />,
      },
    ]

    for (const p of pages) {
      list.push({
        id: `page-${p.path}`,
        title: p.title,
        subtitle: p.subtitle,
        category: 'Pages',
        icon: p.icon,
        action: () => {
          onOpenChange(false)
          router.push(p.path)
        },
      })
    }

    // 2. Competitors in current workspace
    const competitors = currentProjectMeta?.competitors || []
    for (const comp of competitors) {
      const compName = comp.name || comp.url
      list.push({
        id: `comp-${comp.url}`,
        title: compName,
        subtitle: comp.url,
        category: 'Competitors',
        icon: <Swords className="h-4 w-4 text-rose-400" />,
        badge: 'Competitor',
        action: () => {
          onOpenChange(false)
          router.push(`/dashboard/competitors`)
        },
      })
    }

    // Also include own product if available
    if (currentProjectMeta?.ownProduct?.url) {
      list.push({
        id: `own-product`,
        title: currentProjectMeta.ownProduct.name || currentProjectMeta.name || 'Our Product',
        subtitle: currentProjectMeta.ownProduct.url,
        category: 'Competitors',
        icon: <Building2 className="h-4 w-4 text-primary" />,
        badge: 'Our Product',
        action: () => {
          onOpenChange(false)
          router.push('/overview')
        },
      })
    }

    // 3. Workspaces
    for (const proj of projects) {
      const isCurrent = proj.id === currentProjectId
      list.push({
        id: `workspace-${proj.id}`,
        title: proj.name,
        subtitle: `${proj.platform} • ${proj.competitors?.length || 0} competitors`,
        category: 'Workspaces',
        icon: <Building2 className="h-4 w-4 text-primary" />,
        badge: isCurrent ? 'Active Workspace' : 'Switch Workspace',
        action: () => {
          onOpenChange(false)
          if (!isCurrent) {
            setCurrentProjectId(proj.id)
          }
        },
      })
    }

    // 4. Quick Actions
    list.push({
      id: 'action-new-analysis',
      title: 'Create New Analysis',
      subtitle: 'Analyze a new product and track competitors',
      category: 'Actions',
      icon: <PlusCircle className="h-4 w-4 text-primary" />,
      action: () => {
        onOpenChange(false)
        router.push('/analyses/new')
      },
    })

    return list
  }, [projects, currentProjectId, currentProjectMeta, onOpenChange, router, setCurrentProjectId])

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase().trim()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    )
  }, [items, query])

  // Reset selected index if it exceeds filtered length
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return
    const activeEl = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!open) return null

  // Group filtered items by category
  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, SearchItem[]>)

  const categories = ['Workspaces', 'Competitors', 'Pages', 'Actions'].filter((cat) => grouped[cat]?.length)

  let globalCounter = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search competitors, pages, workspaces, actions..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1.5">
              <Search className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground">No matching results found</p>
              <p>Try searching for a competitor name, page (e.g. &quot;Reviews&quot;), or workspace.</p>
            </div>
          ) : (
            categories.map((category) => {
              const categoryItems = grouped[category]
              return (
                <div key={category} className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {category}
                  </div>
                  {categoryItems.map((item) => {
                    const currentIndex = globalCounter++
                    const isSelected = currentIndex === selectedIndex
                    return (
                      <div
                        key={item.id}
                        data-index={currentIndex}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            'p-1.5 rounded-md shrink-0',
                            isSelected ? 'bg-primary/20 text-primary' : 'bg-muted/80'
                          )}>
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.2 rounded font-semibold',
                                  item.badge === 'Active Workspace'
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                )}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 text-muted-foreground ml-2">
                          <ArrowRight className={cn('h-3.5 w-3.5 transition-transform', isSelected ? 'translate-x-0.5 text-primary' : 'opacity-40')} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3.5 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.2 text-[10px]">↑</kbd>
              <kbd className="rounded border border-border bg-card px-1 py-0.2 text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.2 text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredItems.length} results</span>
        </div>
      </div>
    </div>
  )
}
