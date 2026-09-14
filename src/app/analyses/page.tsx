'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  PlusCircle,
  RotateCw,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Play,
  Share2,
  Edit3,
  Trash2,
  Globe,
  Lock,
  Loader2,
  Tag,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShareAnalysisDialog } from '@/components/analyses/share-analysis-dialog'
import { EditAnalysisDialog } from '@/components/analyses/edit-analysis-dialog'
import { DeleteAnalysisDialog } from '@/components/analyses/delete-analysis-dialog'

interface AnalysisItem {
  id: string
  name: string
  platform: 'envato' | 'generic' | string
  ownProduct: {
    url: string
    name: string | null
  }
  competitors: Array<{
    url: string
    name: string | null
  }>
  selectedModules: string[]
  status: 'completed' | 'running' | 'failed' | 'queued' | string
  shareEnabled?: boolean
  shareToken?: string | null
  createdAt: string
  updatedAt: string
  lastRefreshedAt?: string | null
  nextRefreshAt?: string | null
  errorMessage?: string | null
}

const MODULE_LABELS: Record<string, string> = {
  product_intelligence: 'Product',
  seo: 'SEO',
  sales: 'Sales',
  reviews: 'Reviews',
  comments: 'Feedback',
  opportunities: 'Opportunities',
}

