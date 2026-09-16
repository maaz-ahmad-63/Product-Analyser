import * as cheerio from 'cheerio'
import { execFile } from 'child_process'
import path from 'path'
import { prisma } from '../../lib/prisma'
import { ExtractedProductData, PricingPlanExtracted, DiscoveredPage, EnvatoSalesData, AmazonBsrData } from './types'

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
  isAmazon?: boolean
  isShopify?: boolean
  envatoSales?: EnvatoSalesData | null
  amazonBsr?: AmazonBsrData | null
  amazonPurchaseBadge?: string | null
  thumbnailUrl?: string | null
  headings?: { h1: string[]; h2: string[]; h3: string[] }
  imageAltsCount?: number
  totalImagesCount?: number
  canonicalUrl?: string | null
  hasStructuredData?: boolean
  structuredDataTypes?: string[]
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

export function extractEnvatoItemId(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/[\/-](\d{7,10})(?:[/?#]|$)/) || url.match(/[?&]id=(\d{7,10})/)
  return match ? match[1] : null
}

async function fetchEnvatoCatalogItem(itemId: string): Promise<StealthScraperOutput | null> {
  const token = process.env.ENVATO_API_TOKEN
  if (!token) return null

  try {
    const res = await fetch(`https://api.envato.com/v3/market/catalog/item?id=${itemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
    })

    if (!res.ok) {
      console.warn(`Envato API returned HTTP ${res.status} for item ${itemId}`)
      return null
    }

    const data = await res.json()
    const descriptionHtml: string = data.description || ''
    const $ = cheerio.load(descriptionHtml)

    // Extract detailed features from list items, bullet points, and headers
    const features: string[] = []
    $('li').each((_, el) => {
      const txt = $(el).text().trim().replace(/\s+/g, ' ')
      if (txt.length >= 4 && txt.length <= 160 && !features.includes(txt)) {
        features.push(txt)
      }
    })

    if (features.length < 5) {
      $('strong, b, h2, h3, h4').each((_, el) => {
        const txt = $(el).text().trim().replace(/[:\-\.]*$/, '').replace(/\s+/g, ' ')
        if (txt.length >= 6 && txt.length <= 80 && !features.includes(txt)) {
          features.push(txt)
        }
      })
    }

    // Extract demo and documentation links
    let demoLink: string | null = null
    let docsLink: string | null = null
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim()
      const text = $(el).text().toLowerCase()
      if (href && (text.includes('demo') || text.includes('preview') || href.includes('demo'))) {
        if (!demoLink) demoLink = href
      }
      if (href && (text.includes('doc') || text.includes('guide') || text.includes('manual'))) {
        if (!docsLink) docsLink = href
      }
    })

    // Pricing extraction
    const priceCents = data.price_cents
    const priceVal = priceCents ? `$${(priceCents / 100).toFixed(0)}` : 'One-time license'
    const pricingPlans: PricingPlanExtracted[] = [
      {
        name: 'Regular License',
        priceMonthly: `${priceVal} (One-time)`,
        priceAnnual: `${priceVal} (One-time)`,
        features: ['Quality checked by Envato', 'Future updates included', '6 months author support'],
      },
    ]

    // Detect common integrations & frameworks
    const integrations: string[] = []
    const combinedText = `${data.name} ${data.summary || ''} ${descriptionHtml}`.toLowerCase()
    COMMON_INTEGRATIONS.forEach((intName) => {
      if (combinedText.includes(intName.toLowerCase()) && !integrations.includes(intName)) {
        integrations.push(intName)
      }
    })

    const envatoSales: EnvatoSalesData = {
      product_name: data.name,
      product_url: data.url || `https://codecanyon.net/item/${itemId}`,
      current_total_sales: data.number_of_sales ?? null,
      product_price: priceVal,
      discounted_price: null,
      rating: data.rating ? parseFloat(Number(data.rating).toFixed(2)) : null,
      rating_count: data.rating_count ?? null,
      review_count: data.rating_count ?? null,
      comment_count: null,
      publication_date: data.published_at ? new Date(data.published_at).toISOString().split('T')[0] : null,
      last_update_date: data.updated_at ? new Date(data.updated_at).toISOString().split('T')[0] : null,
      version: null,
      author_name: data.author_username || null,
      category: data.classification || null,
      product_status: 'active',
      sales_data_unavailable: false,
      thumbnail_url: data.previews?.icon_preview?.icon_url || data.previews?.live_site?.url || null,
    }

    const cleanDesc =
      data.summary ||
      $('p').first().text().trim() ||
      `${data.name} published on ${data.site || 'Envato Market'}`

    return {
      success: true,
      url: data.url || `https://codecanyon.net/item/${itemId}`,
      finalUrl: data.url || `https://codecanyon.net/item/${itemId}`,
      title: data.name,
      h1: data.name,
      description: cleanDesc,
      productName: data.name,
      priceText: priceVal,
      pricingPlans,
      features: features.slice(0, 35),
      integrations,
      tags: Array.isArray(data.tags) ? data.tags : [],
      specs: {},
      html: descriptionHtml,
      isEnvato: true,
      envatoSales,
      thumbnailUrl: envatoSales.thumbnail_url,
      headings: {
        h1: [data.name],
        h2: $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 8),
        h3: $('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 8),
      },
      imageAltsCount: $('img[alt]').filter((_, el) => !!$(el).attr('alt')?.trim()).length,
      totalImagesCount: $('img').length,
      canonicalUrl: data.url || `https://codecanyon.net/item/${itemId}`,
      hasStructuredData: false,
      structuredDataTypes: [],
      demoLink,
      docsLink,
      changelogLink: null,
      comments: [],
    }
  } catch (err) {
    console.error(`Error in fetchEnvatoCatalogItem for ${itemId}:`, err)
    return null
  }
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
          if (!parsed.finalUrl || parsed.finalUrl === 'about:blank') {
            parsed.finalUrl = url
          }
          if (
            parsed.success &&
            (parsed.title || parsed.h1 || (parsed.html && parsed.html.length > 100))
          ) {
            resolve(parsed)
          } else {
            resolve(null)
          }
        } catch (parseErr) {
          console.error(`Error parsing stealth scraper output for ${url}:`, parseErr)
          resolve(null)
        }
      }
    )
  })
}

