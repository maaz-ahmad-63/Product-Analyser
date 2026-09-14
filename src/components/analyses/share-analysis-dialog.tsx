'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Globe, Copy, Check, ExternalLink, Loader2, Lock, Share2 } from 'lucide-react'

interface ShareAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisId: string
  analysisName: string
  initialShareEnabled?: boolean
  initialShareToken?: string | null
  onShareUpdated?: (enabled: boolean, token: string | null) => void
}

export function ShareAnalysisDialog({
  open,
  onOpenChange,
  analysisId,
  analysisName,
  initialShareEnabled = false,
  initialShareToken = null,
  onShareUpdated,
}: ShareAnalysisDialogProps) {
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled)
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setShareEnabled(initialShareEnabled)
    setShareToken(initialShareToken)
  }, [initialShareEnabled, initialShareToken])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = shareToken ? `${origin}/report/${shareToken}` : ''

  const handleToggleShare = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyses/${analysisId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareEnabled: !shareEnabled }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update share status')
      }

      setShareEnabled(data.shareEnabled)
      setShareToken(data.shareToken)
      if (onShareUpdated) {
        onShareUpdated(data.shareEnabled, data.shareToken)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating share settings')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card p-5 gap-4">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Share Executive Report
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Generate an unauthenticated public link for <strong className="text-foreground">{analysisName}</strong>.
            External executives and team members can view the read-only report containing only selected modules.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-2.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Share Status Toggle Card */}
        <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Public Access</span>
              {shareEnabled ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 gap-1">
                  <Globe className="h-2.5 w-2.5" />
                  <span>Enabled</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] py-0 px-1.5 gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  <span>Disabled</span>
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {shareEnabled
                ? 'Anyone with the link can view this executive report.'
                : 'Report is private. Anyone visiting the link will see "Report unavailable."'}
            </p>
          </div>

          <Button
            size="sm"
            variant={shareEnabled ? 'outline' : 'default'}
            onClick={handleToggleShare}
            disabled={loading}
            className="h-8 text-xs shrink-0"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : shareEnabled ? (
              'Disable'
            ) : (
              'Enable Link'
            )}
          </Button>
        </div>

        {/* Public Link Box */}
        {shareEnabled && publicUrl && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span>Public Share URL</span>
              <span className="text-[10px] text-muted-foreground font-mono font-normal">
                Token: {shareToken}
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 h-8 text-xs font-mono bg-muted/40 border border-border rounded px-2.5 text-foreground truncate focus:outline-none select-all"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-8 text-xs px-2.5 gap-1"
                title="Copy Link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open in new tab">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-border flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
