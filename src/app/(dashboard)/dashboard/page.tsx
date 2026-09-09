'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { MetricCard } from '@/components/shared/metric-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { DataTable } from '@/components/shared/data-table'
import { EvidenceLink } from '@/components/shared/evidence-link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ColumnDef } from '@tanstack/react-table'
import {
  mockMetricSummary,
  mockCompetitorChanges,
  mockRecommendations,
  mockCustomerOpportunities,
  mockCompetitors,
} from '@/lib/api/mock-data'
import { CompetitorChange } from '@/types'
import {
  Swords,
  Activity,
  ThumbsDown,
  Lightbulb,
  Target,
  Users,
  Percent,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardOverviewPage() {
  const [changes] = useState<CompetitorChange[]>(mockCompetitorChanges)

  // TanStack Table Column Definitions for Competitor Changes
  const changeColumns: ColumnDef<CompetitorChange>[] = [
    {
      accessorKey: 'competitorName',
      header: 'Competitor',
      cell: ({ row }) => (
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>{row.getValue('competitorName')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'changeType',
      header: 'Change Type',
      cell: ({ row }) => {
        const type = row.getValue('changeType') as string
        return (
          <span className="font-mono text-[11px] text-muted-foreground uppercase">
            {type.replace(/_/g, ' ')}
          </span>
        )
      },
    },
    {
      accessorKey: 'newValue',
      header: 'Observed Change',
      cell: ({ row }) => (
        <div className="max-w-[340px]">
          <span className="font-medium text-foreground block truncate">
            {row.original.newValue}
          </span>
          <span className="text-[10px] text-muted-foreground line-through block truncate">
            {row.original.previousValue}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'importance',
      header: 'Importance',
      cell: ({ row }) => (
        <PriorityBadge priority={row.getValue('importance')} />
      ),
    },
    {
      accessorKey: 'detectedDate',
      header: 'Detected',
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap text-[11px]">
          {row.getValue('detectedDate')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.getValue('status')} />
      ),
    },
    {
      id: 'source',
      header: 'Evidence',
      cell: ({ row }) => (
        <EvidenceLink
          url={row.original.sourceUrl}
          label="Receipt"
          sourceType={row.original.sourceType}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Top Section / Page Header */}
      <PageHeader
        title="Intelligence Overview"
        description="Automated monitoring of competitor pricing, features, copy pivots, and public switching intent."
        badge={
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 gap-1 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Monitoring Active
          </Badge>
        }
        onRefresh={() => {}}
        onExport={() => {}}
      />

      {/* 2. Metric Cards Grid (8 core B2B metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Competitors Monitored"
          value={mockMetricSummary.competitorsMonitored}
          description="Mixpanel, Amplitude, PostHog, Heap"
          trend={mockMetricSummary.competitorsDelta}
          icon={Swords}
          href="/dashboard/competitors"
        />
        <MetricCard
          title="Changes Detected (7d)"
          value={mockMetricSummary.changesDetected}
          description="Pricing, features, copy pivots"
          trend={mockMetricSummary.changesDelta}
          icon={Activity}
          href="/dashboard/changes"
        />
        <MetricCard
          title="Negative Feedback Rate"
          value={`${mockMetricSummary.negativeFeedbackRate}%`}
          description="Competitor user complaint ratio"
          trend={mockMetricSummary.negativeFeedbackDelta}
          inverseTrend
          icon={ThumbsDown}
          href="/dashboard/reviews"
        />
        <MetricCard
          title="Open Recommendations"
          value={mockMetricSummary.openRecommendations}
          description="2 critical, 3 high priority"
          icon={Lightbulb}
          href="/dashboard/recommendations"
        />
        <MetricCard
          title="Opportunities Detected"
          value={mockMetricSummary.opportunitiesDetected}
          description="Public comments seeking alternatives"
          icon={Target}
          href="/dashboard/opportunities"
        />
        <MetricCard
          title="Qualified Leads"
          value={mockMetricSummary.qualifiedLeads}
          description="Awaiting manual outreach review"
          icon={Users}
          href="/dashboard/leads"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${mockMetricSummary.conversionRate}%`}
          description="Opportunity to trial activation"
          trend={2.4}
          icon={Percent}
        />
        <MetricCard
          title="Monitoring Status"
          value="100% Online"
          description="All crawlers compliant with robots.txt"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          href="/dashboard/jobs"
        />
      </div>

      {/* 3. Main Section: Recent Competitor Changes Table */}
      <Card className="border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Competitor Changes
              </CardTitle>
              <CardDescription className="text-xs">
                Filterable audit trail of verified price changes, feature drops, and positioning shifts.
              </CardDescription>
            </div>
            <Link href="/dashboard/changes">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <span>View all 19 changes</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={changeColumns} data={changes} pageSize={5} />
        </CardContent>
      </Card>

      {/* 4. Two-Column Grid: Customer Opportunities & High-Impact Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer Opportunities (Public dissatisfied users) */}
        <Card className="border-border bg-card">
          <CardHeader className="py-3 px-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Customer Opportunities (Public Comments)
                </CardTitle>
                <CardDescription className="text-xs">
                  Rule-based text pattern matches identifying prospects seeking competitor alternatives.
                </CardDescription>
              </div>
              <Link href="/dashboard/opportunities">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <span>Manage</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {mockCustomerOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="rounded border border-border/80 bg-muted/20 p-3 space-y-2 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {opp.competitorName} Churn Intent
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      via {opp.sourcePlatform}
                    </span>
                  </div>
                  <Badge variant="success" className="text-[10px] font-mono">
                    Score: {opp.opportunityScore}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  {opp.publicComment}
                </p>

                <div className="rounded bg-background/80 p-2 text-[11px] border border-border/60 flex items-start gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Matching Feature: </span>
                    <span className="text-muted-foreground">{opp.matchingProductFeature}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <StatusBadge status={opp.status} />
                  <Link href="/dashboard/leads">
                    <Button size="xs" variant="outline" className="text-xs gap-1">
                      <span>Review Outreach Draft</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rule-Based Product Recommendations */}
        <Card className="border-border bg-card">
          <CardHeader className="py-3 px-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-400" />
                  Recommended Actions (Rule-Engine)
                </CardTitle>
                <CardDescription className="text-xs">
                  Deterministic recommendations derived from competitor shifts and customer complaints.
                </CardDescription>
              </div>
              <Link href="/dashboard/recommendations">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <span>All 6</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {mockRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded border border-border/80 bg-muted/20 p-3 space-y-2 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground line-clamp-1 flex-1 pr-2">
                    {rec.title}
                  </span>
                  <PriorityBadge priority={rec.priority} />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {rec.problem}
                </p>

                <div className="rounded bg-background/80 p-2 text-[11px] border border-border/60">
                  <span className="font-semibold text-foreground">Suggested Action: </span>
                  <span className="text-muted-foreground">{rec.suggestedAction}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={rec.status} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Conf: {(rec.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Button size="xs" variant="secondary" className="text-xs gap-1">
                    Accept Action
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 5. Competitor Inventory Quick Glance */}
      <Card className="border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                Monitored Competitor Set
              </CardTitle>
              <CardDescription className="text-xs">
                Active crawlers tracking public pricing tiers, sitemaps, and changelogs.
              </CardDescription>
            </div>
            <Link href="/dashboard/competitors">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <span>Manage Competitors</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {mockCompetitors.map((comp) => (
              <div
                key={comp.id}
                className="rounded border border-border/80 bg-muted/30 p-3 space-y-2 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{comp.name}</span>
                  <StatusBadge status={comp.status} />
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div>
                    <span className="text-foreground font-medium">Pricing: </span>
                    <span>{comp.pricingSummary}</span>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Checked: </span>
                    <span>{comp.lastCheckedTime}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <PriorityBadge priority={comp.riskLevel} />
                  <Link
                    href={`/dashboard/competitors/${comp.id}`}
                    className="text-primary hover:underline text-[11px] flex items-center gap-0.5"
                  >
                    <span>View Matrix</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
