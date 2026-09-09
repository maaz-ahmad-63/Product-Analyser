import * as cheerio from 'cheerio'
import { execFile } from 'child_process'
import path from 'path'
import { ExtractedProductData, PricingPlanExtracted, DiscoveredPage, EnvatoSalesData } from './types'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

const COMMON_INTEGRATIONS = [
  'Slack',
  'Stripe',
  'GitHub',
  'GitLab',
  'Zapier',
  'Segment',
  'Google Analytics',
  'HubSpot',
  'Salesforce',
  'Jira',
  'Discord',
  'Notion',
  'Figma',
  'Linear',
  'Mixpanel',
  'Shopify',
  'WordPress',
  'Intercom',
  'Zendesk',
  'AWS',
  'PostgreSQL',
  'Webhook',
  'REST API',
  'Flutter',
  'React Native',
  'Laravel',
  'Firebase',
  'Google Maps',
]

interface StealthScraperOutput {
  success: boolean
  url: string
  finalUrl: string
  title: string
  h1: string
  description: string
  productName: string
  priceText: string
  pricingPlans: PricingPlanExtracted[]
  features: string[]
  integrations: string[]
  tags: string[]
  specs: Record<string, string>
  html: string
  isEnvato?: boolean
  envatoSales?: EnvatoSalesData | null
  thumbnailUrl?: string | null
  headings?: { h1: string[]; h2: string[]; h3: string[] }
  imageAltsCount?: number
  demoLink?: string | null
  docsLink?: string | null
  changelogLink?: string | null
  comments?: Array<{
    author_name: string
    comment_text: string
    comment_date: string
    comment_url: string | null
    rating: number | null
  }>
  error?: string
}

async function runStealthScraper(url: string): Promise<StealthScraperOutput | null> {
  const scriptPath = path.join(process.cwd(), 'src', 'services', 'website-analyzer', 'stealth_scraper.py')
  return new Promise((resolve) => {
    execFile(
      'python3',
      [scriptPath, url],
      { timeout: 45000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          console.error(`Stealth scraper error for ${url}:`, err, stderr)
          resolve(null)
          return
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as StealthScraperOutput
          resolve(parsed.success ? parsed : null)
        } catch (parseErr) {
          console.error(`Stealth scraper parse error for ${url}:`, parseErr, stdout.slice(0, 200))
          resolve(null)
        }
      }
    )
  })
}

export function normalizeUrl(rawUrl: string): string {
  // Strip trailing punctuation (periods, commas, semicolons) that users accidentally paste
  let trimmed = rawUrl.trim().replace(/[.,;]+$/, '').trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`
  }
  try {
    const parsed = new URL(trimmed)
    // Remove trailing slash for consistency
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`
  } catch {
    throw new Error(`Invalid URL format: "${rawUrl}"`)
  }
}

async function fetchHtmlWithTimeout(url: string, timeoutMs = 12000): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return null
    }

    const html = await res.text()
    return { html, finalUrl: res.url || url }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

