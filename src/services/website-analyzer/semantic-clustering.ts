// src/services/website-analyzer/semantic-clustering.ts
// True semantic issue clustering for public customer comments using vector embeddings and cosine similarity

import { PublicComment } from './types'
import {
  EmbeddingProvider,
  getActiveEmbeddingProvider,
  getSemanticClusterThreshold,
  cosineSimilarity,
  HybridSemanticVectorProvider,
} from './semantic-embedder'

export interface SemanticCluster {
  clusterId: string
  issueLabel: string
  broadCategory: string
  mentionCount: number
  representativeComment: string
  supportingComments: string[]
  sentimentDistribution: {
    negative: number
    mixed: number
    neutral: number
    positive: number
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number
  isCritical: boolean
  sourceUrl: string | null
  comments: PublicComment[]
  avgSimilarity: number
}

interface ActiveCluster {
  id: string
  broadCategory: string
  centroid: number[]
  comments: PublicComment[]
  vectors: number[][]
}

/**
 * Deterministically generates a clean, grounded human-readable label for a cluster of comments.
 */
export function generateDeterministicIssueLabel(comments: PublicComment[], broadCategory: string): string {
  if (!comments || comments.length === 0) return `${broadCategory} Issue`

  const combinedText = comments.map((c) => c.comment_text).join(' ').toLowerCase()

  // 1. Detect Technology / Runtime / Entity
  let entity = ''
  if (combinedText.includes('php 8.3') || combinedText.includes('php 8.2') || combinedText.includes('php 8.1') || combinedText.includes('php 8') || combinedText.includes('php8')) {
    entity = 'PHP 8'
  } else if (combinedText.includes('php')) {
    entity = 'PHP'
  } else if (combinedText.includes('flutter 3') || combinedText.includes('flutter')) {
    entity = 'Flutter 3'
  } else if (combinedText.includes('ios 18') || combinedText.includes('ios 17') || combinedText.includes('ios')) {
    entity = 'iOS 17'
  } else if (combinedText.includes('android 15') || combinedText.includes('android 14') || combinedText.includes('android')) {
    entity = 'Android'
  } else if (combinedText.includes('node 20') || combinedText.includes('node')) {
    entity = 'Node.js'
  } else if (combinedText.includes('laravel')) {
    entity = 'Laravel'
  } else if (combinedText.includes('docker')) {
    entity = 'Docker'
  } else if (combinedText.includes('wordpress')) {
    entity = 'WordPress'
  } else if (combinedText.includes('mysql') || combinedText.includes('database') || combinedText.includes('sql')) {
    entity = 'Database'
  } else if (combinedText.includes('dark mode') || combinedText.includes('darkmode')) {
    entity = 'Dark Mode'
  } else if (combinedText.includes('stripe') || combinedText.includes('paypal') || combinedText.includes('payment')) {
    entity = 'Payment Gateway'
  }

  // 2. Detect Action / Defect Stem
  let action = ''
  if (combinedText.includes('deprecated')) {
    action = 'Deprecated Function'
  } else if (combinedText.includes('mismatch')) {
    action = 'Version Mismatch'
  } else if (combinedText.includes('upload')) {
    action = 'Upload & Installation'
  } else if (combinedText.includes('install') || combinedText.includes('installer')) {
    action = 'Installation Failure'
  } else if (combinedText.includes('crash') || combinedText.includes('fatal error') || combinedText.includes('500 error') || combinedText.includes('white screen')) {
    action = 'Runtime Crash'
  } else if (combinedText.includes('bug') || combinedText.includes('broken') || combinedText.includes('not working') || combinedText.includes("doesn't work")) {
    action = 'Functionality Bug'
  } else if (combinedText.includes('compatibility') || combinedText.includes('compatible') || combinedText.includes('incompatible')) {
    action = 'Compatibility'
  } else if (combinedText.includes('slow') || combinedText.includes('lag') || combinedText.includes('speed') || combinedText.includes('timeout')) {
    action = 'Performance Latency'
  } else if (combinedText.includes('doc') || combinedText.includes('guide') || combinedText.includes('instruction')) {
    action = 'Documentation Deficiency'
  } else if (combinedText.includes('support') || combinedText.includes('no reply') || combinedText.includes('ticket')) {
    action = 'Support Responsiveness'
  } else if (combinedText.includes('refund') || combinedText.includes('charge')) {
    action = 'Refund / Billing'
  }

  if (entity && action) {
    return `${entity} ${action}`
  } else if (entity) {
    return `${entity} ${broadCategory}`
  } else if (action) {
    return `${action} (${broadCategory})`
  }

  // Fallback: Use most descriptive comment's snippet or broad category
  const longest = [...comments].sort((a, b) => b.comment_text.length - a.comment_text.length)[0]
  const cleanSnippet = longest.comment_text
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .slice(0, 4)
    .join(' ')
  return cleanSnippet.length > 5 ? `${cleanSnippet} (${broadCategory})` : `${broadCategory} Issue`
}

/**
 * Optional, safe LLM refiner to polish the deterministic label.
 * Strictly constrained to the comments provided; falls back silently if unavailable.
 */
export async function refineIssueLabelWithLlm(
  comments: PublicComment[],
  fallbackLabel: string
): Promise<string> {
  const apiKey = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim()
  const baseUrl = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey || baseUrl.length === 0) {
    return fallbackLabel
  }