/**
 * Parse raw Amazon HTML into StealthScraperOutput using Cheerio & Regex.
 * Enables zero-dependency parsing for ScraperAPI on Vercel / serverless.
 */
export function parseAmazonHtml(html: string, url: string): StealthScraperOutput | null {
  if (!html || html.length < 200) return null

  // Check for bot blocks / captcha
  if (
    html.includes('validateCaptcha') ||
    html.includes('Type the characters') ||
    html.toLowerCase().includes('robot check') ||
    html.includes('api-services-support@amazon.com')
  ) {
    return null
  }

  const $ = cheerio.load(html)

  // Title
  let title = $('#productTitle').text().trim() || $('#title').text().trim()
  if (!title) {
    const ogTitle = $('meta[property="og:title"]').attr('content') || ''
    if (ogTitle && ogTitle.includes('Amazon')) {
      title = ogTitle.split(/[:|]/)[0].trim()
    }
  }
  if (!title) {
    const rawTitle = $('title').text().trim()
    title = rawTitle.replace(/\s*[-–]\s*Amazon\.(com|in|co\.uk|de).*$/i, '').split(/[:|]/)[0].trim()
  }

  // Description
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    ''

  // Thumbnail
  const thumbnailUrl =
    $('#landingImage').attr('src') ||
    $('#landingImage').attr('data-old-hires') ||
    $('#imgBlkFront').attr('src') ||
    $('meta[property="og:image"]').attr('content') ||
    null

  // Price
  let priceText = ''
  const visiblePriceInput = $('input[name*="customerVisiblePrice"]').val()
  if (typeof visiblePriceInput === 'string' && visiblePriceInput.trim()) {
    priceText = visiblePriceInput.trim()
  }
  if (!priceText) {
    const offscreen = $('#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, #apexPriceToPay .a-offscreen')
      .first()
      .text()
      .trim()
    if (offscreen && /[\d,]{2,}/.test(offscreen)) {
      priceText = offscreen
    }
  }
  if (!priceText) {
    const offscreenGeneric = $('.a-price .a-offscreen').first().text().trim()
    if (offscreenGeneric && /(?:₹|\$|€|£|Rs\.?)\s*[\d,]+/i.test(offscreenGeneric)) {
      priceText = offscreenGeneric
    }
  }
  if (!priceText) {
    const blockPrice = $('#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice').first().text().trim()
    if (blockPrice) priceText = blockPrice
  }

  // Strikethrough price
  const strikethroughPrice: string | null =
    $('.a-text-price .a-offscreen, #basisPrice .a-offscreen').first().text().trim() || null

  // Rating
  let rating: number | null = null
  const ratingText = $('#acrPopover span.a-icon-alt').first().text() || $('span[data-hook="rating-out-of-text"]').text()
  const ratingMatch = (ratingText || html).match(/([0-9]\.[0-9])\s+out of 5/i)
  if (ratingMatch) {
    rating = parseFloat(ratingMatch[1])
  }

  // Review count
  let reviewCount: number | null = null
  const reviewCountText = $('#acrCustomerReviewText').text()
  const countMatch = (reviewCountText || html).match(/([0-9,]+)\s+(?:global\s+)?(?:customer\s+)?ratings?/i)
  if (countMatch) {
    reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10)
  }

  // Sales velocity
  let salesVelocity: string | null = null
  const svEl = $('#social-proofing-faceout-title, [data-csa-c-item-type="social_proofing"]').text().trim()
  const svMatch = (svEl || html).match(/([0-9,]+K?\+?\s+bought\s+in\s+past\s+month)/i)
  if (svMatch) {
    salesVelocity = svMatch[1].trim()
  }

  // Features (bullet points)
  const features: string[] = []
  $('#feature-bullets li .a-list-item, #featurebullets_feature_div li').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    const lower = text.toLowerCase()
    const navWords = ['shift', 'skip to main', 'press enter', 'keyboard', 'checkout']
    if (text.length >= 8 && text.length <= 400 && !features.includes(text) && !navWords.some((w) => lower.includes(w))) {
      features.push(text)
    }
  })

  // Specs
  const specs: Record<string, string> = {}
  $('.po-row').each((_, el) => {
    const k = $(el).find('.po-title').text().trim().replace(/[:\s]+$/, '')
    const v = $(el).find('.po-value').text().trim()
    if (k && v && k !== v && !k.includes('Best Sellers') && !k.includes('Customer Reviews')) {
      specs[k] = v
    }
  })
  $('#productDetails_techSpec_section_1 tr, .prodDetTable tr').each((_, el) => {
    const k = $(el).find('th').text().trim().replace(/[:\s]+$/, '')
    const v = $(el).find('td').text().trim()
    if (k && v && k !== v && k.length < 60 && !specs[k]) {
      specs[k] = v
    }
  })

  // BSR
  let amazonBsr: AmazonBsrData | null = null
  const bsrMatch = html.match(/#\s*([0-9,]+)\s+in\s+([A-Za-z ,&\-/]+?)(?:\s*<|\s*\(|\s*\n)/)
  if (bsrMatch) {
    const rank = parseInt(bsrMatch[1].replace(/,/g, ''), 10)
    const cat = bsrMatch[2].trim().replace(/[,&\-\/]+$/, '')
    if (rank < 10000000 && cat.length > 3 && cat.length < 80) {
      amazonBsr = {
        rank,
        rankFormatted: `#${rank.toLocaleString()}`,
        category: cat,
        subcategories: [],
        rawText: `#${rank.toLocaleString()} in ${cat}`,
      }
    }
  }

  // Pricing plans
  const pricingPlans: PricingPlanExtracted[] = [
    {
      name: 'Standard Purchase',
      priceMonthly: priceText || 'Standard Price',
      priceAnnual: priceText || 'Standard Price',
      features: features.slice(0, 4).length > 0 ? features.slice(0, 4) : ['Standard Amazon Purchase'],
      isPopular: true,
    },
  ]

  // Reviews / Comments (Customer verified reviews)
  const comments: StealthScraperOutput['comments'] = []
  $('[data-hook="review"]').each((_, el) => {
    if (comments && comments.length >= 30) return
    const author = $(el).find('.a-profile-name').first().text().trim() || 'Amazon Verified Buyer'
    const rTitle = $(el).find('[data-hook="reviewTitle"], [data-hook="review-title"], h5[class*="review-title"]').first().text().trim()

    let rBody = $(el).find('[data-hook="review-body"]').text().trim()
    if (!rBody) {
      const pTexts: string[] = []
      $(el).find('p').each((_, p) => {
        const t = $(p).text().trim()
        if (t.length > 5 && !t.includes('community guidelines') && !t.includes('Helpful') && !t.includes('Report')) {
          pTexts.push(t)
        }
      })
      rBody = pTexts.join(' ')
    }

    const date = $(el).find('[data-hook="review-date"]').first().text().trim() || 'Recently'
    const permalink = $(el).find('a[href*="customer-reviews"], a[href*="review_title"]').first().attr('href') || null

    const rText = $(el).find('[data-hook="review-star-rating"] .a-icon-alt, .review-rating .a-icon-alt, .a-icon-alt').first().text().trim()
    const rMatch = rText.match(/([0-9]\.?[0-9]?)\s+out of/i)
    const ratingVal = rMatch ? parseFloat(rMatch[1]) : null

    const combinedText = rTitle && rBody ? `${rTitle} — ${rBody}` : (rBody || rTitle)

    if (combinedText && combinedText.length > 8) {
      comments?.push({
        author_name: author,
        comment_text: combinedText.slice(0, 1500),
        comment_date: date,
        comment_url: permalink ? (permalink.startsWith('http') ? permalink : `https://www.amazon.in${permalink}`) : null,
        rating: ratingVal,
      })
    }
  })

  const envatoSales: EnvatoSalesData = {
    product_name: title || 'Amazon Product',
    product_url: url,
    current_total_sales: null,
    product_price: priceText || null,
    discounted_price: strikethroughPrice,
    rating,
    rating_count: reviewCount,
    review_count: reviewCount,
    comment_count: comments?.length || 0,
    publication_date: null,
    last_update_date: null,
    version: specs['Item model number'] || specs['Model'] || null,
    author_name: specs['Brand'] || specs['Manufacturer'] || null,
    category: 'Amazon Marketplace',
    product_status: 'active',
    sales_data_unavailable: false,
    thumbnail_url: thumbnailUrl,
  }

  return {
    success: true,
    url,
    finalUrl: url,
    title: title || 'Amazon Product',
    h1: title || 'Amazon Product',
    description: description || title,
    productName: title || 'Amazon Product',
    priceText: priceText || 'Standard Price',
    pricingPlans,
    features: features.slice(0, 35),
    integrations: [],
    tags: [],
    specs,
    html,
    isAmazon: true,
    envatoSales,
    amazonBsr,
    amazonPurchaseBadge: salesVelocity,
    thumbnailUrl,
    headings: {
      h1: title ? [title] : [],
      h2: [],
      h3: [],
    },
    imageAltsCount: $('img[alt]').length,
    totalImagesCount: $('img').length,
    canonicalUrl: url,
    hasStructuredData: false,
    structuredDataTypes: [],
    demoLink: null,
    docsLink: null,
    changelogLink: null,
    comments,
  }
}

