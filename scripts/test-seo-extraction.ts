import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const EXPANDED_STOPWORDS = new Set([
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
  'full', 'every', 'choose', 'build', 'thousands', 'best', 'item', 'items', 'preview', 'details',
  'regular', 'extended', 'version', 'features', 'components', 'highlights', 'solution', 'solutions',
  'simple', 'fast', 'multiple', 'included', 'website', 'landing', 'core', 'distance', 'click', 'here',
  'read', 'more', 'download', 'free', 'online', 'demo', 'site', 'page', 'code', 'script', 'plugins',
  'clean', 'easy', 'great', 'good', 'perfect', 'smart', 'super', 'ultra', 'pro', 'top', 'view', 'show',
  'based', 'using', 'used', 'like', 'with', 'without', 'need', 'make', 'take', 'give', 'from', 'into',
  'total', 'various', 'different', 'level', 'type', 'mode', 'step', 'user', 'users', 'customer', 'customers',
  'coupon', 'codecanyon', 'themeforest', 'envato', 'license', 'software', 'update', 'link', 'http', 'https',
  'copyright', 'reserved', 'file', 'files', 'author', 'support', 'documentation', 'available', 'predefined',
  'add', 'ons', 'unlimited'
])

const ALLOWED_SINGLE_WORDS = new Set([
  'flutter', 'laravel', 'firebase', 'dispatch', 'tracking', 'bidding', 'courier', 'parcel',
  'rental', 'chauffeur', 'navigation', 'commission', 'analytics', 'inbox', 'chatbot', 'crm',
  'automation', 'webhook', 'api', 'stripe', 'paypal', 'wallet', 'telemetry', 'realtime',
  'multivendor', 'marketplace'
])

function normalizeTopic(term: string): string {
  if (!term) return ''
  let cleaned = term.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ')
  const words = cleaned.split(' ').map((w) => {
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'
    if ((w.endsWith('ses') || w.endsWith('xes') || w.endsWith('ches') || w.endsWith('shes')) && w.length > 4) return w.slice(0, -2)
    if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) return w.slice(0, -1)
    return w
  })
  return words.join(' ').trim()
}

function extractTopics(product: any) {
  const map = new Map<string, { display: string; count: number; locations: Set<string>; snippet: string }>()

  const add = (phrase: string, location: string, snippet: string, weight = 1) => {
    if (!phrase) return
    const normalized = normalizeTopic(phrase)
    if (!normalized || normalized.length < 3) return
    const words = normalized.split(' ').filter(w => !EXPANDED_STOPWORDS.has(w) && w.length > 2)
    if (words.length === 0) return
    if (words.length === 1 && !ALLOWED_SINGLE_WORDS.has(words[0])) return
    if (words.length > 4) return

    const key = words.join(' ')
    if (key.length < 3) return

    const display = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const existing = map.get(key)
    if (existing) {
      existing.count += weight
      existing.locations.add(location)
      if (!existing.snippet && snippet) existing.snippet = snippet
    } else {
      map.set(key, { display, count: weight, locations: new Set([location]), snippet: snippet || phrase })
    }
  }

  // 1. Tags
  for (const t of (product.tags || [])) {
    add(t, 'Item Tags', t, 4)
  }

  // 2. Features (Clean bullet prefixes)
  for (const f of (product.features || [])) {
    if (!f) continue
    const parts = f.split(/[:–—\-]/)
    if (parts[0] && parts[0].trim().length > 3 && parts[0].split(/\s+/).length <= 4) {
      add(parts[0].trim(), 'Feature Section', f, 3)
    }
    if (parts[1] && parts[1].trim().length > 3) {
      const subWords = parts[1].trim().replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w: string) => !EXPANDED_STOPWORDS.has(w.toLowerCase()) && w.length > 2)
      for (let i = 0; i < subWords.length - 1; i++) {
        add(`${subWords[i]} ${subWords[i+1]}`, 'Feature Specification', f, 2)
      }
    }
  }

  // 3. Headings
  for (const h of (product.headings?.h1 || [])) {
    const words = h.replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w: string) => !EXPANDED_STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length - 1; i++) {
      add(`${words[i]} ${words[i+1]}`, 'H1 Heading', h, 3)
      if (i < words.length - 2) add(`${words[i]} ${words[i+1]} ${words[i+2]}`, 'H1 Heading', h, 3)
    }
  }
  for (const h of (product.headings?.h2 || [])) {
    const words = h.replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w: string) => !EXPANDED_STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length - 1; i++) {
      add(`${words[i]} ${words[i+1]}`, 'H2 Heading', h, 2)
      if (i < words.length - 2) add(`${words[i]} ${words[i+1]} ${words[i+2]}`, 'H2 Heading', h, 2)
    }
  }

  // 4. Title
  const title = product.websiteTitle || product.productName || ''
  if (title) {
    const words = title.replace(/[^a-zA-Z0-9\s-]/g, ' ').split(/\s+/).filter((w: string) => !EXPANDED_STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    for (let i = 0; i < words.length - 1; i++) {
      add(`${words[i]} ${words[i+1]}`, 'Product Title', title, 3)
      if (i < words.length - 2) add(`${words[i]} ${words[i+1]} ${words[i+2]}`, 'Product Title', title, 3)
    }
  }

  return map
}