  const commentSamples = comments.slice(0, 5).map((c) => `- "${c.comment_text.slice(0, 160)}"`).join('\n')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000) // 4 second safety timeout

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a technical issue classifier. Given the following customer comments, output a concise 2-4 word human-readable issue title (e.g., "PHP 8 Compatibility", "Plugin Upload Failure", "Flutter 3 Version Mismatch"). Output strict JSON: { "issueLabel": "string" }. Do NOT invent facts or features not mentioned in the quotes.',
          },
          {
            role: 'user',
            content: `Customer comments:\n${commentSamples}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    clearTimeout(timeout)

    if (!res.ok) return fallbackLabel

    const data = await res.json()
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}')
    if (parsed.issueLabel && typeof parsed.issueLabel === 'string' && parsed.issueLabel.length >= 3 && parsed.issueLabel.length <= 60) {
      return parsed.issueLabel.trim()
    }
  } catch {
    // Fail silently to deterministic label
  }

  return fallbackLabel
}

export function getIntentFamily(comment: PublicComment): string {
  const t = (comment.comment_text || '').toLowerCase()
  const topic = comment.topic || ''

  // 1. Technical defects (compatibility, bugs, runtime errors, installation, setup, performance)
  if (
    topic === 'compatibility_problem' ||
    topic === 'bugs_errors' ||
    topic === 'installation_problems' ||
    topic === 'slow_performance' ||
    /\b(php|flutter|node|ios|android|install|crash|bug|error|fatal|fail|fails|version|upload|setup|broken|not working|doesn't work|compatibility)\b/i.test(t)
  ) {
    return 'technical_defect'
  }
  // 2. Feature & UI requests
  if (
    topic === 'missing_feature' ||
    topic === 'feature_suggestion' ||
    topic === 'improvement_suggestion' ||
    /\b(dark mode|feature request|wish it had|please add|can you add)\b/i.test(t)
  ) {
    return 'feature_request'
  }
  // 3. Documentation
  if (topic === 'poor_documentation' || /\b(doc|documentation|guide|manual|tutorial)\b/i.test(t)) {
    return 'documentation'
  }
  // 4. Support, Billing, Refund, Payment
  if (topic === 'poor_support' || topic === 'pricing_dissatisfaction' || /\b(refund|payment|license|support|ticket)\b/i.test(t)) {
    return 'commercial_support'
  }

  return 'general'
}

export function determineClusterCategory(comments: PublicComment[]): string {
  const counts: Record<string, number> = {}
  for (const c of comments) {
    const cat = c.topic_label || 'Other'
    counts[cat] = (counts[cat] || 0) + 1
  }

  const allText = comments.map((c) => c.comment_text.toLowerCase()).join(' ')
  if (allText.includes('php') || allText.includes('flutter') || allText.includes('ios') || allText.includes('version') || allText.includes('compatibility')) {
    return 'Compatibility'
  }

  if (allText.includes('install') || allText.includes('setup') || allText.includes('upload') || allText.includes('composer') || allText.includes('deploy')) {
    return 'Installation and setup'
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other'
}

/**
 * Recomputes normalized centroid vector for a cluster.
 */
function updateCentroid(vectors: number[][]): number[] {
  const dims = vectors[0].length
  const centroid = new Float64Array(dims)

  for (const v of vectors) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += v[i]
    }
  }

  let norm = 0
  for (let i = 0; i < dims; i++) {
    norm += centroid[i] * centroid[i]
  }

  const sqrtNorm = Math.sqrt(norm) || 1.0
  const normalized = new Array<number>(dims)
  for (let i = 0; i < dims; i++) {
    normalized[i] = centroid[i] / sqrtNorm
  }

  return normalized
}

/**
 * Clusters comments semantically using vector embeddings and incremental centroid grouping.
 */
export async function clusterCommentsSemantically(
  comments: PublicComment[],
  options?: {
    threshold?: number
    provider?: EmbeddingProvider
    useLlmLabels?: boolean
  }
): Promise<SemanticCluster[]> {
  if (!comments || comments.length === 0) return []

  const threshold = options?.threshold ?? getSemanticClusterThreshold()
  const provider = options?.provider ?? getActiveEmbeddingProvider()

  // 1. Candidate Pre-Filtering by intent families
  const intentPools = new Map<string, PublicComment[]>()
  for (const c of comments) {
    const family = getIntentFamily(c)
    if (!intentPools.has(family)) {
      intentPools.set(family, [])
    }
    intentPools.get(family)!.push(c)
  }

  const allClusters: SemanticCluster[] = []
  let globalClusterIndex = 1

  // 2. Cluster each candidate pool semantically
  const intentEntries = Array.from(intentPools.entries())
  for (let poolIdx = 0; poolIdx < intentEntries.length; poolIdx++) {
    const [familyKey, poolComments] = intentEntries[poolIdx]
    const commentTexts = poolComments.map((c: PublicComment) => c.comment_text)
    const vectors = await provider.embed(commentTexts)

    const activeClusters: ActiveCluster[] = []

    for (let i = 0; i < poolComments.length; i++) {
      const comment = poolComments[i]
      const vector = vectors[i]

      let bestCluster: ActiveCluster | null = null
      let bestSimilarity = -1

      for (const cluster of activeClusters) {
        const sim = cosineSimilarity(vector, cluster.centroid)
        if (sim > bestSimilarity) {
          bestSimilarity = sim
          bestCluster = cluster
        }
      }

      if (bestCluster && bestSimilarity >= threshold) {
        bestCluster.comments.push(comment)
        bestCluster.vectors.push(vector)
        bestCluster.centroid = updateCentroid(bestCluster.vectors)
      } else {
        activeClusters.push({
          id: `cluster_${familyKey.slice(0, 4)}_${globalClusterIndex++}`,
          broadCategory: comment.topic_label || 'Other',
          centroid: [...vector],
          comments: [comment],
          vectors: [vector],
        })
      }
    }

    // 3. Convert active clusters to SemanticCluster records with grounded labels
    for (const ac of activeClusters) {
      const mentionCount = ac.comments.length
      const clusterBroadCategory = determineClusterCategory(ac.comments)
      const deterministicLabel = generateDeterministicIssueLabel(ac.comments, clusterBroadCategory)

      const issueLabel = options?.useLlmLabels
        ? await refineIssueLabelWithLlm(ac.comments, deterministicLabel)
        : deterministicLabel

      let bestRep = ac.comments[0]
      let bestRepDist = -1
      let similaritySum = 0

      for (let i = 0; i < ac.comments.length; i++) {
        const sim = cosineSimilarity(ac.vectors[i], ac.centroid)
        similaritySum += sim
        if (sim > bestRepDist) {
          bestRepDist = sim
          bestRep = ac.comments[i]
        }
      }

      const avgSimilarity = Math.round((similaritySum / mentionCount) * 100) / 100

      const sentimentDist = { negative: 0, mixed: 0, neutral: 0, positive: 0 }
      let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      let isCritical = false

      for (const c of ac.comments) {
        if (c.sentiment === 'negative') sentimentDist.negative++
        else if (c.sentiment === 'mixed') sentimentDist.mixed++
        else if (c.sentiment === 'positive') sentimentDist.positive++
        else sentimentDist.neutral++

        if (c.severity === 'critical') {
          highestSeverity = 'critical'
          isCritical = true
        } else if (c.severity === 'high' && highestSeverity !== 'critical') {
          highestSeverity = 'high'
        } else if (c.severity === 'medium' && highestSeverity === 'low') {
          highestSeverity = 'medium'
        }
      }

      const confidenceScore = Math.min(
        1.0,
        Math.round((0.75 + (mentionCount > 1 ? 0.15 : 0) + (isCritical ? 0.1 : 0)) * 100) / 100
      )

      allClusters.push({
        clusterId: ac.id,
        issueLabel,
        broadCategory: clusterBroadCategory,
        mentionCount,
        representativeComment: bestRep.comment_text,
        supportingComments: ac.comments.map((c) => c.comment_text),
        sentimentDistribution: sentimentDist,
        severity: highestSeverity,
        confidenceScore,
        isCritical,
        sourceUrl: bestRep.comment_url || ac.comments.find((c) => c.comment_url)?.comment_url || null,
        comments: ac.comments,
        avgSimilarity,
      })
    }
  }

  // Sort clusters: recurring (>= 2) & critical first, then by mention count descending
  allClusters.sort((a, b) => {
    if (a.isCritical && !b.isCritical) return -1
    if (b.isCritical && !a.isCritical) return 1
    return b.mentionCount - a.mentionCount
  })

  return allClusters
}

/**
 * Synchronous variant of semantic comment clustering using local HybridSemanticVectorProvider.
 */
export function clusterCommentsSemanticallySync(
  comments: PublicComment[],
  threshold?: number
): SemanticCluster[] {
  if (!comments || comments.length === 0) return []
  const thresh = threshold ?? getSemanticClusterThreshold()
  const localProvider = new HybridSemanticVectorProvider()

  // 1. Candidate Pre-Filtering by intent families
  const intentPools = new Map<string, PublicComment[]>()
  for (const c of comments) {
    const family = getIntentFamily(c)
    if (!intentPools.has(family)) {
      intentPools.set(family, [])
    }
    intentPools.get(family)!.push(c)
  }

  const allClusters: SemanticCluster[] = []
  let globalClusterIndex = 1

  const syncIntentEntries = Array.from(intentPools.entries())
  for (let poolIdx = 0; poolIdx < syncIntentEntries.length; poolIdx++) {
    const [familyKey, poolComments] = syncIntentEntries[poolIdx]
    const vectors = poolComments.map((c: PublicComment) => localProvider.embedSingle(c.comment_text))
    const activeClusters: ActiveCluster[] = []

    for (let i = 0; i < poolComments.length; i++) {
      const comment = poolComments[i]
      const vector = vectors[i]

      let bestCluster: ActiveCluster | null = null
      let bestSimilarity = -1

      for (const cluster of activeClusters) {
        const sim = cosineSimilarity(vector, cluster.centroid)
        if (sim > bestSimilarity) {
          bestSimilarity = sim
          bestCluster = cluster
        }
      }

      if (bestCluster && bestSimilarity >= thresh) {
        bestCluster.comments.push(comment)
        bestCluster.vectors.push(vector)
        bestCluster.centroid = updateCentroid(bestCluster.vectors)
      } else {
        activeClusters.push({
          id: `cluster_${familyKey.slice(0, 4)}_${globalClusterIndex++}`,
          broadCategory: comment.topic_label || 'Other',
          centroid: [...vector],
          comments: [comment],
          vectors: [vector],
        })
      }
    }

    for (const ac of activeClusters) {
      const mentionCount = ac.comments.length
      const clusterBroadCategory = determineClusterCategory(ac.comments)
      const issueLabel = generateDeterministicIssueLabel(ac.comments, clusterBroadCategory)

      let bestRep = ac.comments[0]
      let bestRepDist = -1
      let similaritySum = 0

      for (let i = 0; i < ac.comments.length; i++) {
        const sim = cosineSimilarity(ac.vectors[i], ac.centroid)
        similaritySum += sim
        if (sim > bestRepDist) {
          bestRepDist = sim
          bestRep = ac.comments[i]
        }
      }

      const avgSimilarity = Math.round((similaritySum / mentionCount) * 100) / 100

      const sentimentDist = { negative: 0, mixed: 0, neutral: 0, positive: 0 }
      let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      let isCritical = false

      for (const c of ac.comments) {
        if (c.sentiment === 'negative') sentimentDist.negative++
        else if (c.sentiment === 'mixed') sentimentDist.mixed++
        else if (c.sentiment === 'positive') sentimentDist.positive++
        else sentimentDist.neutral++

        if (c.severity === 'critical') {
          highestSeverity = 'critical'
          isCritical = true
        } else if (c.severity === 'high' && highestSeverity !== 'critical') {
          highestSeverity = 'high'
        } else if (c.severity === 'medium' && highestSeverity === 'low') {
          highestSeverity = 'medium'
        }
      }

      const confidenceScore = Math.min(
        1.0,
        Math.round((0.75 + (mentionCount > 1 ? 0.15 : 0) + (isCritical ? 0.1 : 0)) * 100) / 100
      )

      allClusters.push({
        clusterId: ac.id,
        issueLabel,
        broadCategory: clusterBroadCategory,
        mentionCount,
        representativeComment: bestRep.comment_text,
        supportingComments: ac.comments.map((c) => c.comment_text),
        sentimentDistribution: sentimentDist,
        severity: highestSeverity,
        confidenceScore,
        isCritical,
        sourceUrl: bestRep.comment_url || ac.comments.find((c) => c.comment_url)?.comment_url || null,
        comments: ac.comments,
        avgSimilarity,
      })
    }
  }

  allClusters.sort((a, b) => {
    if (a.isCritical && !b.isCritical) return -1
    if (b.isCritical && !a.isCritical) return 1
    return b.mentionCount - a.mentionCount
  })

  return allClusters
}

