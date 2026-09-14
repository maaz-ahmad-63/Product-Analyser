// src/services/website-analyzer/semantic-embedder.ts
// Embedding provider abstraction with OpenAI vector support and a local high-dimensional semantic vectorizer

import crypto from 'crypto'

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}

/**
 * Configurable semantic clustering threshold.
 * Default is 0.65, which cleanly separates distinct runtime issues (e.g. PHP vs Flutter vs iOS)
 * while reliably grouping semantically equivalent complaint phrasings.
 */
export const DEFAULT_SEMANTIC_CLUSTER_THRESHOLD = 0.65

export function getSemanticClusterThreshold(): number {
  if (process.env.SEMANTIC_CLUSTER_THRESHOLD) {
    const parsed = parseFloat(process.env.SEMANTIC_CLUSTER_THRESHOLD)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1) {
      return parsed
    }
  }
  return DEFAULT_SEMANTIC_CLUSTER_THRESHOLD
}

/**
 * Computes cosine similarity between two normalized vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return Math.max(0, Math.min(1, dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))))
}

// In-memory embedding cache to avoid recomputing identical comment embeddings across runs
const embeddingCache = new Map<string, number[]>()

function getCacheKey(text: string, providerName: string): string {
  return `${providerName}:${crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex')}`
}

/**
 * Remote OpenAI-compatible vector embedding provider (e.g. text-embedding-3-small).
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey?: string, baseUrl?: string, model?: string) {
    this.apiKey = (apiKey || process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || '').trim()
    this.baseUrl = (baseUrl || process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
    this.model = model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  }

  isAvailable(): boolean {
    // Note: Groq does not support /embeddings; check that we aren't pointing at a host known to lack embeddings without a dedicated key
    return Boolean(this.apiKey && !this.baseUrl.includes('groq.com'))
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI embedding provider is not configured or unavailable on this endpoint.')
    }

    const uncachedIndices: number[] = []
    const uncachedTexts: string[] = []
    const results: number[][] = new Array(texts.length)

    for (let i = 0; i < texts.length; i++) {
      const key = getCacheKey(texts[i], this.model)
      if (embeddingCache.has(key)) {
        results[i] = embeddingCache.get(key)!
      } else {
        uncachedIndices.push(i)
        uncachedTexts.push(texts[i])
      }
    }

    if (uncachedTexts.length > 0) {
      const endpoint = `${this.baseUrl}/embeddings`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: uncachedTexts,
        }),
      })

      if (!res.ok) {
        throw new Error(`Embedding API failed with status ${res.status}: ${await res.text()}`)
      }

      const data = await res.json()
      const returnedEmbeddings: Array<{ embedding: number[]; index: number }> = data.data || []

      for (let j = 0; j < returnedEmbeddings.length; j++) {
        const item = returnedEmbeddings[j]
        const origIndex = uncachedIndices[item.index ?? j]
        results[origIndex] = item.embedding
        embeddingCache.set(getCacheKey(texts[origIndex], this.model), item.embedding)
      }
    }

    return results
  }
}

/**
 * Domain dictionary of discriminative technical entities and root intents.
 * Comments that share the same runtime entity (e.g. PHP 8 vs Flutter 3 vs iOS 17)
 * receive significant orthogonal projection in the vector space.
 */
const TECHNICAL_ENTITIES: Record<string, number> = {
  // Runtimes & Languages
  php: 1,
  'php 8': 1,
  'php 8.1': 1,
  'php 8.2': 1,
  'php 8.3': 1,
  php8: 1,
  laravel: 2,
  flutter: 3,
  'flutter 3': 3,
  node: 4,
  'node 20': 4,
  nodejs: 4,
  ios: 5,
  'ios 17': 5,
  'ios 18': 5,
  android: 6,
  'android 14': 6,
  'android 15': 6,
  react: 7,
  vue: 8,
  python: 9,
  docker: 10,
  mysql: 11,
  nginx: 12,
  apache: 13,
  composer: 14,
  npm: 15,
  wordpress: 16,
  woocommerce: 17,
  stripe: 18,
  paypal: 19,
}

// Intent Action & Module Stems
const ACTION_STEMS: Record<string, number> = {
  install: 21,
  installation: 21,
  installer: 21,
  upload: 21,
  uploaded: 21,
  plugin: 21,
  addon: 21,
  extension: 21,
  package: 21,
  setup: 22,
  configure: 22,
  deploy: 22,
  database: 23,
  migration: 23,
  crash: 24,
  fail: 24,
  fails: 24,
  failed: 24,
  failure: 24,
  cant: 24,
  "can't": 24,
  cannot: 24,
  unable: 24,
  error: 24,
  fatal: 24,
  freeze: 24,
  broken: 25,
  work: 25,
  working: 25,
  version: 26,
  compatibility: 26,
  compatible: 26,
  incompatible: 26,
  deprecated: 27,
  mismatch: 27,
  slow: 28,
  lag: 28,
  speed: 28,
  timeout: 28,
  performance: 28,
  doc: 29,
  documentation: 29,
  guide: 29,
  tutorial: 29,
  manual: 29,
  support: 30,
  ticket: 30,
  reply: 30,
  refund: 31,
  payment: 31,
  license: 31,
  security: 32,
  vulnerability: 32,
  exploit: 32,
  ui: 33,
  ux: 33,
  design: 33,
  theme: 33,
  'dark mode': 33,
  darkmode: 33,
  missing: 34,
  feature: 34,
  request: 34,
}

