'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Swords,
  ArrowRight,
  Loader2,
  AlertCircle,
  History,
  CheckCircle2,
  Shield,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Key,
} from 'lucide-react'
import Link from 'next/link'

interface RecentAnalysisItem {
  id: string
  projectName?: string
  myUrl: string
  competitorUrl: string
  competitorUrls?: string[]
  status: string
  createdAt: string
  errorMessage?: string
}

export default function AnalyzePage() {
  const router = useRouter()
  const [myUrl, setMyUrl] = useState('')
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([''])
  const [projectName, setProjectName] = useState('')
  const [targetKeywords, setTargetKeywords] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('Fetching websites...')
  const [error, setError] = useState('')
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysisItem[]>([])

  useEffect(() => {
    fetchRecent()
  }, [])

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/analyze')
      if (res.ok) {
        const data = await res.json()
        setRecentAnalyses(data.recent || [])
      }
    } catch {
      // ignore
    }
  }

  const handleAddCompetitor = () => {
    if (competitorUrls.length >= 5) {
      setError('You can compare up to 5 competitor products simultaneously.')
      return
    }
    setError('')
    setCompetitorUrls([...competitorUrls, ''])
  }

  const handleRemoveCompetitor = (index: number) => {
    if (competitorUrls.length <= 1) return
    setCompetitorUrls(competitorUrls.filter((_, i) => i !== index))
  }

  const handleCompetitorChange = (index: number, value: string) => {
    const updated = [...competitorUrls]
    updated[index] = value
    setCompetitorUrls(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedMy = myUrl.trim()
    const cleanComps = competitorUrls.map((u) => u.trim()).filter(Boolean)

    if (!trimmedMy) {
      setError('Please enter your SaaS or Envato product URL.')
      return
    }

    if (cleanComps.length === 0) {
      setError('Please enter at least one competitor URL.')
      return
    }

    // Check for duplicate URLs
    const normalizedMy = trimmedMy.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
    const normalizedComps = cleanComps.map((u) =>
      u.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
    )

    if (normalizedComps.includes(normalizedMy)) {
      setError('Your product URL cannot also be listed as a competitor.')
      return
    }

    const uniqueComps = new Set(normalizedComps)
    if (uniqueComps.size !== normalizedComps.length) {
      setError('Duplicate competitor URLs detected. Please provide distinct product URLs.')
      return
    }

    const parsedKeywords = targetKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    setIsLoading(true)
    setLoadingStep('Collecting product telemetry, public comments, and SEO signals...')

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep('Analyzing Envato sales snapshots, pricing, and category rankings...')
      }, 3500)

      const stepTimer2 = setTimeout(() => {
        setLoadingStep('Extracting keyword gaps, topic sentiments, and sales opportunities...')
      }, 8000)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          my_url: trimmedMy,
          competitor_urls: cleanComps,
          project_name: projectName.trim() || undefined,
          target_keywords: parsedKeywords,
        }),
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete competitive analysis')
      }

      router.push(`/analysis/${data.analysis_id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Title & Description */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-1">
          <Shield className="h-3 w-3 text-emerald-500" />
          <span>Multi-Competitor Intelligence · Sales · SEO · Comments · Opportunities</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          SaaS & Envato Competitor Intelligence Platform
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Compare your product against multiple competitors simultaneously. Crawls public marketplace pages, evaluates sales snapshots, benchmarks SEO keywords, and classifies customer comments to detect sales opportunities.
        </p>
      </div>

      {/* Main Analysis Form Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              <span>Multi-Competitor Project Setup</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Up to 5 Competitors
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Enter your product URL and add one or more competitor URLs to run full competitive intelligence.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Optional Project Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="projectName">
                Project Name <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                id="projectName"
                type="text"
                placeholder="e.g. My Fleet SaaS vs Taxi App Leaders"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isLoading}
                className="text-xs h-9"
              />
            </div>

            {/* My Product URL */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="myUrl">
                My Product / SaaS URL <span className="text-red-400">*</span>
              </label>
              <Input
                id="myUrl"
                type="text"
                placeholder="https://codecanyon.net/item/my-product/12345678 or https://mysaas.com"
                value={myUrl}
                onChange={(e) => setMyUrl(e.target.value)}
                disabled={isLoading}
                required
                className="text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Your target product to benchmark and optimize against competitors.
              </p>
            </div>

            {/* Competitor URLs List */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  Competitor URLs <span className="text-red-400">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleAddCompetitor}
                  disabled={isLoading || competitorUrls.length >= 5}
                  className="text-xs gap-1 text-primary hover:text-primary/80"
                >
                  <Plus className="h-3 w-3" />
                  Add Another Competitor
                </Button>
              </div>

              {competitorUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder={`Competitor #${idx + 1} URL (e.g. https://codecanyon.net/item/competitor/87654321)`}
                      value={url}
                      onChange={(e) => handleCompetitorChange(idx, e.target.value)}
                      disabled={isLoading}
                      required={idx === 0}
                      className="text-xs h-9"
                    />
                  </div>
                  {competitorUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleRemoveCompetitor(idx)}
                      disabled={isLoading}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                      title="Remove competitor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Optional Target Keywords */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="targetKeywords">
                Target Keywords for SEO Tracking <span className="text-muted-foreground font-normal">(Optional, comma-separated)</span>
              </label>
              <div className="relative">
                <Input
                  id="targetKeywords"
                  type="text"
                  placeholder="e.g. taxi booking script, ride sharing app, uber clone flutter"
                  value={targetKeywords}
                  onChange={(e) => setTargetKeywords(e.target.value)}
                  disabled={isLoading}
                  className="text-xs h-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Keywords to benchmark search visibility and content coverage against competitors.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 text-xs font-semibold gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{loadingStep}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Run Multi-Competitor Intelligence Analysis</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-border bg-card space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Multi-Competitor</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Compare up to 5 competitor products side-by-side in one unified project.</p>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-amber-400" />
            <span>SEO Gap Engine</span>
          </div>
          <p className="text-[11px] text-muted-foreground">On-page audit, title length, keyword coverage, and copyable recommendations.</p>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-purple-400" />
            <span>Public Comments</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Rule-based sentiment classification across 13 distinct customer friction topics.</p>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Outreach Drafts</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Identifies sales opportunities with polite, respectful draft messages for manual approval.</p>
        </div>
      </div>

      {/* Recent Comparisons List */}
      {recentAnalyses.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <History className="h-3.5 w-3.5" />
              <span>Recent Competitive Projects</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAnalyses.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/analysis/${item.id}`}
                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-secondary/30 hover:bg-muted transition-colors text-xs group"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate max-w-[220px]">
                      {item.projectName || item.myUrl.replace(/https?:\/\/(www\.)?/, '')}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono px-1">
                      {item.competitorUrls && item.competitorUrls.length > 1
                        ? `${item.competitorUrls.length} Competitors`
                        : '1 Competitor'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    Target: {item.myUrl.replace(/https?:\/\/(www\.)?/, '')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
