import {
  ExtractedProductData,
  SeoOnPageAudit,
  SeoKeywordComparisonRow,
  SeoRecommendationItem,
  SeoAnalysisResult,
  ObservedTopic,
  CompetitorTopicGap,
  CompetitorSeoProfile,
  SeoContentCoverage,
  CompetitiveSeoInsight,
  PrioritizedSeoAction,
} from './types'

// Stopwords for clean topic/keyword extraction
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'll',
  'm', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're', 's', 'same', 'she',
  'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'wasn', 'we', 'were', 'weren', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'will', 'with', 'won', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // generic web & marketplace boilerplates
  'codecanyon', 'themeforest', 'envato', 'item', 'details', 'preview', 'buy', 'license', 'software',
  'click', 'here', 'view', 'read', 'more', 'download', 'update', 'version', 'free', 'online', 'demo',
  'website', 'link', 'page', 'site', 'http', 'https', 'www', 'com', 'net', 'org', 'copyright', 'reserved',
  'item', 'items', 'file', 'files', 'author', 'regular', 'extended', 'support', 'documentation',
])

/**
 * Normalizes a topic or term:
 * - lowercase
 * - punctuation strip
 * - safe singularization
 * - whitespace normalization
 */
export function normalizeTopic(term: string): string {
  if (!term) return ''
  let cleaned = term.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, ' ')
  cleaned = cleaned.replace(/\s+/g, ' ')
  const words = cleaned.split(' ').map((w) => {
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'
    if ((w.endsWith('ses') || w.endsWith('xes') || w.endsWith('ches') || w.endsWith('shes')) && w.length > 4) return w.slice(0, -2)
    if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) return w.slice(0, -1)
    return w
  })
  return words.join(' ').trim()
}

/**
 * Classifies an observed topic into an intuitive semantic topic group.
 */
export function classifySemanticGroup(topic: string): string {
  const t = topic.toLowerCase()
  if (/whatsapp|chat|message|inbox|sms|notification|bot|conversation|broadcast|channel/i.test(t)) {
    return 'Messaging & Communication'
  }
  if (/api|webhook|laravel|flutter|cloud|rest|sdk|database|backend|ios|android|php|node|react|docker/i.test(t)) {
    return 'Architecture & Integrations'
  }
  if (/crm|automation|workflow|dispatch|tracking|queue|management|schedule|task|booking|driver|ride/i.test(t)) {
    return 'Operations & Workflows'
  }
  if (/stripe|paypal|subscription|billing|pricing|checkout|wallet|invoice|commission|payment/i.test(t)) {
    return 'Billing & Commercial'
  }
  if (/auth|role|permission|security|admin|token|login|access|oauth|mfa/i.test(t)) {
    return 'Security & Access'
  }
  if (/analytics|report|dashboard|metric|export|csv|telemetry|chart|insights|kpi/i.test(t)) {
    return 'Analytics & Telemetry'
  }
  return 'Core Features & Capabilities'
}