function stemWord(w: string): string {
  if (w.startsWith('incompat') || w.startsWith('compat')) return 'compat'
  if (w.startsWith('install')) return 'install'
  if (w.startsWith('fail')) return 'fail'
  if (w.startsWith('crash')) return 'crash'
  if (w.startsWith('upload')) return 'upload'
  if (w.startsWith('plugin') || w.startsWith('addon') || w.startsWith('module') || w.startsWith('extens')) return 'package'
  if (w.startsWith('doc') || w.startsWith('guide') || w.startsWith('tutorial')) return 'doc'
  if (w.startsWith('perform') || w.startsWith('slow') || w.startsWith('speed') || w.startsWith('lag')) return 'perf'
  if (w.startsWith('refund') || w.startsWith('bill') || w.startsWith('charg')) return 'billing'
  return w.replace(/(?:ation|ations|ings|ing|ed|ies|es|s)$/, '')
}

const VECTOR_DIMENSIONS = 128

/**
 * Built-in Hybrid Semantic Vector Provider.
 * Deterministic, offline-safe, and zero-cost.
 * Constructs normalized 128-dimensional dense vectors combining:
 * 1. Technical entity and version tokens
 * 2. Problem action and intent stems
 * 3. Sublinear character-gram and word-gram hashing with suffix stemming
 * 4. L2 unit-sphere normalization (ensures cosine similarity is strictly bounded in [0, 1])
 */
export class HybridSemanticVectorProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedSingle(text))
  }

  embedSingle(text: string): number[] {
    const key = getCacheKey(text, 'hybrid-v1')
    if (embeddingCache.has(key)) {
      return embeddingCache.get(key)!
    }

    const clean = text.toLowerCase().trim()
    const vector = new Float64Array(VECTOR_DIMENSIONS)

    // 1. Technical Entity Weights (Dimensions 0 - 29)
    for (const [entity, dim] of Object.entries(TECHNICAL_ENTITIES)) {
      if (clean.includes(entity)) {
        vector[dim % 30] += 3.0 // High weight to keep distinct runtimes separate
      }
    }

    // 2. Action & Intent Stem Weights (Dimensions 30 - 59)
    for (const [stem, dim] of Object.entries(ACTION_STEMS)) {
      if (clean.includes(stem)) {
        vector[30 + (dim % 30)] += 2.2
      }
    }

    // 3. Word Token Hashing with Stemming (Dimensions 60 - 99)
    const rawWords = clean.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
    const words = rawWords.map((w) => stemWord(w))
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const hash = this.simpleHash(word)
      const dim = 60 + (Math.abs(hash) % 40)
      vector[dim] += 1.2

      // Word Bigrams
      if (i < words.length - 1) {
        const bigram = `${word}_${words[i + 1]}`
        const biHash = this.simpleHash(bigram)
        const biDim = 60 + (Math.abs(biHash) % 40)
        vector[biDim] += 1.4
      }
    }

    // 4. Character 3-Gram Hashing (Dimensions 100 - 127) for subword similarity
    for (let i = 0; i < clean.length - 2; i++) {
      const trigram = clean.substring(i, i + 3)
      const triHash = this.simpleHash(trigram)
      const dim = 100 + (Math.abs(triHash) % 28)
      vector[dim] += 0.35
    }

    // 5. L2 Normalization
    let norm = 0
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      norm += vector[i] * vector[i]
    }

    const normalized = new Array<number>(VECTOR_DIMENSIONS)
    const sqrtNorm = Math.sqrt(norm) || 1.0

    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      normalized[i] = vector[i] / sqrtNorm
    }

    embeddingCache.set(key, normalized)
    return normalized
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return hash
  }
}

/**
 * Factory function to retrieve the active embedding provider.
 * Uses OpenAIEmbeddingProvider if an active key is present,
 * otherwise falls back to HybridSemanticVectorProvider.
 */
export function getActiveEmbeddingProvider(): EmbeddingProvider {
  const openAiProvider = new OpenAIEmbeddingProvider()
  if (openAiProvider.isAvailable()) {
    return openAiProvider
  }
  return new HybridSemanticVectorProvider()
}
