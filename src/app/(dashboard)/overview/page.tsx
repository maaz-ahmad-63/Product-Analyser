'use client'

import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  Swords,
  Activity,
  Target,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function OverviewPage() {
  const { currentTenantName } = useTenant()
  const [selectedAngle, setSelectedAngle] = useState('all')

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Outmano-Style Hero Intelligence Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/80 via-card/40 to-background p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="success" className="gap-1.5 py-1 px-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Agent Active
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Checked 12m ago
              </Badge>
              <span className="text-xs text-muted-foreground">
                Monitoring 3 competitors across 8 permitted public sources
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground pt-1">
              Your Competitive Shape · {currentTenantName || 'Acme Analytics'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Continuous intelligence that explains what moved, why it matters, and the exact next step for your product and sales team.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/assistant">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Ask Intelligence Agent
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Target className="h-4 w-4" />
                Sales Opportunities (3 Ready)
              </Button>
            </Link>
          </div>
        </div>

        <Separator className="my-6 bg-border/60" />

        {/* Outmano "Competitive Shape" Key Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold uppercase tracking-wider">Pricing Advantage</span>
              <Badge variant="warning" className="text-[10px]">Move Detected</Badge>
            </div>
            <div className="text-lg font-bold text-foreground">You Undercut by 28%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mixpanel raised Growth to $35/mo + retention limits. Your $99 flat tier has strong leverage.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-emerald-500/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold uppercase tracking-wider">Public Sentiment</span>
              <Badge variant="success" className="text-[10px]">You Lead · 1st of 4</Badge>
            </div>
            <div className="text-lg font-bold text-emerald-400">92% Positive vs 71% Avg</div>
            <p className="text-xs text-muted-foreground mt-1">
              Competitor churn intent spiked due to unpredictable overage invoices this week.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-blue-500/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold uppercase tracking-wider">Customer Churn Pool</span>
              <Badge variant="info" className="text-[10px]">8 Hot Leads</Badge>
            </div>
            <div className="text-lg font-bold text-foreground">3 Ready to Pitch</div>
            <p className="text-xs text-muted-foreground mt-1">
              Public dissatisfied users asking for alternatives with pre-drafted ethical pitches.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-purple-500/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-semibold uppercase tracking-wider">Action Plan</span>
              <Badge variant="purple" className="text-[10px]">Ranked Plan</Badge>
            </div>
            <div className="text-lg font-bold text-purple-400">2 High Priority Moves</div>
            <p className="text-xs text-muted-foreground mt-1">
              Next 30-min step: Add &ldquo;No Hidden Event Overage&rdquo; callout on pricing page.
            </p>
          </div>
        </div>
      </div>

      {/* Outmano-Style Intelligence Feed: "What moved, why it matters, what to do" */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Strategic Intelligence Feed
            </h2>
            <p className="text-xs text-muted-foreground">
              Specialized AI agents inspect every angle, discard noise, and summarize the move and the countermeasure.
            </p>
          </div>

          <Tabs value={selectedAngle} onValueChange={setSelectedAngle} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All Moves</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="positioning">Positioning</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="reviews">Unhappy Users</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Intelligence Cards with "The Move", "The Read", and "The Action" */}
        <div className="space-y-4">
          {/* Card 1: Mixpanel Pricing Squeeze */}
          <Card className="border-border/80 bg-card/60 transition-all hover:border-border hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">
                    M
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Mixpanel</span>
                      <Badge variant="warning" className="text-[10px]">Pricing & Limits</Badge>
                      <span className="text-[11px] text-muted-foreground">• 4 hours ago</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] gap-1 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Receipts Verified
                  </Badge>
                  <a
                    href="https://mixpanel.com/pricing"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <CardTitle className="text-base font-bold text-foreground pt-2">
                Raised Growth Tier Base Price from $25 to $35/mo and capped retention history to 90 days
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg bg-background/50 p-3.5 border border-border/60">
                <div>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    The Strategic Read
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Mid-market squeeze. Mixpanel is pushing high-growth startups toward their enterprise contracts by restricting historical retention charts on entry tiers while simultaneously hiking entry base prices.
                  </p>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-border/60 pt-3 md:pt-0 md:pl-3.5">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Recommended Move (30-min first step)
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Update your pricing comparison table to explicitly call out: <strong className="text-foreground">&ldquo;Full 1-Year Retention History Included on All Plans — No Surge Invoices.&rdquo;</strong>
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Link href="/recommendations">
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1">
                        Accept Recommendation <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: PostHog Feature Drop */}
          <Card className="border-border/80 bg-card/60 transition-all hover:border-border hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    P
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">PostHog</span>
                      <Badge variant="info" className="text-[10px]">Feature Release</Badge>
                      <span className="text-[11px] text-muted-foreground">• Yesterday</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] gap-1 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Changelog Verified
                  </Badge>
                  <a
                    href="https://posthog.com/changelog"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <CardTitle className="text-base font-bold text-foreground pt-2">
                Launched Autonomous AI Session Replay Summaries
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg bg-background/50 p-3.5 border border-border/60">
                <div>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    The Strategic Read
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Attempting to capture qualitative user research budget. By synthesizing session recordings with LLM summaries, PostHog is positioning beyond pure metrics into UX diagnostics.
                  </p>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-border/60 pt-3 md:pt-0 md:pl-3.5">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Recommended Move
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Emphasize your core strength: speed and lightweight instrumentation. Add note in sales battlecard: &ldquo;PostHog script weight is 48KB+ vs Acme&apos;s 6KB script.&rdquo;
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Link href="/competitors">
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1">
                        View Feature Gap Matrix <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Hot Sales Opportunity from Dissatisfied Competitor Customer */}
          <Card className="border-emerald-500/30 bg-card/60 transition-all hover:border-emerald-500/50 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Unhappy Competitor User · Sales Lead</span>
                      <Badge variant="success" className="text-[10px]">Score: 0.94</Badge>
                      <span className="text-[11px] text-muted-foreground">• 12 hours ago</span>
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                  Ready for Manual Approval
                </Badge>
              </div>

              <CardTitle className="text-base font-bold text-foreground pt-2">
                Public Complaint: &ldquo;Mixpanel just doubled our bill because of event spikes. Need flat-rate alternative.&rdquo;
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="rounded-lg bg-background/60 p-3.5 border border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                    Drafted Ethical Pitch (Awaiting Your Review)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Channel: Public Discussion Reply</span>
                </div>
                <p className="text-foreground/90 italic bg-card/50 p-3 rounded border border-border/40 font-mono text-[11px]">
                  &ldquo;Hey there — saw your frustration with spike billing. We built Acme Analytics specifically with flat monthly tiers ($99/mo with zero surge fees). Happy to extend a 30-day trial and help migrate your funnel tracking if you want to test it.&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-muted-foreground text-[11px]">
                    Strict Anti-Spam Policy: Requires human click to approve before dispatch.
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href="/opportunities">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                        Review & Approve Pitch <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two-Column Section: Competitor Battlecards & Recent Monitoring Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outmano-Style Sales Battlecard Quick Glance */}
        <Card className="border-border/80 bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Sales Battlecard Quick-Reference</CardTitle>
              </div>
              <Link href="/competitors" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                All 3 rivals <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              How to position against your top rivals when prospects mention them on calls.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">When prospect mentions: Mixpanel</span>
                <span className="text-emerald-400 font-normal">Win Rate: 68%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                <strong>Vulnerability:</strong> Surprise bill shocks and sudden account throttling when events exceed tier limits.
              </p>
              <div className="rounded bg-primary/10 p-2 text-[11px] text-primary">
                <strong>The Talk-Track:</strong> &ldquo;They charge by data point volume; if you go viral, your bill goes viral. We charge flat rate with unlimited team members.&rdquo;
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">When prospect mentions: Amplitude</span>
                <span className="text-emerald-400 font-normal">Win Rate: 61%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                <strong>Vulnerability:</strong> Extreme implementation complexity; non-technical teams struggle to build basic conversion funnels.
              </p>
              <div className="rounded bg-primary/10 p-2 text-[11px] text-primary">
                <strong>The Talk-Track:</strong> &ldquo;Amplitude takes weeks of engineering to setup. Acme takes 5 minutes with our 1-line script or Segment destination.&rdquo;
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intelligence Sources & Health (Permitted Public Data Only) */}
        <Card className="border-border/80 bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-base">Permitted Data Sources & Health</CardTitle>
              </div>
              <Link href="/jobs" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Job queue <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              All data collected via public sitemaps, open pricing pages, public changelogs, and approved review feeds.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/40 border border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <div>
                  <div className="font-semibold text-foreground">Mixpanel Public Pricing</div>
                  <div className="text-[10px] text-muted-foreground">HTTP Connector · Robots.txt Compliant</div>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Healthy · 4h ago</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/40 border border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <div>
                  <div className="font-semibold text-foreground">PostHog Public RSS Changelog</div>
                  <div className="text-[10px] text-muted-foreground">RSS Feed Connector · Rate Limited</div>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Healthy · 14h ago</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/40 border border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <div>
                  <div className="font-semibold text-foreground">G2 Public Reviews Aggregator</div>
                  <div className="text-[10px] text-muted-foreground">Public Discussion Connector</div>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Healthy · 8h ago</span>
            </div>

            <div className="rounded-lg bg-secondary/30 p-3 border border-border/40 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Compliance Guarantee:</strong> Zero private scraping, zero auth bypass, zero credential access. Complies with robots.txt and respectful crawl cadences.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
