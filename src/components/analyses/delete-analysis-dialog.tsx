'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'

interface DeleteAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisId: string
  analysisName: string
  onDeleted: () => void
}

export function DeleteAnalysisDialog({
  open,
  onOpenChange,
  analysisId,
  analysisName,
  onDeleted,
}: DeleteAnalysisDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Target confirmation text (trimmed)
  const targetConfirmation = analysisName.trim()
  const isMatch =
    confirmInput.trim().toLowerCase() === targetConfirmation.toLowerCase()

  const handleDelete = async () => {
    if (!isMatch || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/analyses/${analysisId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmInput.trim() }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || `Failed to delete analysis (${res.status})`)
      }

      // Reset and notify parent
      setConfirmInput('')
      onOpenChange(false)
      onDeleted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deletion failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (newOpen: boolean) => {
    if (!loading) {
      setConfirmInput('')
      setError(null)
      onOpenChange(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-border bg-card p-5 gap-4">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2 text-rose-500 font-semibold text-sm">
            <div className="h-7 w-7 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Delete Analysis Workspace
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            This action is <strong className="text-foreground">permanent and cannot be undone</strong>.
            All associated product intelligence, competitor snapshots, customer complaints,
            detected opportunities, and activity tracking will be permanently deleted from the database.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-2.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        <div className="space-y-2 pt-1 text-xs">
          <label className="text-muted-foreground block text-[11px]">
            To confirm permanent deletion, please type{' '}
            <strong className="text-foreground font-mono select-all bg-muted/60 px-1 py-0.5 rounded">
              {targetConfirmation}
            </strong>
          </label>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={targetConfirmation}
            disabled={loading}
            className="h-8 text-xs font-mono bg-muted/30 border-border focus-visible:ring-rose-500"
            autoFocus
          />
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={loading}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={!isMatch || loading}
            className="h-8 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Permanently Delete</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
