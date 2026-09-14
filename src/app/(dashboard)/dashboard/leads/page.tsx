'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useProject } from '@/context/project-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Copy,
  Check,
  Send,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Target,
  Clock,
  ArrowRight,
} from 'lucide-react'

export default function LeadsPage() {
  const { currentProjectId, currentProjectMeta, currentProjectData, isLoading, projects } = useProject()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sentLeads, setSentLeads] = useState<Record<string, boolean>>({})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading sales leads & outreach drafts...
      </div>
    )
  }

  if (!currentProjectId || projects.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center text-primary">
          <Users className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No SaaS Project Selected</h2>
        <p className="text-xs text-muted-foreground">
          Select an active workspace above or run an analysis to synthesize ethical outreach pitches for public dissatisfied competitor users.
        </p>
        <Link href="/analyses/new">
          <Button className="gap-2 mt-2">
            <Sparkles className="h-4 w-4" />
            Run New Analysis
          </Button>
        </Link>
      </div>
    )
  }

  const opportunities: any[] = currentProjectData?.opportunities || []
  // Filter opportunities that have pitches or high score
  const leads = opportunities.filter((o) => o.suggestedOutreach || (o.opportunityScore ?? 0) >= 0.7)

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleSent = (id: string) => {
    setSentLeads((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/40">
              Ethical Sales Engine
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {leads.length} Hot Leads Ready
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary shrink-0" />
            <span>Leads & Ethical Outreach Queue</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Pre-drafted, value-first response messages addressing public customer complaints with specific solutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href={`/analyses/${currentProjectId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Full Analysis Matrix</span>
            </Button>
          </Link>
          <Link href="/dashboard/opportunities">
            <Button size="sm" className="gap-1.5 text-xs shadow-sm">
              <Target className="h-3.5 w-3.5" />
              <span>All Opportunities</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-foreground">Anti-Spam & Ethical Outreach Compliance</span>
          <p className="text-muted-foreground leading-relaxed">
            All pitches are tailored exclusively to users who publicly asked for alternatives or documented unsolvable bugs.
            Messages require manual review and approval. Automated bot spamming is strictly disabled by policy.
          </p>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {leads.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border text-xs text-muted-foreground">
            No active outreach leads in queue. Run a new analysis or check back once competitor reviews are refreshed.
          </Card>
        ) : (
          leads.map((lead: any, idx: number) => {
            const id = lead.id || String(idx)
            const isSent = !!sentLeads[id]
            const isCopied = copiedId === id
            const defaultPitch =
              lead.suggestedOutreach ||
              `Hi there! Noticed your issue with ${lead.targetCompetitor || 'your current solution'}. Our SaaS was built specifically with flat pricing and native ${lead.matchingProductFeature || 'integrations'}. Happy to help answer any questions if you're evaluating alternatives!`

            return (
              <Card
                key={id}
                className={`border-border transition-all ${
                  isSent ? 'bg-muted/30 border-border/40 opacity-75' : 'bg-card'
                }`}
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">
                          {lead.title || `${lead.targetCompetitor || 'Competitor'} Churn Prospect`}
                        </CardTitle>
                        <span className="text-[11px] text-muted-foreground">
                          Confidence Match: {Math.round((lead.opportunityScore ?? 0.8) * 100)}%
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={isSent ? 'outline' : 'success'}
                      className="text-[10px]"
                    >
                      {isSent ? 'Outreach Dispatched' : 'Awaiting Review'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5 text-xs">
                  {/* Public Comment Quote */}
                  <div className="p-3 rounded bg-muted/20 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Customer Problem Statement
                    </span>
                    <p className="text-foreground text-xs italic leading-relaxed">
                      &ldquo;{lead.publicComment || lead.evidence || lead.reason}&rdquo;
                    </p>
                  </div>

                  {/* Pitch Draft Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Tailored Response Pitch
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleCopy(id, defaultPitch)}
                        className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="p-3 rounded-lg bg-background border border-border font-mono text-xs text-foreground leading-relaxed">
                      {defaultPitch}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      Status: {isSent ? 'Marked complete' : 'Ready to send'}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(id, defaultPitch)}
                        className="h-7 text-xs gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy Pitch</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => toggleSent(id)}
                        className={`h-7 text-xs gap-1.5 ${
                          isSent
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Approved & Sent</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Approve & Mark Sent</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Strict zero-automated-bot outreach policy enforced.</span>
        </span>
        <span>Human Review Required</span>
      </div>
    </div>
  )
}
