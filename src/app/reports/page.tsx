'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileBarChart,
  Globe,
  Lock,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  Loader2,
  Share2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShareAnalysisDialog } from '@/components/analyses/share-analysis-dialog'

interface ReportItem {
  id: string
  name: string
  platform: string
  shareEnabled: boolean
  shareToken: string | null
  updatedAt: string
  selectedModules: string[]
  competitorsCount: number
}

export default function ReportsHubPage() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<ReportItem | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analyses')
      if (!res.ok) {
        throw new Error(`Failed to load reports (${res.status})`)
      }
      const data = await res.json()
      const items: ReportItem[] = (data.analyses || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        platform: a.platform,
        shareEnabled: !!a.shareEnabled,
        shareToken: a.shareToken || null,
        updatedAt: a.updatedAt || a.createdAt,
        selectedModules: a.selectedModules || [],
        competitorsCount: Array.isArray(a.competitors) ? a.competitors.length : 0,
      }))
      setReports(items)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const copyReportLink = (token: string) => {
    const url = `${origin}/report/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Executive Reports
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage public shareable links and read-only executive presentations across all analyses.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchReports}
          disabled={loading}
          className="text-xs gap-1.5 h-8"
        >
          <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Reports Table */}
      <Card className="border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Analysis / Report Title</th>
                <th className="px-3 py-3">Platform</th>
                <th className="px-3 py-3">Public Access</th>
                <th className="px-4 py-3">Shareable Token</th>
                <th className="px-3 py-3">Modules Exposed</th>
                <th className="px-3 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading report statuses...</span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <p className="text-foreground font-medium text-xs">No reports found</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Create an analysis first to generate an executive shareable report.
                    </p>
                  </td>
                </tr>
              ) : (
                reports.map((item) => {
                  const hasToken = !!item.shareToken
                  const isShared = item.shareEnabled && hasToken

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/analyses/${item.id}`}
                          className="text-foreground hover:text-primary transition-colors font-semibold text-xs block truncate max-w-[220px]"
                        >
                          {item.name}
                        </Link>
                      </td>

                      {/* Platform */}
                      <td className="px-3 py-3">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-mono py-0 px-1.5 font-normal"
                        >
                          {item.platform}
                        </Badge>
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isShared ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            <span>Publicly Active</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] py-0 px-1.5 gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            <span>Private</span>
                          </Badge>
                        )}
                      </td>

                      {/* Token / URL */}
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {hasToken ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded border border-border/60">
                              {item.shareToken}
                            </span>
                            {isShared && (
                              <button
                                onClick={() => copyReportLink(item.shareToken!)}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title="Copy Public URL"
                              >
                                {copiedToken === item.shareToken ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Unassigned</span>
                        )}
                      </td>

                      {/* Modules */}
                      <td className="px-3 py-3 text-muted-foreground text-[11px]">
                        {item.selectedModules.length > 0 ? (
                          <span>{item.selectedModules.length} module(s)</span>
                        ) : (
                          <span>All Modules</span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isShared && (
                            <Link href={`/report/${item.shareToken}`} target="_blank">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] px-2 text-primary hover:bg-primary/10 gap-1"
                              >
                                <span>Preview</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Button>
                            </Link>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShareTarget(item)}
                            className="h-7 text-[11px] px-2 text-foreground gap-1"
                          >
                            <Share2 className="h-3 w-3" />
                            <span>Configure</span>
                          </Button>
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

      {/* Share Configuration Dialog */}
      {shareTarget && (
        <ShareAnalysisDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          analysisId={shareTarget.id}
          analysisName={shareTarget.name}
          initialShareEnabled={shareTarget.shareEnabled}
          initialShareToken={shareTarget.shareToken}
          onShareUpdated={(enabled, token) => {
            setReports((prev) =>
              prev.map((r) =>
                r.id === shareTarget.id
                  ? { ...r, shareEnabled: enabled, shareToken: token }
                  : r
              )
            )
          }}
        />
      )}
    </div>
  )
}
