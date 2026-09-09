'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  Power,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react'

export interface OwnProductItem {
  id: string
  productUrl: string
  productName: string
  envatoItemId: string
  authorUsername: string | null
  verificationStatus: string
  verificationMethod: string | null
  verificationToken: string | null
  verifiedAt: string | null
  enabled: boolean
  documentationUrl: string | null
  supportPolicy: string | null
  _count?: {
    threads: number
  }
}

export function OwnProductsManager({ onProductUpdated }: { onProductUpdated?: () => void }) {
  const [products, setProducts] = useState<OwnProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [verifyingProduct, setVerifyingProduct] = useState<OwnProductItem | null>(null)
  const [productToDelete, setProductToDelete] = useState<OwnProductItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)

  // Form State
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newDocs, setNewDocs] = useState('')
  const [newPolicy, setNewPolicy] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/engagement/own-products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch own products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!newUrl) {
      setError('Product URL is required')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/engagement/own-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: newUrl,
          productName: newName || undefined,
          documentationUrl: newDocs || undefined,
          supportPolicy: newPolicy || undefined,
          authorUsername: newAuthor || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to register own product')
        return
      }

      // Reset form
      setNewUrl('')
      setNewName('')
      setNewDocs('')
      setNewPolicy('')
      setNewAuthor('')
      setShowAddForm(false)
      await fetchProducts()
      if (onProductUpdated) onProductUpdated()
    } catch (err: any) {
      setError(err.message || 'Error submitting product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (product: OwnProductItem, authorUsername?: string) => {
    try {
      setVerifyError(null)
      const res = await fetch(`/api/engagement/own-products/${product.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'author_claim',
          authorUsername: authorUsername || product.authorUsername || 'Verified Author',
        }),
      })

      if (res.ok) {
        setVerifyingProduct(null)
        await fetchProducts()
        if (onProductUpdated) onProductUpdated()
      } else {
        const data = await res.json().catch(() => ({}))
        setVerifyError(data.error || 'Verification failed')
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Verification failed')
    }
  }

  const handleToggle = async (product: OwnProductItem) => {
    try {
      const nextEnabled = !product.enabled
      // Optimistic local update
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, enabled: nextEnabled } : p))
      )
      const res = await fetch(`/api/engagement/own-products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      if (res.ok) {
        await fetchProducts()
        if (onProductUpdated) onProductUpdated()
      } else {
        await fetchProducts()
      }
    } catch (err: any) {
      console.error('Failed to toggle product:', err)
      await fetchProducts()
    }
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    const id = productToDelete.id
    try {
      setDeleteLoading(true)
      setActionError(null)
      const res = await fetch(`/api/engagement/own-products/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        // Optimistically remove immediately from local list
        setProducts((prev) => prev.filter((p) => p.id !== id))
        setProductToDelete(null)
        if (onProductUpdated) onProductUpdated()
      } else {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Failed to remove product')
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove product')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Card className="border-indigo-500/30 bg-card">
      <CardHeader className="p-4 pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm font-bold text-foreground">
                Verified Own Envato Products
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/40 text-emerald-400">
                Strict Boundary Enforced
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              The Comment Assistant activates <strong>exclusively</strong> on products verified here. Competitor URLs and unapproved listings are permanently blocked.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="text-xs h-7 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddForm ? 'Cancel' : 'Add Own Product'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={fetchProducts}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Add Product Inline Form */}
        {showAddForm && (
          <form onSubmit={handleAddProduct} className="p-3 bg-muted/40 border border-border rounded-lg space-y-3 text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-indigo-400" />
              Register New Own Envato Product
            </div>

            {error && (
              <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Envato Product URL *
                </label>
                <Input
                  type="url"
                  placeholder="https://codecanyon.net/item/my-item-name/12345678"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Product Name (Display Title)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Taxido Taxi Booking App"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Documentation URL (for AI Knowledge)
                </label>
                <Input
                  type="url"
                  placeholder="https://docs.mycompany.com/taxido"
                  value={newDocs}
                  onChange={(e) => setNewDocs(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Author / Seller Username
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Pixelstrap"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Support & Refund Policy Summary (for AI Reply generation)
              </label>
              <Input
                type="text"
                placeholder="e.g. Standard Envato 6-month support. Free bug fixes. Refunds handled via Envato support."
                value={newPolicy}
                onChange={(e) => setNewPolicy(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Save as Pending Product'}
              </Button>
            </div>
          </form>
        )}

        {/* Products List */}
        {products.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-lg bg-card/40">
            <Lock className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
            <h4 className="text-xs font-semibold text-foreground">No Own Envato Products Configured</h4>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto mt-1 mb-3">
              Add your CodeCanyon or ThemeForest product above to activate the Comment Assistant. The assistant will never run on competitor listings.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Your First Product
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/60 hover:bg-card/80 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{p.productName}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      ID: {p.envatoItemId}
                    </Badge>
                    {p.authorUsername && (
                      <Badge variant="secondary" className="text-[10px]">
                        Author: {p.authorUsername}
                      </Badge>
                    )}
                    {p.verificationStatus === 'verified' ? (
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                        ✓ Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-500/40 text-amber-400 bg-amber-500/10">
                        Pending Verification
                      </Badge>
                    )}
                    {!p.enabled && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                        Disabled
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <a
                      href={p.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-primary inline-flex items-center gap-1"
                    >
                      {p.productUrl} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    {p.verifiedAt && (
                      <span>Verified: {new Date(p.verifiedAt).toLocaleDateString()}</span>
                    )}
                    <span>{p._count?.threads || 0} active thread{(p._count?.threads || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.verificationStatus === 'pending' && (
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => setVerifyingProduct(p)}
                    >
                      Verify Ownership
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant={p.enabled ? 'secondary' : 'outline'}
                    className="text-xs h-7 gap-1"
                    onClick={() => handleToggle(p)}
                    title={p.enabled ? 'Disable ECA for this product' : 'Enable ECA for this product'}
                  >
                    <Power className={`h-3 w-3 ${p.enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                    onClick={() => {
                      setActionError(null)
                      setProductToDelete(p)
                    }}
                    title="Remove product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verification Modal / Dialog */}
        {verifyingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Verify Product Ownership
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {verifyingProduct.productName}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground"
                  onClick={() => setVerifyingProduct(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-1 text-amber-200">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    Strict Ownership Rule:
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    ECA requires positive author confirmation before reading comments or drafting replies. You must be the genuine author or authorized manager of this item.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Author / Team Username
                  </label>
                  <Input
                    type="text"
                    defaultValue={verifyingProduct.authorUsername || 'Pixelstrap'}
                    id="verifyAuthorInput"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Ownership Verification Nonce
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono p-1.5 bg-background border border-border rounded flex-1 truncate select-all">
                      {verifyingProduct.verificationToken || 'eca_verify_active'}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(verifyingProduct.verificationToken || '')
                        setCopiedToken(true)
                        setTimeout(() => setCopiedToken(false), 2000)
                      }}
                    >
                      {copiedToken ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {verifyError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-8"
                  onClick={() => {
                    setVerifyingProduct(null)
                    setVerifyError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => {
                    const input = document.getElementById('verifyAuthorInput') as HTMLInputElement
                    handleVerify(verifyingProduct, input?.value)
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm & Verify Ownership
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* In-App Delete Confirmation Modal */}
        {productToDelete && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-rose-500/30 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Remove Own Product?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Are you sure you want to remove <strong className="text-foreground">{productToDelete.productName}</strong> from your verified own products?
                  </p>
                </div>
              </div>

              <div className="p-3 bg-muted/40 border border-border/70 rounded-lg space-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground font-mono truncate">
                  <ExternalLink className="h-3 w-3 shrink-0 text-indigo-400" />
                  <span className="truncate">{productToDelete.productUrl}</span>
                </div>
                <p className="text-amber-400/90 flex items-center gap-1.5 text-[11px] pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>The Chrome Extension will immediately stop tracking or responding to comments on this product page.</span>
                </p>
              </div>

              {actionError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-8"
                  disabled={deleteLoading}
                  onClick={() => {
                    setProductToDelete(null)
                    setActionError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-medium"
                  disabled={deleteLoading}
                  onClick={handleConfirmDelete}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Product
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
