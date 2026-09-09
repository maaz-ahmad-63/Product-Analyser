'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Key,
  RefreshCw,
  AlertTriangle,
  User,
  ShieldCheck,
  Send,
  Pause,
  Play,
  Settings2,
  EyeOff,
  Filter,
} from 'lucide-react'
import { OwnProductsManager, OwnProductItem } from './OwnProductsManager'

interface Message {
  id: string
  externalCommentId: string
  parentExternalCommentId: string | null
  authorType: string
  authorUsername: string
  messageText: string
  messageCreatedAt: string | null
}

interface Draft {
  id: string
  targetMessageId: string | null
  generatedReply: string
  classification: string | null
  confidence: number | null
  requiresHumanReview: boolean
  reason: string | null
  status: string
  createdAt: string
}

interface Thread {
  id: string
  rootCommentId: string
  commenterUsername: string
  productName: string | null
  productUrl: string
  ownProductId: string | null
  commentUrl: string | null
  threadStatus: string
  lastCommentAt: string | null
  messages: Message[]
  drafts: Draft[]
}

export function EngagementSection({ productUrl }: { productUrl?: string }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [ownProducts, setOwnProducts] = useState<OwnProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pairToken, setPairToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [generatingForThread, setGeneratingForThread] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedOwnProductId, setSelectedOwnProductId] = useState<string>('all')
  const [isGlobalPaused, setIsGlobalPaused] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'threads' | 'own_products'>('threads')

  const fetchOwnProducts = async () => {
    try {
      const res = await fetch('/api/engagement/own-products')
      if (res.ok) {
        const data = await res.json()
        setOwnProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch own products:', err)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/engagement/settings')
      if (res.ok) {
        const data = await res.json()
        setIsGlobalPaused(Boolean(data.globalPaused))
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const fetchThreads = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        if (filterStatus === 'needs_review') {
          params.set('needs_review', 'true')
        } else {
          params.set('status', filterStatus)
        }
      }

      if (selectedOwnProductId !== 'all') {
        const matched = ownProducts.find((p) => p.id === selectedOwnProductId)
        if (matched) params.set('product_url', matched.productUrl)
      }

      const res = await fetch(`/api/engagement/threads?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch (err) {
      console.error('Failed to fetch engagement threads:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOwnProducts()
    fetchSettings()
  }, [])

  useEffect(() => {
    fetchThreads()
  }, [filterStatus, selectedOwnProductId])

  const handleToggleGlobalPause = async () => {
    try {
      const nextState = !isGlobalPaused
      const res = await fetch('/api/engagement/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalPaused: nextState }),
      })
      if (res.ok) {
        setIsGlobalPaused(nextState)
      }
    } catch (err: any) {
      alert(`Failed to toggle global pause: ${err.message}`)
    }
  }

  const handleGeneratePairToken = async () => {
    try {
      const res = await fetch('/api/engagement/extension/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: 'Web Dashboard Pairing' }),
      })
      const data = await res.json()
      if (data.token) {
        setPairToken(data.token)
      } else {
        alert(data.error || 'Failed to generate pairing token')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleCopyToken = () => {
    if (!pairToken) return
    navigator.clipboard.writeText(pairToken)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  const handleGenerateReply = async (threadId: string, messageId?: string) => {
    try {
      setGeneratingForThread(threadId)
      const res = await fetch('/api/engagement/replies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, targetMessageId: messageId }),
      })
      const data = await res.json()
      if (res.ok && data.draft) {
        await fetchThreads()
      } else {
        alert(data.error || 'Failed to generate reply draft')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setGeneratingForThread(null)
    }
  }

  const handleApproveDraft = async (draftId: string) => {
    try {
      setActionLoading(draftId)
      const res = await fetch(`/api/engagement/replies/${draftId}/approve`, {
        method: 'POST',
      })
      if (res.ok) {
        await fetchThreads()
      } else {
        const data = await res.json()
        alert(data.error || 'Approval failed')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectDraft = async (draftId: string) => {
    const reason = prompt('Reason for dismissing this reply draft:', 'Manual author response')
    if (!reason) return

    try {
      setActionLoading(draftId)
      const res = await fetch(`/api/engagement/replies/${draftId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        await fetchThreads()
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleIgnoreThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/engagement/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadStatus: 'ignored' }),
      })
      if (res.ok) {
        await fetchThreads()
      }
    } catch (err: any) {
      alert(`Error ignoring thread: ${err.message}`)
    }
  }

  const getClassificationBadge = (cls?: string | null) => {
    const text = cls || 'General'
    let color = 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    switch (cls?.toLowerCase()) {
      case 'appreciation':
        color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
        break
      case 'pre-sale':
        color = 'bg-blue-500/20 text-blue-400 border-blue-500/40'
        break
      case 'feature request':
        color = 'bg-purple-500/20 text-purple-400 border-purple-500/40'
        break
      case 'technical question':
      case 'compatibility':
        color = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
        break
      case 'installation problem':
      case 'bug report':
        color = 'bg-amber-500/20 text-amber-400 border-amber-500/40'
        break
      case 'refund request':
      case 'complaint':
        color = 'bg-rose-500/20 text-rose-400 border-rose-500/40'
        break
    }
    return (
      <Badge variant="outline" className={`text-[10px] uppercase font-mono px-2 py-0.5 ${color}`}>
        {text}
      </Badge>
    )
  }

  const needsReplyCount = threads.filter((t) => t.threadStatus === 'needs_reply').length
  const pendingReviewDraftsCount = threads.flatMap((t) => t.drafts || []).filter((d) => d.status === 'needs_review').length
  const verifiedProductsCount = ownProducts.filter((p) => p.verificationStatus === 'verified').length

  return (
    <div className="space-y-4">
      {/* Extension Header & Hub Card */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-card to-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${isGlobalPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Envato Comment Assistant (ECA)
                </h3>
                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                  Strict Own-Product Mode
                </Badge>
                {isGlobalPaused && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/10">
                    ⏸️ Globally Paused
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Activates <strong>exclusively</strong> on your verified Envato products. Competitor pages, general listings, and unverified URLs are permanently blocked.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant={isGlobalPaused ? 'default' : 'outline'}
                size="sm"
                className={`text-xs h-8 gap-1.5 ${
                  isGlobalPaused
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-amber-500/40 text-amber-300 hover:bg-amber-950/40'
                }`}
                onClick={handleToggleGlobalPause}
              >
                {isGlobalPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {isGlobalPaused ? 'Resume Assistant' : 'Pause Assistant'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                onClick={handleGeneratePairToken}
              >
                <Key className="h-3.5 w-3.5" />
                {pairToken ? 'Regenerate Token' : 'Pair Chrome Extension'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                asChild
              >
                <a href="/test-envato-page.html" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Test Mock Page
                </a>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 gap-1"
                onClick={() => {
                  fetchThreads()
                  fetchOwnProducts()
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Token Display Banner if generated */}
          {pairToken && (
            <div className="mt-3 p-3 bg-indigo-950/50 border border-indigo-500/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-mono text-indigo-200 truncate select-all">
                Token: <span className="text-white font-bold">{pairToken}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs h-7 gap-1"
                  onClick={handleCopyToken}
                >
                  <Copy className="h-3 w-3" />
                  {tokenCopied ? 'Copied!' : 'Copy Token'}
                </Button>
                <span className="text-[11px] text-muted-foreground">Paste into extension popup</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border bg-card/60 p-3">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Verified Own Products</div>
          <div className="text-lg font-bold text-foreground mt-1 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            {verifiedProductsCount}
          </div>
          <div className="text-[10px] text-muted-foreground">{ownProducts.length} total registered</div>
        </Card>

        <Card className="border-border bg-card/60 p-3">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Own Product Threads</div>
          <div className="text-lg font-bold text-foreground mt-1">{threads.length}</div>
          <div className="text-[10px] text-muted-foreground">Zero competitor comments</div>
        </Card>

        <Card className="border-border bg-card/60 p-3">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">Needs Reply</div>
          <div className="text-lg font-bold text-amber-400 mt-1">{needsReplyCount}</div>
          <div className="text-[10px] text-muted-foreground">Awaiting author response</div>
        </Card>

        <Card className="border-border bg-card/60 p-3">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground">AI Drafts Ready</div>
          <div className="text-lg font-bold text-indigo-400 mt-1">{pendingReviewDraftsCount}</div>
          <div className="text-[10px] text-muted-foreground">Awaiting author review</div>
        </Card>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === 'threads' ? 'secondary' : 'ghost'}
            className="text-xs h-8 gap-1.5 font-medium"
            onClick={() => setActiveTab('threads')}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Own Product Comments ({threads.length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'own_products' ? 'secondary' : 'ghost'}
            className="text-xs h-8 gap-1.5 font-medium"
            onClick={() => setActiveTab('own_products')}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Own Envato Products ({ownProducts.length})
          </Button>
        </div>

        {activeTab === 'threads' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Own Product Filter Dropdown */}
            {ownProducts.length > 0 && (
              <select
                value={selectedOwnProductId}
                onChange={(e) => setSelectedOwnProductId(e.target.value)}
                className="text-xs bg-muted/60 border border-border rounded px-2 py-1 text-foreground"
              >
                <option value="all">All Own Products</option>
                {ownProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} ({p.verificationStatus})
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'needs_reply', label: 'Unanswered' },
                { id: 'needs_review', label: 'Needs Review' },
                { id: 'replied', label: 'Replied' },
                { id: 'ignored', label: 'Ignored' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id)}
                  className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${
                    filterStatus === filter.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Own Products Configuration */}
      {activeTab === 'own_products' && (
        <OwnProductsManager
          onProductUpdated={() => {
            fetchOwnProducts()
            fetchThreads()
          }}
        />
      )}

      {/* Tab 2: Own Products Threads & AI Replies Feed */}
      {activeTab === 'threads' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 opacity-60" />
              Loading own product threads...
            </div>
          ) : threads.length === 0 ? (
            <Card className="border-border border-dashed p-8 text-center bg-card/30">
              <ShieldCheck className="h-8 w-8 mx-auto text-emerald-400/60 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">No Own Product Comments Synchronized</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                ECA is strictly active on your verified products. To begin, ensure you have registered and verified your Envato product in the "Own Envato Products" tab, then open your product discussion page in Chrome.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setActiveTab('own_products')}
                >
                  <Settings2 className="h-3 w-3 mr-1" /> Manage Own Products
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  asChild
                >
                  <a href="/test-envato-page.html" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Open Test Mock Page
                  </a>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {threads.map((thread) => {
                const activeDraft = thread.drafts?.[0]
                const latestCustomerMsg = [...thread.messages].reverse().find((m) => m.authorType === 'customer')

                return (
                  <Card key={thread.id} className="border-border bg-card">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {thread.commenterUsername}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                thread.threadStatus === 'needs_reply'
                                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                  : thread.threadStatus === 'ignored'
                                  ? 'border-slate-500/40 text-slate-400 bg-slate-500/10'
                                  : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                              }`}
                            >
                              {thread.threadStatus.replace('_', ' ')}
                            </Badge>
                            {activeDraft?.classification && getClassificationBadge(activeDraft.classification)}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground/80">{thread.productName || 'Verified Own Product'}</span>
                            <span>•</span>
                            <span>{thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}</span>
                            {thread.commentUrl && (
                              <>
                                <span>•</span>
                                <a
                                  href={thread.commentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                  Open on Envato <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {thread.threadStatus !== 'ignored' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => handleIgnoreThread(thread.id)}
                              title="Ignore this thread"
                            >
                              <EyeOff className="h-3 w-3" /> Ignore
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1 border-indigo-500/40 text-indigo-300"
                            onClick={() => handleGenerateReply(thread.id, latestCustomerMsg?.id)}
                            disabled={generatingForThread === thread.id}
                          >
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            {generatingForThread === thread.id ? 'Analyzing...' : activeDraft ? 'Re-draft' : 'Generate Reply'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      {/* Thread Messages History */}
                      <div className="space-y-2 border-l-2 border-border pl-3 my-2 text-xs">
                        {thread.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded ${
                              m.authorType === 'seller'
                                ? 'bg-emerald-950/20 border border-emerald-500/20'
                                : 'bg-muted/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                              <span className={m.authorType === 'seller' ? 'text-emerald-400 font-bold' : 'text-foreground'}>
                                {m.authorUsername} {m.authorType === 'seller' ? '(You - Verified Author)' : ''}
                              </span>
                              <span className="font-normal text-[10px]">
                                {m.messageCreatedAt ? new Date(m.messageCreatedAt).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{m.messageText}</p>
                          </div>
                        ))}
                      </div>

                      {/* AI Draft Card */}
                      {activeDraft && (
                        <div className="mt-3 p-3 bg-gradient-to-b from-indigo-950/20 to-card border border-indigo-500/30 rounded-lg space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-300 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                AI Drafted Response (Verified Own Product Context)
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({Math.round((activeDraft.confidence || 0.85) * 100)}% confidence)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] capitalize ${
                                  activeDraft.status === 'approved'
                                    ? 'border-emerald-500/40 text-emerald-400'
                                    : activeDraft.status === 'rejected'
                                    ? 'border-rose-500/40 text-rose-400'
                                    : 'border-amber-500/40 text-amber-400'
                                }`}
                              >
                                {activeDraft.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          <div className="p-2.5 bg-background/80 border border-border rounded text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                            {activeDraft.generatedReply}
                          </div>

                          {activeDraft.reason && (
                            <div className="text-[11px] text-muted-foreground italic">
                              Context: {activeDraft.reason}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                            <div className="flex items-center gap-1 text-[11px] text-amber-400/90">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Auto-posting disabled. Manual author approval & click required on Envato.</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {activeDraft.status === 'needs_review' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleApproveDraft(activeDraft.id)}
                                    disabled={actionLoading === activeDraft.id}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Approve Draft
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 gap-1 text-rose-400 hover:bg-rose-950/30"
                                    onClick={() => handleRejectDraft(activeDraft.id)}
                                    disabled={actionLoading === activeDraft.id}
                                  >
                                    <XCircle className="h-3 w-3" /> Dismiss
                                  </Button>
                                </>
                              )}
                              {activeDraft.status === 'approved' && (
                                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved — Ready to insert via Chrome Extension
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