export default function AnalysesIndexPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [analyses, setAnalyses] = useState<AnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Running state per analysis ID
  const [runningIds, setRunningIds] = useState<Record<string, boolean>>({})

  // Dialog targets
  const [shareTarget, setShareTarget] = useState<AnalysisItem | null>(null)
  const [editTarget, setEditTarget] = useState<AnalysisItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnalysisItem | null>(null)

  const fetchAnalyses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analyses')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch analyses (${res.status})`)
      }
      const data = await res.json()
      setAnalyses(data.analyses || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching analyses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalyses()
  }, [fetchAnalyses])

  // Run Now action
  const handleRunNow = async (id: string) => {
    setRunningIds((prev) => ({ ...prev, [id]: true }))
    setActionMessage(null)
    setError(null)

    try {
      const res = await fetch(`/api/analyses/${id}/run`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger run')
      }
      setActionMessage('Analysis run started. Refreshing workspace telemetry...')
      await fetchAnalyses()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunningIds((prev) => ({ ...prev, [id]: false }))
    }
  }

  const filteredAnalyses = useMemo(() => {
    return analyses.filter((item) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.ownProduct.url.toLowerCase().includes(q) ||
        (item.ownProduct.name && item.ownProduct.name.toLowerCase().includes(q)) ||
        item.competitors.some((c) => c.url.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)))

      const matchesPlatform =
        platformFilter === 'all' || item.platform === platformFilter

      return matchesSearch && matchesPlatform
    })
  }, [analyses, searchQuery, platformFilter])

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-mono">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        )
      case 'running':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 text-[10px] font-mono animate-pulse">
            <Clock className="h-3 w-3" />
            <span>Running</span>
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 gap-1 text-[10px] font-mono">
            <XCircle className="h-3 w-3" />
            <span>Failed</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-mono">
            <span>{status}</span>
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header & New Analysis CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Analyses Workspace
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your competitive intelligence analyses, public executive reports, and scheduled scraping runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAnalyses}
            disabled={loading}
            className="text-xs gap-1.5 h-8"
          >
            <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/analyses/new">
            <Button size="sm" className="text-xs gap-1.5 h-8 bg-primary font-medium">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>+ New Analysis</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Messages */}
      {actionMessage && (
        <div className="p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchAnalyses} className="text-xs h-6">
            Retry
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by analysis, product, competitor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8 bg-muted/20 border-border"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Platform:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="h-8 rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground shadow-sm focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="envato">Envato</option>
            <option value="generic">Other / Generic</option>
          </select>
        </div>
      </div>

      {/* Analyses Table View (Linear / Stripe B2B Density) */}
      <Card className="border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Analysis Name</th>
                <th className="px-3 py-3">Platform</th>
                <th className="px-4 py-3">Target Product</th>
                <th className="px-3 py-3">Competitors</th>
                <th className="px-3 py-3">Active Modules</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Report</th>
                <th className="px-3 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading analyses workspace...</span>
                  </td>
                </tr>
              ) : filteredAnalyses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-foreground font-medium text-xs">No analyses found</p>
                      <p className="text-[11px] text-muted-foreground">
                        {analyses.length === 0
                          ? 'Create your first product analysis to start gathering competitor intelligence.'
                          : 'No analyses matched your search query or platform filter.'}
                      </p>
                      {analyses.length === 0 && (
                        <Link href="/analyses/new">
                          <Button size="sm" className="h-7 text-xs gap-1 mt-2">
                            <PlusCircle className="h-3 w-3" />
                            <span>Create Analysis</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAnalyses.map((item) => {
                  const isRunning = !!runningIds[item.id] || item.status === 'running'
                  const isShared = !!item.shareEnabled && !!item.shareToken

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* 1. Name */}
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/analyses/${item.id}`}
                          className="text-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-semibold text-xs truncate max-w-[200px]"
                        >
                          <span className="truncate">{item.name}</span>
                        </Link>
                      </td>

                      {/* 2. Platform */}
                      <td className="px-3 py-3">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-mono py-0 px-1.5 font-normal"
                        >
                          {item.platform === 'envato' ? 'Envato' : 'Generic'}
                        </Badge>
                      </td>

                      {/* 3. Own Product */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span className="font-medium text-foreground block truncate max-w-[180px]">
                            {item.ownProduct.name || 'Target Product'}
                          </span>
                          <a
                            href={item.ownProduct.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-primary font-mono truncate max-w-[180px] inline-flex items-center gap-1"
                          >
                            <span className="truncate">{item.ownProduct.url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        </div>
                      </td>

                      {/* 4. Competitor Count */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3 text-muted-foreground/80" />
                          <span>{item.competitors.length} comp</span>
                        </span>
                      </td>

                      {/* 5. Selected Modules */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 flex-wrap max-w-[160px]">
                          {item.selectedModules && item.selectedModules.length > 0 ? (
                            item.selectedModules.slice(0, 3).map((mod) => (
                              <span
                                key={mod}
                                className="text-[9px] px-1 py-0.2 rounded bg-muted/70 text-muted-foreground font-mono"
                              >
                                {MODULE_LABELS[mod] || mod}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground">All Modules</span>
                          )}
                          {item.selectedModules && item.selectedModules.length > 3 && (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              +{item.selectedModules.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* 7. Report Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isShared ? (
                          <Link
                            href={`/report/${item.shareToken}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded"
                          >
                            <Globe className="h-2.5 w-2.5" />
                            <span>Public Link</span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-[10px] font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                            <Lock className="h-2.5 w-2.5" />
                            <span>Private</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Last Updated */}
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground text-[11px]">
                        <div className="space-y-0.5">
                          <span>{item.lastRefreshedAt ? new Date(item.lastRefreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                          {item.nextRefreshAt && (
                            <span className="block text-[9px] text-muted-foreground/70 font-mono">
                              Next: {new Date(item.nextRefreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 9. Actions: Open, Run Now, Share, Edit, Delete */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Open */}
                          <Link href={`/analyses/${item.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] px-2 text-foreground hover:bg-muted/80"
                              title="Open Workspace"
                            >
                              <span>Open</span>
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>

                          {/* Run Now */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRunNow(item.id)}
                            disabled={isRunning}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            title="Run Analysis"
                          >
                            {isRunning ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>

                          {/* Share */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShareTarget(item)}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            title="Share Executive Report"
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditTarget(item)}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            title="Edit Analysis Configuration"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>

                          {/* Delete (Admin Only) */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(item)}
                              className="h-7 text-[11px] px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              title="Admin: Delete Workspace"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Share Dialog */}
      {shareTarget && (
        <ShareAnalysisDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          analysisId={shareTarget.id}
          analysisName={shareTarget.name}
          initialShareEnabled={shareTarget.shareEnabled}
          initialShareToken={shareTarget.shareToken}
          onShareUpdated={(enabled, token) => {
            setAnalyses((prev) =>
              prev.map((a) =>
                a.id === shareTarget.id
                  ? { ...a, shareEnabled: enabled, shareToken: token }
                  : a
              )
            )
          }}
        />
      )}

      {/* Edit Dialog */}
      {editTarget && (
        <EditAnalysisDialog
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          analysisId={editTarget.id}
          initialName={editTarget.name}
          initialProductName={editTarget.ownProduct.name}
          initialModules={editTarget.selectedModules}
          onUpdated={(updated) => {
            setAnalyses((prev) =>
              prev.map((a) =>
                a.id === editTarget.id
                  ? {
                      ...a,
                      name: updated.name,
                      ownProduct: {
                        ...a.ownProduct,
                        name: updated.myProductName || null,
                      },
                      selectedModules: updated.selectedModules,
                    }
                  : a
              )
            )
            setActionMessage(`Updated analysis "${updated.name}".`)
          }}
        />
      )}

      {/* Delete Dialog (Admin Only) */}
      {deleteTarget && (
        <DeleteAnalysisDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          analysisId={deleteTarget.id}
          analysisName={deleteTarget.name}
          onDeleted={() => {
            setAnalyses((prev) => prev.filter((a) => a.id !== deleteTarget.id))
            setActionMessage(`Analysis "${deleteTarget.name}" deleted.`)
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