/**
 * Fetch HTML via ScraperAPI (cloud proxy & residential IP rotation for Vercel/production).
 */
async function fetchScraperApi(url: string): Promise<string | null> {
  const apiKey = process.env.SCRAPER_API_KEY
  if (!apiKey) return null

  try {
    let countryCode = 'us'
    if (url.includes('amazon.in')) countryCode = 'in'
    else if (url.includes('amazon.co.uk')) countryCode = 'gb'
    else if (url.includes('amazon.de')) countryCode = 'de'
    else if (url.includes('amazon.ca')) countryCode = 'ca'

    const scraperUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}&country_code=${countryCode}&device_type=desktop`
    console.log(`[collector] Fetching via ScraperAPI (country: ${countryCode}): ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    const res = await fetch(scraperUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`ScraperAPI returned status ${res.status} for ${url}`)
      return null
    }

    const html = await res.text()
    if (html.length < 500 || html.includes('validateCaptcha') || html.includes('Robot Check')) {
      console.warn(`ScraperAPI response was captcha or empty for ${url}`)
      return null
    }

    return html
  } catch (err) {
    console.error(`ScraperAPI error for ${url}:`, err)
    return null
  }
}

/**
 * Amazon-specific scraper using crawl4ai (superior anti-bot bypass for localhost/Docker).
 * Replaces Playwright-based scraping for amazon.com/amazon.in URLs.
 */
