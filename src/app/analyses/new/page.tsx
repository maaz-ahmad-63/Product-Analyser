'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Layers,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Globe,
  Building,
  Sparkles,
  Search,
  DollarSign,
  Star,
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  Swords,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface ModuleOption {
  id: string
  label: string
  description: string
  icon: any
}

interface AmazonModuleOption {
  id: string
  label: string
  items: string[]
  underlyingModules: string[]
  icon: any
}

const AVAILABLE_MODULES: ModuleOption[] = [
  {
    id: 'product_intelligence',
    label: 'Product Intelligence',
    description: 'Feature matrix, positioning differences, and core tech stack analysis',
    icon: Sparkles,
  },
  {
    id: 'seo',
    label: 'SEO',
    description: 'On-page keyword strategies, H1-H3 structures, meta tags, and ranking gaps',
    icon: Search,
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Pricing tiers, commercial models, sales velocity, and revenue estimates',
    icon: DollarSign,
  },
  {
    id: 'reviews',
    label: 'Reviews',
    description: 'Public buyer ratings, star distributions, and critical review sentiments',
    icon: Star,
  },
  {
    id: 'comments',
    label: 'Comments/Sentiment',
    description: 'Community questions, customer complaint topics, and recurring pain points',
    icon: MessageSquare,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    description: 'AI-generated tactical recommendations, competitive gaps, and outreach plays',
    icon: TrendingUp,
  },
]

import { AMAZON_MODULES } from '@/components/analyses/amazon-modules'

