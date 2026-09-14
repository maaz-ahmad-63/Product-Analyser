'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Plug,
  Globe,
  Share2,
  CheckCircle2,
  ExternalLink,
  Layers,
  ShieldCheck,
  Zap,
  Code,
  Check,
  Copy,
} from 'lucide-react'

export default function IntegrationsPage() {
  const { currentProjectId, currentProjectMeta, isLoading, projects } = useProject()
  const [copiedKey, setCopiedKey] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading platform connectors & integrations...
      </div>
    )
  }

  const shareToken = currentProjectMeta?.shareToken
  const isShareEnabled = currentProjectMeta?.shareEnabled

  const copyShareLink = () => {
    if (!shareToken) return
    const url = `${window.location.origin}/report/${shareToken}`
    navigator.clipboard.writeText(url)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
              Platform Connectors
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              6 Connectors Available
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary shrink-0" />
            <span>Connectors & Ecosystem Integrations</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Connect public marketplace endpoints, sitemaps, webhooks, and shareable executive reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/analyses/new">
            <Button size="sm" className="gap-1.5 text-xs shadow-sm">
              <Zap className="h-3.5 w-3.5" />
              <span>Configure New Scan</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Data Connectors */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span>Marketplace & Webpage Crawl Connectors</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Connector 1: Generic Webpage */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Generic Web / SaaS</span>
                <Badge variant="success" className="text-[10px]">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Extracts features, pricing plans, positioning claims, and SEO signals from any public SaaS domain.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs">
              <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground">
                Protocol: Headless HTTP / Cheerio / Robots.txt compliant
              </div>
            </CardContent>
          </Card>

          {/* Connector 2: Envato Market */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Envato / CodeCanyon</span>
                <Badge variant="success" className="text-[10px]">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Official API integration tracking verified units sold, author ratings, software versions, and buyer reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs">
              <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground">
                Protocol: Envato REST API v3 / Token Authenticated
              </div>
            </CardContent>
          </Card>

          {/* Connector 3: Chrome Web Store */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Chrome Web Store</span>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Available</Badge>
              </div>
              <CardDescription className="text-xs">
                Monitors extension installs, user reviews, manifest version updates, and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs">
              <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground">
                Protocol: Public Extension Metadata Parser
              </div>
            </CardContent>
          </Card>

          {/* Connector 4: WordPress Directory */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">WordPress Plugin & Theme</span>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Available</Badge>
              </div>
              <CardDescription className="text-xs">
                Tracks active installations, support ticket response rates, and release changelogs.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs">
              <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground">
                Protocol: WordPress.org Public API
              </div>
            </CardContent>
          </Card>

          {/* Connector 5: Shopify App Store */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Shopify App Store</span>
                <Badge variant="secondary" className="text-[10px]">Planned</Badge>
              </div>
              <CardDescription className="text-xs">
                App listing rankings, pricing plan tiers, and merchant review sentiment mining.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs">
              <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground">
                Protocol: App Store Public Scraper
              </div>
            </CardContent>
          </Card>

          {/* Connector 6: Public Report Sharing */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">32-Char Public Share URL</span>
                <Badge variant={isShareEnabled ? 'success' : 'outline'} className="text-[10px]">
                  {isShareEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Cryptographically secure, zero-auth public report links for stakeholders and executives.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs">
              {shareToken ? (
                <div className="flex items-center justify-between gap-2 rounded bg-muted/20 p-2">
                  <span className="font-mono text-[10px] truncate max-w-[180px]">
                    /report/{shareToken.slice(0, 16)}...
                  </span>
                  <Button variant="ghost" size="xs" onClick={copyShareLink} className="h-6 text-[11px] gap-1">
                    {copiedKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              ) : (
                <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground">
                  Enable sharing in the analysis matrix to generate a link.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Webhooks & API Integration */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            <span>Developer Webhook Notifications</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Receive automated POST events whenever competitor price changes or switching opportunities are verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded border border-border/60 bg-muted/10 space-y-1">
              <span className="font-bold text-foreground block">competitor.price_change</span>
              <p className="text-[11px] text-muted-foreground">Fires when competitor tier price or billing limits move.</p>
            </div>
            <div className="p-3 rounded border border-border/60 bg-muted/10 space-y-1">
              <span className="font-bold text-foreground block">opportunity.detected</span>
              <p className="text-[11px] text-muted-foreground">Fires when public buyer complaint matches your product features.</p>
            </div>
            <div className="p-3 rounded border border-border/60 bg-muted/10 space-y-1">
              <span className="font-bold text-foreground block">analysis.refreshed</span>
              <p className="text-[11px] text-muted-foreground">Fires on completion of scheduled hourly telemetry scan.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Complies with robots.txt and official developer APIs. Zero credential harvesting.</span>
        </span>
        <span>Secure Integrations</span>
      </div>
    </div>
  )
}