export async function collectWebsiteData(inputUrl: string): Promise<ExtractedProductData> {
  const normalized = normalizeUrl(inputUrl)
  const collectionErrors: string[] = []

  let mainHtml = ''
  let finalUrl = normalized
  let stealthResult: StealthScraperOutput | null = null

  const isProtectedDomain =
    normalized.includes('codecanyon.net') ||
    normalized.includes('themeforest.net') ||
    normalized.includes('envato.com')

  // 1. Fetch Main Landing Page (Use stealth for protected domains or as fallback)
  if (isProtectedDomain) {
    stealthResult = await runStealthScraper(normalized)
    if (stealthResult && stealthResult.html) {
      mainHtml = stealthResult.html
      finalUrl = stealthResult.finalUrl || normalized
    }
  }

  if (!mainHtml) {
    const mainRes = await fetchHtmlWithTimeout(normalized)
    if (mainRes && mainRes.html && !mainRes.html.includes('cf-mitigated') && !mainRes.html.includes('__cf_chl')) {
      mainHtml = mainRes.html
      finalUrl = mainRes.finalUrl
    } else {
      // Fallback to stealth scraper if standard fetch was blocked or timed out
      stealthResult = await runStealthScraper(normalized)
      if (stealthResult && stealthResult.html) {
        mainHtml = stealthResult.html
        finalUrl = stealthResult.finalUrl || normalized
      }
    }
  }

  if (!mainHtml) {
    collectionErrors.push(`Unable to reach main website at ${normalized} (request timed out or host blocked requests).`)
    return buildEmptyData(normalized, collectionErrors)
  }

  const $ = cheerio.load(mainHtml)

  // 2. Extract Basic Metadata
  const websiteTitle =
    stealthResult?.title ||
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    'Not found'

  const description =
    stealthResult?.description ||
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    'Not found on the provided website'

  let productName = stealthResult?.productName || ''
  if (!productName) {
    const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim()
    productName = ogSiteName || ''
  }
  if (!productName) {
    try {
      const hostname = new URL(finalUrl).hostname.replace(/^www\./, '')
      productName = hostname.split('.')[0]
      productName = productName.charAt(0).toUpperCase() + productName.slice(1)
    } catch {
      productName = 'Unknown Product'
    }
  }

  // 3. Discover Navigation & Important Pages
  const discoveredPages: DiscoveredPage[] = []
  const pageLinks: { [key: string]: string } = {}

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim()
    const text = $(el).text().trim()
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

    try {
      const resolved = new URL(href, finalUrl).href
      // Only keep links within the same hostname
      const resolvedHost = new URL(resolved).hostname.replace(/^www\./, '')
      const mainHost = new URL(finalUrl).hostname.replace(/^www\./, '')

      if (resolvedHost === mainHost || resolvedHost.endsWith(`.${mainHost}`)) {
        const lowerHref = resolved.toLowerCase()
        const lowerText = text.toLowerCase()

        if (lowerHref.includes('pricing') || lowerText.includes('pricing') || lowerText.includes('plans')) {
          pageLinks.pricing = resolved
          discoveredPages.push({ title: text || 'Pricing', url: resolved, type: 'pricing' })
        } else if (lowerHref.includes('feature') || lowerText.includes('feature')) {
          pageLinks.features = resolved
          discoveredPages.push({ title: text || 'Features', url: resolved, type: 'features' })
        } else if (lowerHref.includes('changelog') || lowerText.includes('changelog') || lowerText.includes('release-notes')) {
          pageLinks.changelog = resolved
          discoveredPages.push({ title: text || 'Changelog', url: resolved, type: 'changelog' })
        } else if (lowerHref.includes('blog') || lowerText.includes('blog')) {
          pageLinks.blog = resolved
          discoveredPages.push({ title: text || 'Blog', url: resolved, type: 'blog' })
        } else if (lowerHref.includes('docs') || lowerText.includes('docs') || lowerText.includes('documentation')) {
          pageLinks.docs = resolved
          discoveredPages.push({ title: text || 'Documentation', url: resolved, type: 'docs' })
        }
      }
    } catch {
      // ignore invalid URLs
    }
  })

  // 4. Extract Positioning & Claims from Hero Section
  const positioningClaims: string[] = []
  const heroH1 = $('h1').first().text().trim()
  if (heroH1) positioningClaims.push(heroH1)

  $('h2').each((i, el) => {
    if (i < 3) {
      const text = $(el).text().trim()
      if (text && text.length > 10 && text.length < 120 && !positioningClaims.includes(text)) {
        positioningClaims.push(text)
      }
    }
  })

  // 5. Extract Call to Action (CTA)
  let contactOrDemoCta = 'Not found'
  $('a, button').each((_, el) => {
    const text = $(el).text().trim()
    const lower = text.toLowerCase()
    if (
      lower.includes('start free') ||
      lower.includes('try for free') ||
      lower.includes('book a demo') ||
      lower.includes('request demo') ||
      lower.includes('get started') ||
      lower.includes('sign up') ||
      lower.includes('contact sales')
    ) {
      if (contactOrDemoCta === 'Not found' && text.length < 40) {
        contactOrDemoCta = text
      }
    }
  })

  // 6. Free Trial & Free Plan Detection
  const fullText = $('body').text().toLowerCase()
  const hasFreeTrial =
    fullText.includes('free trial') ||
    fullText.includes('14-day trial') ||
    fullText.includes('30-day trial') ||
    fullText.includes('no credit card required') ||
    fullText.includes('try free for')

  let freeTrialDetails = 'Not found'
  if (hasFreeTrial) {
    if (fullText.includes('14-day')) freeTrialDetails = '14-day free trial'
    else if (fullText.includes('30-day')) freeTrialDetails = '30-day free trial'
    else if (fullText.includes('7-day')) freeTrialDetails = '7-day free trial'
    else freeTrialDetails = 'Free trial available (card not required)'
  }

  const hasFreePlan =
    fullText.includes('free plan') ||
    fullText.includes('free tier') ||
    fullText.includes('forever free') ||
    fullText.includes('$0/mo') ||
    fullText.includes('$0 per month')

  // 7. Extract Features & Benefits
  const features: string[] = []
  const mainBenefits: string[] = []

  // Extract from lists and feature cards
  $('ul li, ol li').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length >= 10 && text.length <= 140 && !text.includes('\n')) {
      if (features.length < 12 && !features.includes(text)) {
        features.push(text)
      }
    }
  })

  // Extract benefits from H2/H3 elements
  $('h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length >= 12 && text.length <= 90 && !mainBenefits.includes(text)) {
      if (mainBenefits.length < 6) {
        mainBenefits.push(text)
      }
    }
  })

  // 8. Integrations Detection
  const integrations: string[] = []
  for (const integration of COMMON_INTEGRATIONS) {
    if (new RegExp(`\\b${integration}\\b`, 'i').test(fullText)) {
      integrations.push(integration)
    }
  }
  if (stealthResult?.integrations) {
    for (const integ of stealthResult.integrations) {
      if (!integrations.includes(integ)) {
        integrations.push(integ)
      }
    }
  }

  // 9. Pricing Plans Extraction (from Landing page, separate Pricing page, or stealth scraper)
  let pricingPlans: PricingPlanExtracted[] = []

  if (stealthResult?.pricingPlans && stealthResult.pricingPlans.length > 0) {
    pricingPlans = stealthResult.pricingPlans
  } else {
    let pricingHtml = mainHtml
    if (pageLinks.pricing && pageLinks.pricing !== finalUrl) {
      const pricingRes = await fetchHtmlWithTimeout(pageLinks.pricing)
      if (pricingRes && pricingRes.html) {
        pricingHtml = pricingRes.html
      } else {
        collectionErrors.push(`Discovered pricing page at ${pageLinks.pricing} but could not retrieve it (timeout/blocked).`)
      }
    }
    pricingPlans = extractPricingFromHtml(pricingHtml)
  }

  // Merge features from stealth scraper if available
  if (stealthResult?.features && stealthResult.features.length > 0) {
    for (const f of stealthResult.features) {
      if (!features.includes(f) && features.length < 25) {
        features.push(f)
      }
    }
  }

  // 10. Testimonials / Reviews Extraction
  const testimonials: Array<{ quote: string; author?: string }> = []
  $('blockquote, .testimonial, [class*="testimonial"], [class*="review"]').each((_, el) => {
    const quote = $(el).find('p').first().text().trim() || $(el).text().trim()
    if (quote.length > 25 && quote.length < 300 && testimonials.length < 4) {
      testimonials.push({ quote: quote.replace(/\s+/g, ' ') })
    }
  })

  // 11. Target Customers & Category Heuristics
  const targetCustomers: string[] = []
  if (fullText.includes('taxi') || fullText.includes('cab') || fullText.includes('ride') || fullText.includes('driver')) {
    targetCustomers.push('Taxi & Fleet Operators', 'Ride-Hailing Startups & Dispatchers', 'Independent Drivers & Couriers')
  }
  if (fullText.includes('developer') || fullText.includes('engineers') || fullText.includes('api')) targetCustomers.push('Developers & Engineering Teams')
  if (fullText.includes('marketing') || fullText.includes('marketers')) targetCustomers.push('Marketing & Growth Teams')
  if (fullText.includes('product manager') || fullText.includes('product team')) targetCustomers.push('Product Managers')
  if (fullText.includes('enterprise') || fullText.includes('security') || fullText.includes('soc2')) targetCustomers.push('Mid-Market & Enterprise')
  if (fullText.includes('founder') || fullText.includes('startup')) targetCustomers.push('Founders & Early-Stage Startups')
  if (targetCustomers.length === 0) targetCustomers.push('B2B SaaS Businesses')

  let category = 'B2B SaaS Application'
  if (fullText.includes('taxi') || fullText.includes('cab') || fullText.includes('ride booking') || fullText.includes('uber clone')) {
    category = 'On-Demand Ride Hailing & Fleet Management Solution'
  } else if (fullText.includes('analytics') || fullText.includes('metric') || fullText.includes('dashboard')) {
    category = 'Product & Web Analytics'
  } else if (fullText.includes('crm') || fullText.includes('sales pipeline') || fullText.includes('leads')) {
    category = 'CRM & Sales Intelligence'
  } else if (fullText.includes('support') || fullText.includes('helpdesk') || fullText.includes('tickets')) {
    category = 'Customer Support & Success'
  } else if (fullText.includes('billing') || fullText.includes('invoice') || fullText.includes('payment')) {
    category = 'FinTech & Subscription Billing'
  }

  return {
    url: inputUrl,
    normalizedUrl: finalUrl,
    productName,
    websiteTitle,
    description,
    category,
    targetCustomers,
    useCases: mainBenefits.slice(0, 4),
    features: features.length > 0 ? features : ['Core Web Application', 'Dashboard Analytics', 'User Accounts'],
    pricingPlans,
    hasFreePlan,
    hasFreeTrial,
    freeTrialDetails,
    integrations: integrations.length > 0 ? integrations : ['Webhook / API'],
    mainBenefits: mainBenefits.length > 0 ? mainBenefits : [heroH1 || 'Automated SaaS Workflow'],
    positioningClaims: positioningClaims.length > 0 ? positioningClaims : [websiteTitle],
    contactOrDemoCta,
    changelogLink: stealthResult?.changelogLink || pageLinks.changelog || 'Not found on the provided website',
    blogLink: pageLinks.blog || 'Not found on the provided website',
    docsLink: stealthResult?.docsLink || pageLinks.docs || 'Not found on the provided website',
    testimonials,
    discoveredPages,
    collectionErrors,
    analyzedAt: new Date().toISOString(),
    envatoSales: stealthResult?.envatoSales
      ? {
          ...stealthResult.envatoSales,
          comment_count:
            stealthResult.envatoSales.comment_count !== null && stealthResult.envatoSales.comment_count !== undefined
              ? Math.max(stealthResult.envatoSales.comment_count, (stealthResult.comments || []).length)
              : (stealthResult.comments || []).length > 0
              ? (stealthResult.comments || []).length
              : null,
        }
      : null,
    thumbnailUrl: stealthResult?.thumbnailUrl || null,
    headings: stealthResult?.headings || {
      h1: heroH1 ? [heroH1] : [],
      h2: [],
      h3: [],
    },
    tags: stealthResult?.tags || [],
  }
}