export function extractKeywords(text: string, limit = 15): string[] {
  if (!text) return []
  const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
  const words = clean.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))

  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`
    freq[bigram] = (freq[bigram] || 0) + 2
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
}

interface RawTopicEvidence {
  rawTopic: string
  normalizedTopic: string
  count: number
  locations: Set<string>
  evidenceSnippet: string
}

/**
 * Extracts candidate content topics from all scraped layers of a product.
 */
function extractProductTopics(product: ExtractedProductData): Map<string, RawTopicEvidence> {
  const topicsMap = new Map<string, RawTopicEvidence>()

  const addTopic = (phrase: string, location: string, snippet: string, weight = 1) => {
    const normalized = normalizeTopic(phrase)
    if (!normalized || normalized.length < 3) return
    const words = normalized.split(' ').filter((w) => !STOPWORDS.has(w) && w.length > 2)
    if (words.length === 0) return

    // Allow single words if they are key domain terms (>= 4 chars), or 2-3 word ngrams
    if (words.length === 1 && words[0].length < 4) return
    if (words.length > 4) return

    const key = words.join(' ')
    if (key.length < 3) return

    const existing = topicsMap.get(key)
    if (existing) {
      existing.count += weight
      existing.locations.add(location)
      if (!existing.evidenceSnippet && snippet) {
        existing.evidenceSnippet = snippet
      }
    } else {
      // Capitalize first letter of each word for clean display
      const displayTopic = phrase
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')

      topicsMap.set(key, {
        rawTopic: displayTopic,
        normalizedTopic: key,
        count: weight,
        locations: new Set([location]),
        evidenceSnippet: snippet,
      })
    }
  }

  // 1. Title
  const title = product.websiteTitle || product.productName || product.title || ''
  if (title) {
    const cleanTitle = title.replace(/[^a-zA-Z0-9\s-]/g, ' ')
    const words = cleanTitle.split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length; i++) {
      if (words[i].length >= 4) addTopic(words[i], 'Title', title, 3)
      if (i < words.length - 1) addTopic(`${words[i]} ${words[i + 1]}`, 'Title', title, 4)
      if (i < words.length - 2) addTopic(`${words[i]} ${words[i + 1]} ${words[i + 2]}`, 'Title', title, 4)
    }
  }

  // 2. H1 Headings
  const h1s = product.headings?.h1 || (product.productName ? [product.productName] : [])
  for (const h of h1s) {
    if (!h) continue
    const words = h.replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length; i++) {
      if (words[i].length >= 4) addTopic(words[i], 'H1 Heading', h, 3)
      if (i < words.length - 1) addTopic(`${words[i]} ${words[i + 1]}`, 'H1 Heading', h, 4)
    }
  }

  // 3. H2 Headings
  const h2s = product.headings?.h2 || []
  for (const h of h2s) {
    if (!h) continue
    const words = h.replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length; i++) {
      if (words[i].length >= 4) addTopic(words[i], 'H2 Headings', h, 2)
      if (i < words.length - 1) addTopic(`${words[i]} ${words[i + 1]}`, 'H2 Headings', h, 3)
      if (i < words.length - 2) addTopic(`${words[i]} ${words[i + 1]} ${words[i + 2]}`, 'H2 Headings', h, 3)
    }
  }

  // 4. Features
  const features = product.features || []
  for (const f of features) {
    if (!f) continue
    // If feature is short (under 60 chars), add the entire feature heading
    if (f.length < 50 && f.split(/\s+/).length <= 4) {
      addTopic(f, 'Features', f, 3)
    }
    const words = f.replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length; i++) {
      if (words[i].length >= 4) addTopic(words[i], 'Features', f, 2)
      if (i < words.length - 1) addTopic(`${words[i]} ${words[i + 1]}`, 'Features', f, 3)
    }
  }

  // 5. URL Slug
  const url = product.normalizedUrl || product.url || ''
  try {
    const parsed = new URL(url)
    const slugSegments = parsed.pathname.split('/').filter(Boolean)
    const lastSlug = slugSegments[slugSegments.length - 1] || ''
    const slugTerms = lastSlug.replace(/[^a-zA-Z0-9]/g, ' ').split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 3)
    for (let i = 0; i < slugTerms.length - 1; i++) {
      addTopic(`${slugTerms[i]} ${slugTerms[i + 1]}`, 'URL Slug', url, 2)
    }
  } catch {}

  // 6. Tags
  const tags = product.tags || []
  for (const t of tags) {
    if (!t) continue
    addTopic(t, 'Item Tags', t, 2)
  }

  // 7. Body Description
  const desc = product.description || ''
  if (desc) {
    const cleanDesc = desc.slice(0, 1500).replace(/[^a-zA-Z0-9\s-]/g, ' ')
    const words = cleanDesc.split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length - 1; i++) {
      if (i % 2 === 0) {
        addTopic(`${words[i]} ${words[i + 1]}`, 'Description Body', desc.slice(0, 120), 1)
      }
    }
  }

  return topicsMap
}

/**
 * Conducts a comprehensive On-Page SEO audit of an extracted product.
 */
export function auditOnPageSeo(product: ExtractedProductData): SeoOnPageAudit {
  const title = product.websiteTitle || product.productName || ''
  const titleLength = title.length
  const titleWords = title.split(/\s+/).filter(Boolean).length

  // Extract primary keyword candidates
  const candidateKeywords = extractKeywords(`${product.productName} ${product.category}`, 5)
  const mainKeyword = candidateKeywords[0] || product.productName.split(/\s+/)[0] || 'software'

  const titleLower = title.toLowerCase()
  const keywordLower = mainKeyword.toLowerCase()
  const keywordInTitle = titleLower.includes(keywordLower)

  let keywordPlacement: 'beginning' | 'middle' | 'end' | 'missing' = 'missing'
  if (keywordInTitle) {
    const idx = titleLower.indexOf(keywordLower)
    if (idx <= 15) keywordPlacement = 'beginning'
    else if (idx >= titleLength - keywordLower.length - 15) keywordPlacement = 'end'
    else keywordPlacement = 'middle'
  }

  // Description metrics
  const description = product.description || ''
  const descLength = description.length
  const descWords = description.split(/\s+/).filter(Boolean).length

  // Keyword count in description
  const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi')
  const keywordMatches = (description.match(regex) || []).length

  const keywordDensity = descWords > 0 ? (keywordMatches / descWords) * 100 : 0
  const keywordStuffingWarning = keywordDensity > 4.5

  // Headings
  const h1 = product.headings?.h1 || (product.productName ? [product.productName] : [])
  const h2Count = product.headings?.h2?.length || 0
  const h3Count = product.headings?.h3?.length || 0

  // Feature keywords
  const featureKeywords = extractKeywords((product.features || []).join(' '), 8)

  // Links & Hygiene
  const hasDemo =
    product.contactOrDemoCta !== 'Not found' ||
    Boolean(product.discoveredPages?.some((p) => p.type === 'pricing' || p.type === 'features')) ||
    (product.url && (product.url.includes('codecanyon.net') || product.url.includes('themeforest.net')))

  const hasDocs =
    Boolean(product.docsLink && product.docsLink !== 'Not found on the provided website' && product.docsLink.length > 5)
  const hasChangelog =
    Boolean(product.changelogLink && product.changelogLink !== 'Not found on the provided website' && product.changelogLink.length > 5)
  const hasSupport =
    Boolean(product.description?.toLowerCase().includes('support')) ||
    product.envatoSales?.author_name !== null

  // Readability
  let readabilityScore: 'Clear & Concise' | 'Moderate' | 'Complex / Dense' = 'Clear & Concise'
  if (descLength > 1500 || descWords > 250) {
    readabilityScore = 'Moderate'
  }
  if (descLength > 3000) {
    readabilityScore = 'Complex / Dense'
  }

  // Warnings
  const duplicateGenericWarnings: string[] = []
  if (titleLower.includes('best') || titleLower.includes('ultimate') || titleLower.includes('#1')) {
    duplicateGenericWarnings.push('Title contains generic subjective superlative ("best" / "ultimate" / "#1")')
  }
  if (titleLength < 25) {
    duplicateGenericWarnings.push('Product title is short (<25 chars); consider incorporating core benefit keywords')
  }
  if (titleLength > 100) {
    duplicateGenericWarnings.push('Title exceeds 100 characters; risk of truncation on search engine result pages')
  }

  // Missing important info
  const missingImportantInfo: string[] = []
  if (!hasDocs) missingImportantInfo.push('Public documentation or setup guide link')
  if (!hasChangelog) missingImportantInfo.push('Detailed version changelog / release history')
  if ((product.features?.length || 0) < 4) missingImportantInfo.push('Comprehensive feature bullet points')
  if ((product.integrations?.length || 0) <= 1) missingImportantInfo.push('Supported third-party integrations and APIs')

  // Canonical tag check
  const canonicalUrl = product.canonicalUrl || null
  let canonicalStatus: 'valid' | 'missing' | 'mismatched' = 'missing'
  if (canonicalUrl) {
    const normUrl = product.normalizedUrl || product.url
    canonicalStatus =
      canonicalUrl === product.url || canonicalUrl === normUrl || canonicalUrl.replace(/\/+$/, '') === normUrl.replace(/\/+$/, '')
        ? 'valid'
        : 'mismatched'
  } else {
    missingImportantInfo.push('Canonical URL tag (<link rel="canonical">)')
  }

  // Schema.org Structured Data check
  const hasStructuredData = !!product.hasStructuredData
  const structuredDataTypes = product.structuredDataTypes || []
  if (!hasStructuredData) {
    missingImportantInfo.push('Schema.org JSON-LD structured data')
  }

  // Real image alt audits
  const totalImages = product.totalImagesCount ?? 0
  const realImageAlts = typeof product.imageAltsCount === 'number' ? product.imageAltsCount : 0
  if (totalImages > 0 && realImageAlts < totalImages) {
    missingImportantInfo.push(`${totalImages - realImageAlts} image(s) missing descriptive alt text`)
  }

  // Composite Score
  let score = 50
  if (titleLength >= 30 && titleLength <= 90) score += 10
  if (keywordInTitle) score += 8
  if (keywordPlacement === 'beginning') score += 4
  if (descLength >= 200) score += 6
  if (!keywordStuffingWarning) score += 4
  if (h1.length === 1) score += 4
  if (product.tags && product.tags.length >= 3) score += 4
  if (hasDocs) score += 4
  if (hasDemo) score += 4
  if (canonicalStatus === 'valid') score += 4
  if (hasStructuredData) score += 4
  if (totalImages === 0 || realImageAlts === totalImages) score += 4
  if (missingImportantInfo.length === 0) score += 4
  score = Math.min(100, Math.max(20, score))

  return {
    url: product.url,
    product_name: product.productName,
    title,
    title_length: titleLength,
    title_words: titleWords,
    main_keyword: mainKeyword,
    keyword_in_title: keywordInTitle,
    keyword_placement: keywordPlacement,
    description_length: descLength,
    description_words: descWords,
    keyword_usage_description: keywordMatches,
    keyword_stuffing_warning: keywordStuffingWarning,
    heading_structure: {
      h1,
      h2_count: h2Count,
      h3_count: h3Count,
    },
    relevant_feature_keywords: featureKeywords,
    tags: product.tags || [],
    category_relevance: product.category || 'Software Solution',
    image_alts_count: realImageAlts,
    total_images_count: totalImages > 0 ? totalImages : undefined,
    canonical_url: canonicalUrl,
    canonical_status: canonicalStatus,
    has_structured_data: hasStructuredData,
    structured_data_types: structuredDataTypes,
    links: {
      has_demo: Boolean(hasDemo),
      has_docs: hasDocs,
      has_changelog: hasChangelog,
      has_support: hasSupport,
    },
    readability_score: readabilityScore,
    duplicate_generic_warnings: duplicateGenericWarnings,
    missing_important_info: missingImportantInfo,
    on_page_score: score,
  }
}

export interface HistoricalKeywordRanking {
  latestRank: number | null
  previousRank: number | null
  observedAt: string
}

/**
 * Executes comprehensive multi-competitor SEO search, topic extraction, and competitive intelligence.
 */
export function analyzeSeo(
  myProduct: ExtractedProductData,
  competitorProducts: ExtractedProductData[],
  userTargetKeywords: string[] = [],
  historicalRankings: Record<string, HistoricalKeywordRanking> = {}
): SeoAnalysisResult {
  const allProducts = [myProduct, ...competitorProducts]

  // 1. Audit on-page technical SEO for all products
  const audits: Record<string, SeoOnPageAudit> = {}
  for (const prod of allProducts) {
    audits[prod.url] = auditOnPageSeo(prod)
  }

  const myAudit = audits[myProduct.url]

  // 2. Extract Real Content Topics Across My Product & All Competitors
  const myTopicsMap = extractProductTopics(myProduct)
  const compTopicsMaps: Map<string, Map<string, RawTopicEvidence>> = new Map()

  for (const comp of competitorProducts) {
    compTopicsMaps.set(comp.url, extractProductTopics(comp))
  }

  // Combine unique topics
  const allUniqueTopicKeys = new Set<string>()
  myTopicsMap.forEach((_, k) => allUniqueTopicKeys.add(k))
  compTopicsMaps.forEach((map) => {
    map.forEach((_, k) => allUniqueTopicKeys.add(k))
  })

  // Build full ObservedTopic items
  const observedTopics: ObservedTopic[] = []
  const myTopicNames: string[] = []
  const compTopicNamesSet = new Set<string>()
  const sharedTopics: string[] = []
  const myOnlyTopics: string[] = []
  const competitorOnlyTopicGaps: CompetitorTopicGap[] = []

  allUniqueTopicKeys.forEach((key) => {
    const myEvidence = myTopicsMap.get(key)
    const inMyProduct = Boolean(myEvidence)

    const competitorMatches: Array<{ comp: ExtractedProductData; evidence: RawTopicEvidence }> = []
    for (const comp of competitorProducts) {
      const compEvidence = compTopicsMaps.get(comp.url)?.get(key)
      if (compEvidence) {
        competitorMatches.push({ comp, evidence: compEvidence })
      }
    }

    const inCompetitors = competitorMatches.length > 0
    const competitorNames = competitorMatches.map((m) => m.comp.productName || m.comp.websiteTitle || 'Competitor')

    // Find best display topic string
    const displayTopic = myEvidence?.rawTopic || competitorMatches[0]?.evidence.rawTopic || key

    // Collect all locations
    const locations = new Set<string>()
    if (myEvidence) myEvidence.locations.forEach((l) => locations.add(l))
    competitorMatches.forEach((m) => m.evidence.locations.forEach((l) => locations.add(`Competitor ${l}`)))

    const evidenceCount = (myEvidence?.count || 0) + competitorMatches.reduce((acc, m) => acc + m.evidence.count, 0)
    const semanticGroup = classifySemanticGroup(displayTopic)
    const evidenceSnippet = competitorMatches[0]?.evidence.evidenceSnippet || myEvidence?.evidenceSnippet

    observedTopics.push({
      topic: displayTopic,
      normalizedTopic: key,
      evidenceCount,
      locations: Array.from(locations),
      semanticGroup,
      inMyProduct,
      inCompetitors,
      competitorNames,
      evidenceSnippet,
    })

    if (inMyProduct) myTopicNames.push(displayTopic)
    if (inCompetitors) {
      compTopicNamesSet.add(displayTopic)
      if (inMyProduct) {
        sharedTopics.push(displayTopic)
      } else {
        // Competitor-Only Topic Gap
        const topComp = competitorMatches[0]
        const topEvidence = topComp.evidence.evidenceSnippet
          ? `Competitor ${Array.from(topComp.evidence.locations).join(' / ')}: "${topComp.evidence.evidenceSnippet}"`
          : `Observed in competitor ${Array.from(topComp.evidence.locations).join(', ')}`

        competitorOnlyTopicGaps.push({
          topic: displayTopic,
          evidence: topEvidence,
          affectedCompetitors: competitorNames,
          strategicImpact: `Competitors cover "${displayTopic}" in their headings and specifications. Your page lacks this terminology, conceding buyer search intent for this capability.`,
          recommendedAction: `Incorporate dedicated content, H2 headings, or bullet points explaining your workflow for "${displayTopic}".`,
        })
      }
    } else if (inMyProduct) {
      myOnlyTopics.push(displayTopic)
    }
  })

  // Sort observed topics by evidence count
  observedTopics.sort((a, b) => b.evidenceCount - a.evidenceCount)
  competitorOnlyTopicGaps.sort((a, b) => b.affectedCompetitors.length - a.affectedCompetitors.length)

  const compTopicNames = Array.from(compTopicNamesSet)

  // 3. Deterministic Content Coverage
  const myTitle = myProduct.websiteTitle || myProduct.productName || ''
  const myDesc = myProduct.description || ''
  const myH1s = myProduct.headings?.h1 || (myProduct.productName ? [myProduct.productName] : [])
  const myH2s = myProduct.headings?.h2 || []

  const titleMatched = myTopicNames.filter((t) => myTitle.toLowerCase().includes(t.toLowerCase())).slice(0, 5)
  const descMatched = myTopicNames.filter((t) => myDesc.toLowerCase().includes(t.toLowerCase())).slice(0, 8)
  const headingMatched = myTopicNames.filter((t) =>
    myH1s.some((h) => h.toLowerCase().includes(t.toLowerCase())) ||
    myH2s.some((h) => h.toLowerCase().includes(t.toLowerCase()))
  ).slice(0, 6)

  const contentCoverage: SeoContentCoverage = {
    titleTopicCoverage: {
      covered: titleMatched.length > 0 && myTitle.length >= 25 && myTitle.length <= 90,
      matchedTopics: titleMatched,
    },
    metaDescriptionCoverage: {
      covered: descMatched.length >= 2 && myDesc.length >= 120,
      matchedTopics: descMatched,
      charCount: myDesc.length,
    },
    headingCoverage: {
      h1Covered: myH1s.length > 0 && myH1s.some((h) => h.length > 5),
      h2TopicsCount: myH2s.length,
      matchedTopics: headingMatched,
    },
    bodyTopicCoverage: {
      topicMentionsCount: myTopicsMap.size,
      densityRating: myTopicsMap.size > 15 ? 'High' : myTopicsMap.size > 6 ? 'Moderate' : 'Low',
    },
    imageAltCoverage: {
      total: myProduct.totalImagesCount || 0,
      withAlt: typeof myProduct.imageAltsCount === 'number' ? myProduct.imageAltsCount : 0,
      percentage:
        (myProduct.totalImagesCount || 0) > 0
          ? Math.round(((myProduct.imageAltsCount || 0) / (myProduct.totalImagesCount || 1)) * 100)
          : 100,
    },
    structuredDataPresence: {
      present: !!myProduct.hasStructuredData,
      types: myProduct.structuredDataTypes || [],
    },
    canonicalPresence: {
      present: !!myProduct.canonicalUrl,
      status: myAudit.canonical_status || 'missing',
    },
    indexabilityStatus: {
      indexable: myAudit.canonical_status !== 'mismatched',
      notes:
        myAudit.canonical_status === 'valid'
          ? 'Canonical URL matches destination without redirect conflicts'
          : 'Review canonical markup for URL discrepancies',
    },
    internalLinkSignals: {
      discoveredPagesCount: myProduct.discoveredPages?.length || 0,
      hasDemo: Boolean(myAudit.links?.has_demo),
      hasDocs: Boolean(myAudit.links?.has_docs),
    },
  }

  // 4. Competitor SEO Profiles
  const competitorProfiles: CompetitorSeoProfile[] = competitorProducts.map((comp) => {
    const compName = comp.productName || comp.websiteTitle || 'Competitor'
    const compAudit = audits[comp.url]
    const compTopics = compTopicsMaps.get(comp.url) || new Map()

    const topicsInHeadings: string[] = []
    const compH1s = comp.headings?.h1 || []
    const compH2s = comp.headings?.h2 || []
    compTopics.forEach((ev) => {
      if (
        compH1s.some((h) => h.toLowerCase().includes(ev.normalizedTopic)) ||
        compH2s.some((h) => h.toLowerCase().includes(ev.normalizedTopic))
      ) {
        topicsInHeadings.push(ev.rawTopic)
      }
    })

    const uniqueCompTopics: string[] = []
    const missingOnMyProduct: string[] = []

    compTopics.forEach((ev, key) => {
      if (!myTopicsMap.has(key)) {
        missingOnMyProduct.push(ev.rawTopic)
        // Check if other competitors have it
        let otherHasIt = false
        for (const other of competitorProducts) {
          if (other.url !== comp.url && compTopicsMaps.get(other.url)?.has(key)) {
            otherHasIt = true
            break
          }
        }
        if (!otherHasIt) uniqueCompTopics.push(ev.rawTopic)
      }
    })

    const technicalIssues: string[] = []
    if (compAudit.canonical_status === 'missing') technicalIssues.push('Missing canonical link tag')
    if (!compAudit.has_structured_data) technicalIssues.push('Missing Schema.org structured data')
    if (compAudit.total_images_count && compAudit.image_alts_count < compAudit.total_images_count) {
      technicalIssues.push(`${compAudit.total_images_count - compAudit.image_alts_count} images missing alt text`)
    }

    const whyStronger =
      missingOnMyProduct.length > 0
        ? `Covers ${missingOnMyProduct.length} capabilities missing from your listing (${missingOnMyProduct.slice(0, 3).join(', ')}), driving superior semantic topical authority.`
        : `Feature set and heading structure align closely with your current positioning.`

    return {
      competitorName: compName,
      competitorUrl: comp.url,
      topicCount: compTopics.size,
      titleHeadingCoverage: `${topicsInHeadings.length} topics utilized in Title & Headings`,
      contentDepthSignals: {
        wordCount: (comp.description || '').split(/\s+/).filter(Boolean).length,
        featureCount: comp.features?.length || 0,
        headingCount: (comp.headings?.h1?.length || 0) + (comp.headings?.h2?.length || 0) + (comp.headings?.h3?.length || 0),
      },
      technicalIssues,
      uniqueTopics: uniqueCompTopics.slice(0, 6),
      missingOnMyProduct: missingOnMyProduct.slice(0, 8),
      whyCompetitorIsStronger: whyStronger,
      evidenceSnippet: comp.headings?.h2?.[0] || comp.features?.[0] || comp.websiteTitle,
    }
  })

  // 5. Competitive SEO Insights
  const competitiveInsights: CompetitiveSeoInsight[] = []
  competitorProfiles.forEach((profile) => {
    if (profile.missingOnMyProduct.length > 0) {
      const topMissing = profile.missingOnMyProduct.slice(0, 3).join(', ')
      competitiveInsights.push({
        competitorName: profile.competitorName,
        whatCompetitorDoesBetter: `Dedicated positioning and heading structure covering: ${topMissing}.`,
        evidence: profile.evidenceSnippet ? `Competitor markup: "${profile.evidenceSnippet}"` : `Found in competitor specifications`,
        whyItMatters: `Prospective buyers searching specifically for ${topMissing} will find competitor pages first, bypassing your product entirely.`,
        recommendedAction: `Add dedicated subheadings and bullet points explaining your capabilities regarding ${topMissing}.`,
        priority: profile.missingOnMyProduct.length >= 3 ? 'high' : 'medium',
      })
    }
  })

  // 6. Prioritized SEO Actions
  const prioritizedActions: PrioritizedSeoAction[] = []

  // Technical actions
  if (myAudit.canonical_status !== 'valid') {
    prioritizedActions.push({
      id: 'act_canonical',
      action: 'Implement canonical tag (<link rel="canonical">) matching primary URL',
      evidence: `Current canonical status: ${myAudit.canonical_status}`,
      expectedObjective: 'Prevent duplicate content indexing penalties and consolidate SERP link equity',
      priority: 'critical',
      category: 'technical',
    })
  }

  if (!myAudit.has_structured_data) {
    prioritizedActions.push({
      id: 'act_schema',
      action: 'Inject Schema.org SoftwareApplication JSON-LD markup',
      evidence: 'No JSON-LD software metadata detected on target URL',
      expectedObjective: 'Enable rich Google SERP snippet previews with price and category display',
      priority: 'high',
      category: 'technical',
    })
  }

  if (myAudit.total_images_count && myAudit.image_alts_count < myAudit.total_images_count) {
    prioritizedActions.push({
      id: 'act_images',
      action: `Add descriptive alt attributes to ${myAudit.total_images_count - myAudit.image_alts_count} images`,
      evidence: `Found ${myAudit.image_alts_count}/${myAudit.total_images_count} images with alt text`,
      expectedObjective: 'Index preview graphics in Google Image Search and comply with accessibility guidelines',
      priority: 'medium',
      category: 'technical',
    })
  }

  // Content gap actions
  if (competitorOnlyTopicGaps.length > 0) {
    const topGap = competitorOnlyTopicGaps[0]
    prioritizedActions.push({
      id: 'act_content_gap_1',
      action: `Create dedicated feature section for "${topGap.topic}"`,
      evidence: topGap.evidence,
      expectedObjective: `Close competitive content gap against ${topGap.affectedCompetitors.join(', ')}`,
      priority: 'high',
      category: 'content_gap',
    })
  }

  if (competitorOnlyTopicGaps.length > 1) {
    const secondGap = competitorOnlyTopicGaps[1]
    prioritizedActions.push({
      id: 'act_content_gap_2',
      action: `Add workflow documentation covering "${secondGap.topic}"`,
      evidence: secondGap.evidence,
      expectedObjective: `Capture long-tail search intent currently held by ${secondGap.affectedCompetitors.join(', ')}`,
      priority: 'medium',
      category: 'content_gap',
    })
  }

  // Metadata action
  if (!contentCoverage.titleTopicCoverage.covered) {
    prioritizedActions.push({
      id: 'act_title',
      action: 'Update <title> tag with primary high-intent category & framework terms',
      evidence: `Current title length is ${myTitle.length} characters with limited topic density`,
      expectedObjective: 'Improve click-through rate from marketplace and search engine results',
      priority: 'high',
      category: 'metadata',
    })
  }

  // 7. Legacy Comparison Table (adhering strictly to Rule 7: Ranking data unavailable)
  const activeKeywords = Array.from(new Set([...userTargetKeywords, ...myTopicNames.slice(0, 10)])).slice(0, 15)

  const comparisonTable: SeoKeywordComparisonRow[] = activeKeywords.map((kw) => {
    const kwLower = kw.toLowerCase().trim()
    const myTitleLower = myTitle.toLowerCase()
    const myDescLower = myDesc.toLowerCase()
    const myTagsLower = (myProduct.tags || []).map((t) => t.toLowerCase())

    const inMyTitle = myTitleLower.includes(kwLower)
    const inMyTags = myTagsLower.some((t) => t.includes(kwLower) || kwLower.includes(t))
    const inMyDesc = myDescLower.includes(kwLower)

    const inCompTitles: Record<string, boolean> = {}
    for (const comp of competitorProducts) {
      const compTitle = (comp.websiteTitle || comp.productName || '').toLowerCase()
      inCompTitles[comp.url] = compTitle.includes(kwLower)
    }

    const history = historicalRankings[kwLower]
    const myRank = history?.latestRank ?? null

    return {
      keyword: kw,
      my_rank: myRank,
      previous_rank: history?.previousRank ?? null,
      rank_trend: 'Unranked',
      rank_diff: null,
      competitor_ranks: {},
      rank_gap: null,
      search_visibility_status: myRank !== null ? 'Competitive' : 'Ranking data unavailable for this keyword',
      missing_from_my_listing: !inMyTitle && !inMyTags && !inMyDesc,
      in_my_title: inMyTitle,
      in_my_tags: inMyTags,
      in_competitor_titles: inCompTitles,
      content_strength: 'Equal',
      recommended_action: `Observed topic: maintain natural coverage across headings and specifications.`,
    }
  })

  // 8. Recommendations (Preserving SeoRecommendationItem structure)
  const recommendations: SeoRecommendationItem[] = prioritizedActions.map((act) => ({
    id: act.id,
    category: act.category === 'technical' ? 'headings' : act.category === 'metadata' ? 'title' : 'features',
    title: act.action,
    what_was_detected: act.evidence,
    why_it_matters: act.expectedObjective,
    what_should_be_changed: act.action,
    expected_benefit: act.expectedObjective,
    confidence_level: act.priority === 'critical' || act.priority === 'high' ? 'High' : 'Medium',
    triggering_source: 'Competitive SEO Crawler',
    suggested_content: act.action,
  }))

  return {
    audits,
    target_onpage_audit: myAudit,
    competitor_onpage_audit: competitorProducts[0] ? audits[competitorProducts[0].url] : undefined,
    target_keywords: myTopicNames.slice(0, 15),
    suggested_keywords: compTopicNames.slice(0, 15),
    comparison_table: comparisonTable,
    recommendations,
    search_metadata: {
      last_checked: new Date().toISOString(),
      location: 'Global (US / Worldwide)',
      engine: 'On-Page DOM & Competitive Heading Crawl',
      device: 'Desktop & Mobile',
      source: 'Direct HTML Content Topics & Heading Hierarchy',
    },
    // New Competitive SEO Fields:
    observed_topics: observedTopics.slice(0, 40),
    my_topics: myTopicNames,
    competitor_topics: compTopicNames,
    shared_topics: sharedTopics,
    competitor_only_topics: competitorOnlyTopicGaps.slice(0, 20),
    my_only_topics: myOnlyTopics,
    content_coverage: contentCoverage,
    competitor_profiles: competitorProfiles,
    competitive_insights: competitiveInsights,
    prioritized_actions: prioritizedActions,
    ranking_data_status: 'Search ranking data unavailable (no third-party SERP/keyword API connected). Showing verified on-page observed topics extracted directly from live page markup.',
    keyword_matrix: {
      top_target_keywords: myTopicNames.slice(0, 15),
      shared_keywords: sharedTopics.slice(0, 15),
      competitor_exclusive_keywords: competitorOnlyTopicGaps.map((t) => t.topic).slice(0, 15),
    },
  }
}