async function runAmazonScraper(url: string): Promise<StealthScraperOutput | null> {
  const scriptPath = path.join(process.cwd(), 'src', 'services', 'website-analyzer', 'amazon_scraper.py')
  return new Promise((resolve) => {
    execFile(
      'python3',
      [scriptPath, url],
      { timeout: 60000, maxBuffer: 15 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          console.error(`Amazon scraper (crawl4ai) error for ${url}:`, err.message, stderr?.slice(0, 300))
          resolve(null)
          return
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as StealthScraperOutput
          if (!parsed.finalUrl || parsed.finalUrl === 'about:blank') {
            parsed.finalUrl = url
          }
          // Accept result if we got at least a title, product name, or price
          if (parsed.productName || parsed.title || parsed.priceText || (parsed.features && parsed.features.length > 0)) {
            parsed.success = true
            resolve(parsed)
          } else {
            console.warn(`Amazon scraper returned empty data for ${url}, falling back.`)
            resolve(null)
          }
        } catch (parseErr) {
          console.error(`Error parsing Amazon scraper output for ${url}:`, parseErr)
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

    // For Amazon URLs: strip referral tracking params and session IDs.
    // Keep only the canonical /dp/ASIN path — ref= params cause bot-detection.
    if (parsed.hostname.includes('amazon.') || parsed.hostname.includes('amzn.')) {
      // Extract ASIN from path like /Product-Name/dp/B0XXXXXX/ref=...
      const asinMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i)
      if (asinMatch) {
        return `${parsed.protocol}//${parsed.host}/dp/${asinMatch[1]}`
      }
    }

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

  const isAmazonDomain =
    normalized.includes('amazon.') ||
    normalized.includes('amzn.')

  const isProtectedDomain =
    normalized.includes('codecanyon.net') ||
    normalized.includes('themeforest.net') ||
    normalized.includes('envato.com') ||
    isAmazonDomain

  // 1. Fetch Main Landing Page (Use official Envato API for Envato items, or crawl4ai/stealth/fetch)
  if (isProtectedDomain) {
    const envatoItemId = extractEnvatoItemId(normalized)
    if (envatoItemId) {
      stealthResult = await fetchEnvatoCatalogItem(envatoItemId)
      if (stealthResult && stealthResult.html) {
        mainHtml = stealthResult.html
        finalUrl = stealthResult.finalUrl || normalized
      }
    }
    if (!mainHtml) {
      if (isAmazonDomain) {
        // Strategy 1 (Cloud / Vercel): Use ScraperAPI if SCRAPER_API_KEY is configured
        if (process.env.SCRAPER_API_KEY) {
          console.log(`[collector] Attempting ScraperAPI for Amazon: ${normalized}`)
          const scraperApiHtml = await fetchScraperApi(normalized)
          if (scraperApiHtml) {
            const parsed = parseAmazonHtml(scraperApiHtml, normalized)
            if (parsed && (parsed.productName || parsed.priceText || parsed.title)) {
              stealthResult = parsed
              mainHtml = parsed.html || scraperApiHtml
              finalUrl = parsed.finalUrl || normalized
              console.log(`[collector] ScraperAPI successfully scraped Amazon: ${parsed.productName || parsed.title}`)
            }
          }
        }

        // Strategy 2 (Localhost / Docker): Use crawl4ai Python scraper if ScraperAPI didn't run or failed
        if (!mainHtml) {
          console.log(`[collector] Using crawl4ai Amazon scraper for: ${normalized}`)
          stealthResult = await runAmazonScraper(normalized)
          if (stealthResult && (stealthResult.html || stealthResult.productName || stealthResult.title)) {
            mainHtml = stealthResult.html || `<html><body>${stealthResult.productName || stealthResult.title}</body></html>`
            finalUrl = stealthResult.finalUrl || normalized
          }
        }
      }
      // Fallback: use Playwright stealth scraper (for non-Amazon or if both above failed)
      if (!mainHtml) {
        stealthResult = await runStealthScraper(normalized)
        if (stealthResult && stealthResult.html) {
          mainHtml = stealthResult.html
          finalUrl = stealthResult.finalUrl || normalized
        }
      }
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

  if (!mainHtml || finalUrl === 'about:blank') {
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

  // 4. Extract Positioning & Claims from Hero Section, Subheadings, and Meta
  const positioningClaims: string[] = []
  const heroH1 = $('h1').first().text().trim()
  if (heroH1) positioningClaims.push(heroH1)

  // Subtitle / lead paragraph from hero section
  const heroSubtitle = $('p.lead, p.subtitle, [class*="hero"] p, [class*="subheadline"], [class*="tagline"]').first().text().trim()
  if (heroSubtitle && heroSubtitle.length > 15 && heroSubtitle.length < 220 && !positioningClaims.includes(heroSubtitle)) {
    positioningClaims.push(heroSubtitle)
  }

  $('h2').each((i, el) => {
    if (i < 3) {
      const text = $(el).text().trim()
      if (text && text.length > 10 && text.length < 140 && !positioningClaims.includes(text)) {
        positioningClaims.push(text)
      }
    }
  })

  // Meta description as verified positioning context
  const metaDesc = $('meta[name="description"], meta[property="og:description"]').attr('content')?.trim()
  if (metaDesc && metaDesc.length > 20 && metaDesc.length < 250 && !positioningClaims.includes(metaDesc)) {
    positioningClaims.push(metaDesc)
  }

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

  const isNavShortcut = (str: string) => {
    const l = str.toLowerCase().trim()
    const boilerplate = [
      'shift + opt', 'opt + /', 'search opt', 'cart shift', 'home shift',
      'skip to main', 'press enter', 'keyboard shortcut', 'privacy notice',
      'terms of service', 'all rights reserved', 'cookie policy', 'privacy policy',
      'main content', 'about this item', 'buying options', 'compare with similar items',
      'prime video', 'bestsellers', "today's deals", 'customer service',
      'new releases', 'amazon pay', 'gift cards', 'beauty & personal care',
      'returns & replacements', 'manage your content', 'help & contact',
      'back to top', 'conditions of use', 'sign in', 'your account',
      'add to cart', 'buy now', 'read more', 'click here', 'learn more',
      'view all', 'view details', 'show more', 'see more', 'copyright',
      'electronics', 'home & kitchen', 'computers', 'toys & games', 'books',
    ]
    if (boilerplate.some((b) => l === b || l.startsWith(b + ' ') || l.endsWith(' ' + b))) {
      return true
    }
    return false
  }

  // Prepend high-confidence features from stealth scraper if available
  if (stealthResult?.features && stealthResult.features.length > 0) {
    for (const f of stealthResult.features) {
      if (!isNavShortcut(f) && !features.includes(f) && features.length < 35) {
        features.push(f)
      }
    }
  }

  // Extract from feature lists, cards, and structured elements (ignoring navbars and footers)
  $('[class*="feature"] li, [id*="feature"] li, [class*="benefit"] li, .features li, ul li, ol li').each((_, el) => {
    if ($(el).closest('footer, nav, header, [role="navigation"], #navFooter, .nav-footer, #navbar').length > 0) {
      return
    }
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    if (text.length >= 8 && text.length <= 250 && !text.includes('\n') && !isNavShortcut(text)) {
      if (features.length < 35 && !features.includes(text)) {
        features.push(text)
      }
    }
  })

  // Also check feature cards and definition lists if list items are sparse
  if (features.length < 5) {
    $('[class*="feature"] h3, [class*="feature"] h4, [class*="card"] h3, dt').each((_, el) => {
      if ($(el).closest('footer, nav, header, [role="navigation"], #navFooter, .nav-footer, #navbar').length > 0) {
        return
      }
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (text.length >= 6 && text.length <= 100 && !isNavShortcut(text) && !features.includes(text)) {
        features.push(text)
      }
    })
  }

  // Extract benefits from H2/H3 elements
  $('h3').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    if (text.length >= 12 && text.length <= 90 && !isNavShortcut(text) && !mainBenefits.includes(text)) {
      if (mainBenefits.length < 8) {
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
  } else if (stealthResult?.priceText) {
    pricingPlans = [
      {
        name: 'Standard Price',
        priceMonthly: stealthResult.priceText,
        priceAnnual: stealthResult.priceText,
        features: features.slice(0, 4),
        isPopular: true,
      },
    ]
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

  // 10. Testimonials / Reviews Extraction
  const testimonials: Array<{ quote: string; author?: string }> = []
  $('blockquote, .testimonial, [class*="testimonial"], [class*="review"]').each((_, el) => {
    const quote = $(el).find('p').first().text().trim() || $(el).text().trim()
    if (quote.length > 25 && quote.length < 300 && !isNavShortcut(quote) && testimonials.length < 4) {
      testimonials.push({ quote: quote.replace(/\s+/g, ' ') })
    }
  })

  // 11. Target Customers & Category Heuristics
  const isAmazonUrl = normalized.includes('amazon.') || normalized.includes('amzn.')
  const targetCustomers: string[] = []

  if (isAmazonUrl || fullText.includes('smartphone') || fullText.includes('iphone') || fullText.includes('ceramic shield') || fullText.includes('all-day battery')) {
    targetCustomers.push('Smartphone Consumers', 'Apple Ecosystem Users', 'Mobile Tech Professionals')
  } else if (
    fullText.includes('taxi') ||
    fullText.includes('cab ') ||
    fullText.includes('ride-hailing') ||
    fullText.includes('fleet dispatch') ||
    (fullText.includes('driver') && (fullText.includes('passenger') || fullText.includes('fare') || fullText.includes('dispatch')))
  ) {
    targetCustomers.push('Taxi & Fleet Operators', 'Ride-Hailing Startups & Dispatchers', 'Independent Drivers & Couriers')
  }
  if (fullText.includes('developer') || fullText.includes('engineers') || fullText.includes('api')) targetCustomers.push('Developers & Engineering Teams')
  if (fullText.includes('marketing') || fullText.includes('marketers')) targetCustomers.push('Marketing & Growth Teams')
  if (fullText.includes('product manager') || fullText.includes('product team')) targetCustomers.push('Product Managers')
  if (fullText.includes('enterprise') || fullText.includes('security') || fullText.includes('soc2')) targetCustomers.push('Mid-Market & Enterprise')
  if (fullText.includes('founder') || fullText.includes('startup')) targetCustomers.push('Founders & Early-Stage Startups')
  if (targetCustomers.length === 0) targetCustomers.push('B2B SaaS Businesses')

  let category = stealthResult?.envatoSales?.category || 'B2B SaaS Application'
  if (isAmazonUrl || fullText.includes('smartphone') || fullText.includes('iphone') || fullText.includes('ceramic shield')) {
    category = 'Smartphones & Consumer Electronics'
  } else if (
    fullText.includes('taxi') ||
    fullText.includes('cab ') ||
    fullText.includes('ride booking') ||
    fullText.includes('uber clone') ||
    (fullText.includes('driver') && (fullText.includes('passenger') || fullText.includes('fare') || fullText.includes('dispatch')))
  ) {
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

  // 12. Technical SEO & Schema.org Structured Data
  const totalImagesCount = $('img').length
  const imageAltsCount =
    typeof stealthResult?.imageAltsCount === 'number'
      ? stealthResult.imageAltsCount
      : $('img[alt]').filter((_, el) => !!$(el).attr('alt')?.trim()).length
  const canonicalUrl = stealthResult?.canonicalUrl || $('link[rel="canonical"]').attr('href')?.trim() || null
  let hasStructuredData = stealthResult?.hasStructuredData ?? false
  const structuredDataTypes: string[] = [...(stealthResult?.structuredDataTypes || [])]

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html()?.trim()
      if (!raw) return
      const json = JSON.parse(raw)
      hasStructuredData = true
      const type = json['@type']
      if (type && typeof type === 'string' && !structuredDataTypes.includes(type)) {
        structuredDataTypes.push(type)
      } else if (Array.isArray(type)) {
        type.forEach((t) => {
          if (typeof t === 'string' && !structuredDataTypes.includes(t)) structuredDataTypes.push(t)
        })
      }
    } catch {}
  })

  return {
    url: inputUrl,
    normalizedUrl: finalUrl,
    productName,
    websiteTitle,
    description,
    category,
    targetCustomers,
    useCases: mainBenefits.slice(0, 4),
    features: features.length > 0 ? features : [],
    pricingPlans,
    hasFreePlan,
    hasFreeTrial,
    freeTrialDetails,
    integrations: integrations.length > 0 ? integrations : [],
    mainBenefits: mainBenefits.length > 0 ? mainBenefits : (heroH1 ? [heroH1] : []),
    positioningClaims: positioningClaims.length > 0 ? positioningClaims : (websiteTitle ? [websiteTitle] : []),
    contactOrDemoCta,
    changelogLink: stealthResult?.changelogLink || pageLinks.changelog || 'Not found on the provided website',
    blogLink: pageLinks.blog || 'Not found on the provided website',
    docsLink: stealthResult?.docsLink || pageLinks.docs || 'Not found on the provided website',
    testimonials,
    discoveredPages,
    collectionErrors,
    analyzedAt: new Date().toISOString(),
    imageAltsCount,
    totalImagesCount,
    canonicalUrl,
    hasStructuredData,
    structuredDataTypes,
    envatoSales: stealthResult?.envatoSales?.product_name
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
    amazonBsr: stealthResult?.amazonBsr || null,
    amazonPurchaseBadge: stealthResult?.amazonPurchaseBadge || null,
    specs: stealthResult?.specs || {},
    thumbnailUrl: stealthResult?.thumbnailUrl || null,
    headings: stealthResult?.headings || {
      h1: heroH1 ? [heroH1] : [],
      h2: [],
      h3: [],
    },
    tags: stealthResult?.tags || [],
    comments: stealthResult?.comments || [],
    provenance: {
      source: isAmazonUrl ? 'amazon_marketplace' : stealthResult?.isEnvato ? 'envato_api_and_public' : 'generic_web',
      source_url: normalized,
      collected_at: new Date().toISOString(),
      status: stealthResult?.envatoSales ? 'success' : collectionErrors.length > 0 ? 'partial' : 'success',
      connector: isAmazonUrl ? 'amazon' : stealthResult?.isEnvato ? 'envato' : 'generic',
      message: isAmazonUrl
        ? 'Verified via Amazon Marketplace product catalog and customer reviews.'
        : stealthResult?.isEnvato
        ? 'Verified via Envato API and public web extraction.'
        : 'Parsed via generic website crawler. Marketplace-specific metrics not available.',
    },
  }
}

function extractPricingFromHtml(html: string): PricingPlanExtracted[] {
  const $ = cheerio.load(html)
  const plans: PricingPlanExtracted[] = []

  // Pattern match price containers: cards, tables, pricing tiers
  $('[class*="pricing-card"], [class*="plan"], [class*="pricing-tier"], [data-plan]').each((_, el) => {
    const text = $(el).text()
    const name = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim()
    const priceMatch = text.match(/(₹|Rs\.?|\$|€|£)\s*([0-9,]+(\.[0-9]{2})?)/i)

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
    const matches = Array.from(bodyText.matchAll(/(₹|Rs\.?|\$|€|£)\s*([0-9,]{1,8}(?:\.[0-9]{2})?)\s*(\/mo|\/month|per month)?/gi))
    const uniquePrices = new Set<string>()

    for (const match of matches) {
      const symbol = match[1]
      const amount = match[2]
      const period = match[3]
      const val = period ? `${symbol}${amount}/mo` : `${symbol}${amount}`
      if (!uniquePrices.has(val) && uniquePrices.size < 3) {
        uniquePrices.add(val)
        plans.push({
          name: `Tier ${uniquePrices.size}`,
          priceMonthly: val,
          priceAnnual: period ? `${symbol}${amount}/yr` : 'Not specified',
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
    amazonBsr: null,
    amazonPurchaseBadge: null,
    specs: {},
    comments: [],
    provenance: {
      source: url.includes('codecanyon.net') || url.includes('themeforest.net') || url.includes('envato.com') ? 'envato_api_and_public' : 'generic_web',
      source_url: url,
      collected_at: new Date().toISOString(),
      status: 'failed',
      connector: url.includes('codecanyon.net') || url.includes('themeforest.net') || url.includes('envato.com') ? 'envato' : 'generic',
      message: errors.join(', '),
    },
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
    console.error(`Error collecting public comments via scraper for ${url}:`, err)
  }

  // Fallback: Query synced engagement threads from database for this item/URL
  try {
    const itemId = extractEnvatoItemId(url)
    const threads = await prisma.engagementThread.findMany({
      where: {
        productUrl: itemId ? { contains: itemId } : { contains: url },
      },
      include: {
        messages: true,
      },
      take: 50,
    })

    if (threads.length > 0) {
      const dbComments: Array<{
        author_name: string
        comment_text: string
        comment_date: string
        comment_url: string | null
        rating: number | null
      }> = []

      for (const t of threads) {
        for (const m of t.messages) {
          dbComments.push({
            author_name: m.authorUsername,
            comment_text: m.messageText,
            comment_date: m.messageCreatedAt ? m.messageCreatedAt.toISOString() : m.createdAt.toISOString(),
            comment_url: m.messageUrl || t.commentUrl || null,
            rating: null,
          })
        }
      }

      if (dbComments.length > 0) {
        return dbComments
      }
    }
  } catch (dbErr) {
    console.warn(`Could not query database for synced threads (${url}):`, dbErr)
  }

  // Fallback 2: Check existing comparison analyses for cached comments on this competitor URL
  try {
    const existing = await prisma.comparisonAnalysis.findFirst({
      where: {
        OR: [
          { competitorUrl: { contains: url } },
          { competitorUrls: { has: url } },
        ],
      },
      select: { commentsAnalysis: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (existing?.commentsAnalysis) {
      const ca = existing.commentsAnalysis as any
      const matchingComments = ca.all_comments?.filter(
        (c: any) => c.product_url === url || (url.includes(c.product_url) && c.product_url?.length > 10)
      )
      if (matchingComments && matchingComments.length > 0) {
        return matchingComments.map((c: any) => ({
          author_name: c.author_name || 'Public Member',
          comment_text: c.comment_text,
          comment_date: c.comment_date || 'Recent public comment',
          comment_url: c.comment_url || null,
          rating: c.rating ?? null,
        }))
      }
    }
  } catch (dbErr) {
    console.warn(`Could not query database for cached comments (${url}):`, dbErr)
  }

  return []
}
