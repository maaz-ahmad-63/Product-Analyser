'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, ArrowRight, RotateCw, AlertTriangle, PlusCircle } from 'lucide-react'

interface HistoryItem {
  id: string
  myUrl: string
  competitorUrl: string
  status: string
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

export default function AnalysisHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analyze')
      if (!res.ok) throw new Error('Failed to load history')
      const data = await res.json()
      setItems(data.recent || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching history')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analysis History</h1>
          <p className="text-xs text-muted-foreground">
            All persistent competitor comparisons stored in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchHistory}
            className="text-xs gap-1.5"
            disabled={isLoading}
          >
            <RotateCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/">
            <Button size="sm" className="text-xs gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Analysis</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/60">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Historical Comparisons ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <History className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No analyses performed yet.</p>
              <Link href="/">
                <Button size="sm" className="text-xs">
                  Run your first analysis
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <span className="font-semibold truncate max-w-[200px] sm:max-w-[280px]">{item.myUrl}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-semibold truncate max-w-[200px] sm:max-w-[280px] text-primary">
                        {item.competitorUrl}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                      {item.completedAt && (
                        <span>• Completed in {Math.max(1, Math.round((new Date(item.completedAt).getTime() - new Date(item.createdAt).getTime()) / 1000))}s</span>
                      )}
                    </div>
                    {item.errorMessage && (
                      <p className="text-[11px] text-rose-400">Error: {item.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        item.status === 'completed'
                          ? 'success'
                          : item.status === 'failed'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px] capitalize"
                    >
                      {item.status}
                    </Badge>

                    {item.status === 'completed' && (
                      <Link href={`/analysis/${item.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <span>View Results</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