export default function NewAnalysisPage() {
  const router = useRouter()

  // Form State
  const [analysisName, setAnalysisName] = useState('')
  const [platform, setPlatform] = useState<'envato' | 'amazon' | 'generic'>('envato')
  const [myProductUrl, setMyProductUrl] = useState('')
  const [myProductName, setMyProductName] = useState('')
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([''])
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'product_intelligence',
    'seo',
    'sales',
    'reviews',
    'comments',
    'opportunities',
  ])

  // Status & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Platform Change
  const handlePlatformChange = (p: 'envato' | 'amazon' | 'generic') => {
    setPlatform(p)
    setError(null)
    if (p === 'amazon') {
      setSelectedModules([
        'product_intelligence',
        'reviews',
        'comments',
        'sales',
        'seo',
        'opportunities',
      ])
    } else {
      setSelectedModules([
        'product_intelligence',
        'seo',
        'sales',
        'reviews',
        'comments',
        'opportunities',
      ])
    }
  }

  // URL Change with auto platform detection
  const handleMyProductUrlChange = (val: string) => {
    setMyProductUrl(val)
    const lower = val.toLowerCase()
    if (lower.includes('amazon.') || lower.includes('amzn.')) {
      if (platform !== 'amazon') handlePlatformChange('amazon')
    } else if (lower.includes('codecanyon.net') || lower.includes('themeforest.net')) {
      if (platform !== 'envato') handlePlatformChange('envato')
    }
  }

  // Competitor URL controls
  const handleAddCompetitor = () => {
    if (competitorUrls.length >= 6) {
      setError('You can compare up to 6 competitor URLs in a single analysis.')
      return
    }
    setError(null)
    setCompetitorUrls([...competitorUrls, ''])
  }

  const handleRemoveCompetitor = (index: number) => {
    if (competitorUrls.length <= 1) return
    setCompetitorUrls(competitorUrls.filter((_, i) => i !== index))
  }

  const handleCompetitorChange = (index: number, val: string) => {
    const updated = [...competitorUrls]
    updated[index] = val
    setCompetitorUrls(updated)
  }

  // Standard Module toggle (Envato / Generic)
  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      if (selectedModules.length === 1) {
        setError('At least one module must be selected.')
        return
      }
      setSelectedModules(selectedModules.filter((m) => m !== id))
    } else {
      setError(null)
      setSelectedModules([...selectedModules, id])
    }
  }

  // Amazon High-Level Module helpers
  const isAmazonModuleSelected = (amzMod: AmazonModuleOption) => {
    return amzMod.underlyingModules.some((m) => selectedModules.includes(m))
  }

  const toggleAmazonModule = (amzMod: AmazonModuleOption) => {
    const isSelected = isAmazonModuleSelected(amzMod)
    if (isSelected) {
      const remaining = selectedModules.filter((m) => !amzMod.underlyingModules.includes(m))
      if (remaining.length === 0) {
        setError('At least one intelligence module must be selected.')
        return
      }
      setError(null)
      setSelectedModules(remaining)
    } else {
      setError(null)
      setSelectedModules(Array.from(new Set([...selectedModules, ...amzMod.underlyingModules])))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = analysisName.trim()
    const trimmedMyUrl = myProductUrl.trim()
    const cleanCompetitors = competitorUrls.map((u) => u.trim()).filter(Boolean)

    if (!trimmedName) {
      setError('Please provide an Analysis Name.')
      return
    }

    if (!trimmedMyUrl) {
      setError('Please provide your Product URL.')
      return
    }

    if (cleanCompetitors.length === 0) {
      setError('Please provide at least one competitor URL.')
      return
    }

    // URL format checks
    const isValidUrl = (urlStr: string) => {
      try {
        const u = new URL(urlStr)
        return u.protocol === 'http:' || u.protocol === 'https:'
      } catch {
        return false
      }
    }

    if (!isValidUrl(trimmedMyUrl)) {
      setError('Please enter a valid URL for My Product (starting with http:// or https://).')
      return
    }

    for (const compUrl of cleanCompetitors) {
      if (!isValidUrl(compUrl)) {
        setError(`Invalid competitor URL: "${compUrl}". Must start with http:// or https://.`)
        return
      }
    }

    // Duplicate checks
    const normMy = trimmedMyUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
    const normComps = cleanCompetitors.map((u) =>
      u.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
    )

    if (normComps.includes(normMy)) {
      setError('Your own product URL cannot also be listed as a competitor.')
      return
    }

    const compSet = new Set(normComps)
    if (compSet.size !== normComps.length) {
      setError('Duplicate competitor URLs detected. Please provide distinct URLs.')
      return
    }

    setIsSubmitting(true)
    setSubmitProgress('Initializing analysis and preparing collectors...')

    const timer1 = setTimeout(() => {
      setSubmitProgress('Extracting website telemetry, feature specs, and pricing...')
    }, 3000)

    const timer2 = setTimeout(() => {
      setSubmitProgress('Running SEO audits, sentiment analysis, and opportunity models...')
    }, 8000)

    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          platform,
          ownProduct: {
            url: trimmedMyUrl,
            name: myProductName.trim() || undefined,
          },
          competitors: cleanCompetitors.map((url) => ({ url })),
          selectedModules,
        }),
      })

      clearTimeout(timer1)
      clearTimeout(timer2)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create analysis')
      }

      // Route to view analysis workspace
      router.push(`/analyses/${data.analysisId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during creation'
      setError(msg)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/analyses"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Analyses</span>
        </Link>
      </div>

      {/* Title Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span>New Product Intelligence Analysis</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Configure a dedicated analysis project to track your product against competitors.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Analysis Name & Platform */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              1. General Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Give your analysis a recognizable name and select the target marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Analysis Name */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Analysis Name <span className="text-rose-400">*</span>
              </label>
              <Input
                placeholder="e.g. RideOn vs Apex Booking, or CRM Market Overview Q4"
                value={analysisName}
                onChange={(e) => setAnalysisName(e.target.value)}
                className="text-xs h-9"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Platform <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handlePlatformChange('envato')}
                  disabled={isSubmitting}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    platform === 'envato'
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Building className={`h-4 w-4 mt-0.5 ${platform === 'envato' ? 'text-primary' : ''}`} />
                  <div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <span>Envato</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 text-emerald-400 border-emerald-500/20">Active</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      CodeCanyon, ThemeForest with live sales, comments, and rating telemetry.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlatformChange('amazon')}
                  disabled={isSubmitting}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    platform === 'amazon'
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <ShoppingCart className={`h-4 w-4 mt-0.5 ${platform === 'amazon' ? 'text-primary' : ''}`} />
                  <div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <span>Amazon</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 text-amber-400 border-amber-500/20">Active</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Amazon listings with BSR, verified reviews, bullet features, and sentiment.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlatformChange('generic')}
                  disabled={isSubmitting}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    platform === 'generic'
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Globe className={`h-4 w-4 mt-0.5 ${platform === 'generic' ? 'text-primary' : ''}`} />
                  <div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <span>Other / Generic</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 text-sky-400 border-sky-500/20">Web Scraper</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Any public SaaS product landing page, web application, or custom domain.
                    </p>
                  </div>
                </button>
              </div>

              {/* Planned Connectors (Architectural Stubs) */}
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground font-medium block mb-2">
                  Planned Platform Connectors
                </span>
                <div className="grid grid-cols-3 gap-2 opacity-60">
                  {['Shopify App Store', 'Chrome Web Store', 'WordPress Plugins'].map((plat) => (
                    <div
                      key={plat}
                      className="p-2 rounded border border-dashed border-border bg-muted/20 text-center select-none cursor-not-allowed"
                      title="Platform connector not available yet."
                    >
                      <span className="block text-[11px] font-medium text-foreground truncate">{plat}</span>
                      <span className="text-[9px] text-amber-400/90 font-mono">Not available yet</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: My Product */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              2. My Product
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {platform === 'amazon'
                ? "Specify your Amazon product listing URL (amazon.com/dp/... or amzn.to/...)."
                : "Specify your product's landing page or marketplace listing URL."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Product URL <span className="text-rose-400">*</span>
              </label>
              <Input
                type="url"
                placeholder={
                  platform === 'amazon'
                    ? 'https://www.amazon.com/dp/B0CX234XYZ or https://amzn.to/3example'
                    : platform === 'envato'
                    ? 'https://codecanyon.net/item/rideon-taxi-booking/59633641'
                    : 'https://mysaasproduct.com'
                }
                value={myProductUrl}
                onChange={(e) => handleMyProductUrlChange(e.target.value)}
                className="text-xs h-9 font-mono"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Optional Product Name
              </label>
              <Input
                placeholder={
                  platform === 'amazon'
                    ? 'e.g. Echo Show 8 or Anker Wireless Charger (auto-detected if empty)'
                    : 'e.g. RideOn Taxi Booking (defaults to detected title if empty)'
                }
                value={myProductName}
                onChange={(e) => setMyProductName(e.target.value)}
                className="text-xs h-9"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Competitors */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                3. Competitors
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {platform === 'amazon'
                  ? 'Add 1 or more Amazon competitor product URLs to benchmark against.'
                  : 'Add 1 or more competitor URLs to benchmark against.'}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCompetitor}
              disabled={isSubmitting || competitorUrls.length >= 6}
              className="text-xs gap-1 h-7"
            >
              <Plus className="h-3 w-3" />
              <span>Add Competitor</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {competitorUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder={
                      platform === 'amazon'
                        ? `https://www.amazon.com/dp/B0D1234ABC`
                        : platform === 'envato'
                        ? `https://codecanyon.net/item/competitor-item/${idx + 1}`
                        : `https://competitor-${idx + 1}.com`
                    }
                    value={url}
                    onChange={(e) => handleCompetitorChange(idx, e.target.value)}
                    className="text-xs h-9 font-mono"
                    disabled={isSubmitting}
                    required={idx === 0}
                  />
                </div>
                {competitorUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCompetitor(idx)}
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-rose-400 h-9 w-9 p-0"
                    title="Remove competitor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground pt-1">
              Tip: You can compare up to 6 competitors simultaneously.
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: Modules Selection */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  4. Intelligence Modules
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {platform === 'amazon'
                    ? 'Select the high-level intelligence dimensions to analyze across Amazon listings.'
                    : 'Choose the analytical dimensions to extract and evaluate.'}
                </CardDescription>
              </div>
              {platform === 'amazon' && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                  Amazon 5-Module Pack
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {platform === 'amazon' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                  <span>Select which of the 5 Amazon intelligence modules to include:</span>
                  <span className="font-mono text-[11px] text-primary">
                    {AMAZON_MODULES.filter(isAmazonModuleSelected).length} of 5 Active
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AMAZON_MODULES.map((mod, idx) => {
                    const isSelected = isAmazonModuleSelected(mod)
                    const Icon = mod.icon
                    const isLast = idx === AMAZON_MODULES.length - 1
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleAmazonModule(mod)}
                        disabled={isSubmitting}
                        className={`flex flex-col p-3.5 rounded-lg border text-left transition-all relative ${
                          isLast ? 'sm:col-span-2' : ''
                        } ${
                          isSelected
                            ? 'border-primary/70 bg-primary/5 text-foreground ring-1 ring-primary/25 shadow-xs'
                            : 'border-border bg-background/50 hover:bg-muted/30 text-muted-foreground opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-6 w-6 rounded flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-semibold text-xs text-foreground block">
                              {idx + 1}. {mod.label}
                            </span>
                          </div>
                          {isSelected ? (
                            <Badge
                              variant="default"
                              className="text-[9px] h-4 px-1.5 bg-primary/20 text-primary border border-primary/40 font-mono"
                            >
                              Active
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Off
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-border/40 w-full">
                          <ul
                            className={`text-[11px] text-muted-foreground ${
                              isLast
                                ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1'
                                : 'space-y-1'
                            }`}
                          >
                            {mod.items.map((item, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span
                                  className={`h-1 w-1 rounded-full shrink-0 ${
                                    isSelected ? 'bg-primary/80' : 'bg-muted-foreground/40'
                                  }`}
                                />
                                <span className={isSelected ? 'text-foreground/90' : ''}>
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map((mod) => {
                  const isSelected = selectedModules.includes(mod.id)
                  const Icon = mod.icon
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      disabled={isSubmitting}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary/60 bg-primary/5 text-foreground'
                          : 'border-border bg-background/50 hover:bg-muted/30 text-muted-foreground opacity-60'
                      }`}
                    >
                      <div
                        className={`h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground">
                            {mod.label}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                          {mod.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 5: Submit Action */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full sm:w-80 h-11 text-sm font-semibold bg-primary gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Create Analysis</span>
              </>
            )}
          </Button>

          {isSubmitting && (
            <p className="text-xs text-muted-foreground text-center animate-pulse">
              {submitProgress}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