function extractPricingFromHtml(html: string): PricingPlanExtracted[] {
  const $ = cheerio.load(html)
  const plans: PricingPlanExtracted[] = []

  // Pattern match price containers: cards, tables, pricing tiers
  $('[class*="pricing-card"], [class*="plan"], [class*="pricing-tier"], [data-plan]').each((_, el) => {
    const text = $(el).text()
    const name = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim()
    const priceMatch = text.match(/(\$|€|£)\s*([0-9]+(\.[0-9]{2})?)/)

    if (name && priceMatch && plans.length < 5) {
      const price = `${priceMatch[1]}${priceMatch[2]}`
      const isAnnual = text.toLowerCase().includes('/year') || text.toLowerCase().includes('annual')
      const featuresInPlan: string[] = []

      $(el).find('li').each((_, li) => {
        const item = $(li).text().trim()
        if (item.length > 3 && item.length < 80 && featuresInPlan.length < 6) {
          featuresInPlan.push(item)
        }
      })

      plans.push({
        name,
        priceMonthly: isAnnual ? `${price}/yr (annual)` : `${price}/mo`,
        priceAnnual: isAnnual ? `${price}/yr` : 'Not specified',
        features: featuresInPlan,
        isPopular: text.toLowerCase().includes('popular') || text.toLowerCase().includes('recommended'),
      })
    }
  })

  // Fallback: look for general pricing tokens in text if specific cards not parsed
  if (plans.length === 0) {
    const bodyText = $('body').text()
    const matches = Array.from(bodyText.matchAll(/(\$|€|£)\s*([0-9]{1,4})\s*(\/mo|\/month|per month)?/gi))
    const uniquePrices = new Set<string>()

    for (const match of matches) {
      const val = `${match[1]}${match[2]}/mo`
      if (!uniquePrices.has(val) && uniquePrices.size < 3) {
        uniquePrices.add(val)
        plans.push({
          name: `Tier ${uniquePrices.size}`,
          priceMonthly: val,
          priceAnnual: 'Not specified',
          features: ['Standard feature access'],
        })
      }
    }
  }

  return plans
}