async function test() {
  const record = await prisma.comparisonAnalysis.findUnique({ where: { id: 'cmtvloivo000t6oep9oyxqg7f' } })
  const myP = record?.myProduct as any
  const comps = (record?.competitorsData as any[]) || []
  const ca = record?.commentsAnalysis as any
  const comments = ca?.all_comments || ca?.comments || []

  const myTopics = extractTopics(myP)
  console.log('Clean my topics count:', myTopics.size)

  const compMaps = comps.map(c => extractTopics(c))
  const gaps: any[] = []

  compMaps.forEach((cMap, idx) => {
    const cName = comps[idx].productName || comps[idx].websiteTitle || 'Competitor'
    cMap.forEach((val, key) => {
      if (!myTopics.has(key)) {
        const existing = gaps.find(g => g.key === key)
        if (existing) {
          if (!existing.competitors.includes(cName)) existing.competitors.push(cName)
          existing.count += val.count
        } else {
          // Count customer mentions with strict/accurate regex:
          // Either the entire phrase appears, or all individual words appear in the same comment
          const words = key.split(' ').filter(w => w.length > 2)
          let mentions = 0
          let matchingComments: string[] = []

          for (const c of comments) {
            const text = (c.comment_text || c.text || '').toLowerCase()
            if (!text) continue

            // 1. Exact phrase check
            if (text.includes(key)) {
              mentions++
              if (matchingComments.length < 2) matchingComments.push(text.slice(0, 100))
              continue
            }

            // 2. Multi-word: check if all distinctive words (>3 chars) are in the comment
            if (words.length >= 2) {
              const allWordsMatch = words.every(w => text.includes(w))
              if (allWordsMatch) {
                mentions++
                if (matchingComments.length < 2) matchingComments.push(text.slice(0, 100))
              }
            } else if (words.length === 1 && ALLOWED_SINGLE_WORDS.has(words[0])) {
              if (text.includes(words[0])) {
                mentions++
                if (matchingComments.length < 2) matchingComments.push(text.slice(0, 100))
              }
            }
          }

          const isHighValue = mentions >= 3 || (mentions > 0 && comps.length >= 2) || (existing?.competitors.length || 1) >= 2

          gaps.push({
            key,
            topic: val.display,
            competitors: [cName],
            count: val.count,
            mentions,
            isHighValue,
            evidence: val.snippet,
            sampleComment: matchingComments[0]
          })
        }
      }
    })
  })

  gaps.sort((a, b) => b.mentions - a.mentions || b.competitors.length - a.competitors.length || b.count - a.count)

  console.log('Total competitor gaps:', gaps.length)
  console.log('High-value gaps count:', gaps.filter(g => g.isHighValue).length)
  console.log('Top 8 gaps with accurate customer mentions:')
  gaps.slice(0, 8).forEach((g, i) => {
    console.log(`${i + 1}. [${g.topic}] - Comps: ${g.competitors.length} | Customer Mentions: ${g.mentions} | HighValue: ${g.isHighValue}`);
    if (g.sampleComment) console.log(`   Customer quote: "${g.sampleComment}"`);
  })
}

test().finally(() => prisma.$disconnect())