function buildEmptyData(url: string, errors: string[]): ExtractedProductData {
  return {
    url,
    normalizedUrl: url,
    productName: 'Unable to reach website',
    websiteTitle: 'Not found',
    description: 'Not found on the provided website',
    category: 'Not found',
    targetCustomers: [],
    useCases: [],
    features: [],
    pricingPlans: [],
    hasFreePlan: false,
    hasFreeTrial: false,
    freeTrialDetails: 'Not found',
    integrations: [],
    mainBenefits: [],
    positioningClaims: [],
    contactOrDemoCta: 'Not found',
    changelogLink: 'Not found on the provided website',
    blogLink: 'Not found on the provided website',
    docsLink: 'Not found on the provided website',
    testimonials: [],
    discoveredPages: [],
    collectionErrors: errors,
    analyzedAt: new Date().toISOString(),
    envatoSales: null,
  }
}

export async function fetchProductPublicComments(url: string): Promise<Array<{
  author_name: string
  comment_text: string
  comment_date: string
  comment_url: string | null
  rating: number | null
}>> {
  try {
    const stealth = await runStealthScraper(url)
    if (stealth?.comments && stealth.comments.length > 0) {
      return stealth.comments
    }
  } catch (err) {
    console.error(`Error collecting public comments for ${url}:`, err)
  }
  return []
}
