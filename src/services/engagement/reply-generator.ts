export type CommentClassification =
  | 'appreciation'
  | 'pre_sale_question'
  | 'installation_issue'
  | 'technical_issue'
  | 'compatibility_question'
  | 'feature_request'
  | 'documentation_question'
  | 'refund_request'
  | 'support_request'
  | 'follow_up'
  | 'complaint'
  | 'abusive_or_spam'
  | 'other'

export interface ThreadMessageContext {
  authorType: 'customer' | 'seller' | 'moderator'
  authorUsername: string
  messageText: string
  messageCreatedAt?: string | null
}

export interface ProductContext {
  productName: string
  productUrl?: string
  description?: string | null
  features?: string[]
  docsLink?: string | null
  supportPolicy?: string | null
  refundPolicy?: string | null
  supportedPlatforms?: string[]
}

export interface GeneratedReplyResult {
  classification: CommentClassification
  reply: string
  confidence: number
  requires_human_review: boolean
  reason: string
}

export class ReplyGeneratorService {
  /**
   * Generates a context-aware author reply following strict business rules.
   */
  async generateReply(
    latestMessage: string,
    customerUsername: string,
    threadHistory: ThreadMessageContext[],
    product: ProductContext,
    customAiConfig?: { apiKey?: string; model?: string; baseURL?: string }
  ): Promise<GeneratedReplyResult> {
    const apiKey = (customAiConfig?.apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim()

    if (apiKey || process.env.AI_BASE_URL || customAiConfig?.baseURL) {
      try {
        const aiResult = await this.callAiModel(
          latestMessage,
          customerUsername,
          threadHistory,
          product,
          apiKey,
          customAiConfig?.model,
          customAiConfig?.baseURL
        )
        if (aiResult) {
          return aiResult
        }
      } catch (err) {
        console.error('AI generation failed, falling back to deterministic engine:', err)
      }
    }

    // High quality deterministic fallback generator
    return this.generateDeterministicReply(latestMessage, customerUsername, threadHistory, product)
  }

  private async callAiModel(
    latestMessage: string,
    customerUsername: string,
    threadHistory: ThreadMessageContext[],
    product: ProductContext,
    apiKey: string,
    overrideModel?: string,
    overrideBaseUrl?: string
  ): Promise<GeneratedReplyResult | null> {
    const systemPrompt = `You are the official product author for "${product.productName}".
Generate professional, courteous, and accurate customer support replies on the Envato Marketplace (CodeCanyon/ThemeForest).

PRODUCT KNOWLEDGE:
- Product Name: ${product.productName}
- Product URL: ${product.productUrl || 'N/A'}
- Description: ${product.description || 'Verified Envato Item'}
- Verified Features: ${(product.features || []).slice(0, 20).join(', ') || 'N/A'}
- Public Docs Link: ${product.docsLink || 'Included in the downloaded item package'}
- Support Policy: ${product.supportPolicy || 'Standard 6 months Envato item support'}

CRITICAL RULES:
1. Reply directly as the author to @${customerUsername}.
2. Maintain existing thread context. Answer the latest message directly. Do NOT repeat previous answers.
3. NEVER invent features, compatibility, fixes, timelines, discounts, refunds, or guarantees that are not verified.
4. NEVER ask for passwords, private API keys, payment info, or database credentials.
5. For technical bugs or crashes: request exact error message, environment (PHP/Node/Flutter version), and reproduction steps.
6. For refund requests: politely direct to the official Envato refund process (Codecanyon/ThemeForest refund portal).
7. For abusive/angry comments: remain calm, empathetic, and invite them to open a support ticket with order ID.
8. For feature requests: acknowledge warmly without promising any release timeline.
9. For appreciation: thank the customer warmly for choosing the product.
10. Keep replies concise, professional, and well-structured.

Output strictly valid JSON with this schema:
{
  "classification": "appreciation" | "pre_sale_question" | "installation_issue" | "technical_issue" | "compatibility_question" | "feature_request" | "documentation_question" | "refund_request" | "support_request" | "follow_up" | "complaint" | "abusive_or_spam" | "other",
  "reply": "Exact drafted reply text",
  "confidence": 0.95,
  "requires_human_review": true | false,
  "reason": "Brief rationale for classification and review requirement"
}`

    const historyFormatted = threadHistory.map((m) => `[${m.authorType.toUpperCase()} - @${m.authorUsername}]: ${m.messageText}`).join('\n')

    const userPrompt = `THREAD HISTORY:\n${historyFormatted || 'No previous messages in thread.'}\n\nLATEST CUSTOMER MESSAGE (@${customerUsername}):\n"${latestMessage}"`

    const model = overrideModel || process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const rawBaseUrl = overrideBaseUrl || process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const endpoint = `${rawBaseUrl.replace(/\/+$/, '')}/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2, // Low randomness for consistent business replies
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`AI API returned status ${res.status} from ${endpoint}: ${errText}`)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    let jsonString = content.trim()
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    }

    const parsed = JSON.parse(jsonString) as GeneratedReplyResult
    return {
      classification: parsed.classification || 'other',
      reply: parsed.reply?.trim() || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      requires_human_review: typeof parsed.requires_human_review === 'boolean' ? parsed.requires_human_review : true,
      reason: parsed.reason || 'Generated by AI assistant',
    }
  }

  /**
   * Deterministic expert fallback when OpenAI is not configured or fails.
   */
  private generateDeterministicReply(
    latestMessage: string,
    customerUsername: string,
    threadHistory: ThreadMessageContext[],
    product: ProductContext
  ): GeneratedReplyResult {
    const textLower = latestMessage.toLowerCase()
    const pName = product.productName || 'our product'
    const docs = product.docsLink && product.docsLink !== 'Not found on the provided website'
      ? `You can also check our documentation here: ${product.docsLink}`
      : 'Comprehensive documentation and setup instructions are included inside the item download package.'

    // 1. Abusive or Spam
    if (
      /\b(scam|fraud|thief|cheat|trash|idiot|fake|worst)\b/i.test(textLower)
    ) {
      return {
        classification: 'abusive_or_spam',
        reply: `Hi @${customerUsername},\n\nWe are truly sorry to hear about your frustration. We take all feedback seriously and are committed to resolving any issue you are facing with ${pName}. Please reach out to our official support team with your Envato purchase code and details so we can investigate and assist you right away.\n\nBest regards,\n${pName} Team`,
        confidence: 0.88,
        requires_human_review: true,
        reason: 'Strong negative or critical wording detected. Requires human review before posting.',
      }
    }

    // 2. Refund Request
    if (
      /\b(refund|money back|chargeback|return my money|cancel purchase)\b/i.test(textLower)
    ) {
      return {
        classification: 'refund_request',
        reply: `Hi @${customerUsername},\n\nThank you for reaching out. Refund requests on Envato Market are processed directly through Envato's official refund portal in accordance with the Envato Market Refund Rules. You can submit your formal request at: https://codecanyon.net/refund_requests/new\n\nIf there is a technical problem we can resolve for you first, please feel free to let us know and we will be happy to help.\n\nBest regards,\n${pName} Team`,
        confidence: 0.95,
        requires_human_review: true,
        reason: 'Refund inquiry detected. Directing to official Envato refund portal.',
      }
    }

    // 3. Appreciation / Thank You
    if (
      /\b(great|awesome|thank you|thanks|good job|nice work|love this|best script|perfect)\b/i.test(textLower) &&
      !/\b(but|however|issue|error|bug|problem|not working)\b/i.test(textLower)
    ) {
      return {
        classification: 'appreciation',
        reply: `Hi @${customerUsername},\n\nThank you so much for your kind words and support! We are thrilled to hear that you are enjoying ${pName}. If you ever have any questions, suggestions, or need assistance, we are always here to help.\n\nBest regards,\n${pName} Team`,
        confidence: 0.94,
        requires_human_review: false,
        reason: 'Appreciation feedback identified. Courteous thank-you reply drafted.',
      }
    }

    // 4. Installation & Setup Issues
    if (
      /\b(install|setup|configure|docker|cpanel|server|composer|artisan|npm run|build error)\b/i.test(textLower)
    ) {
      return {
        classification: 'installation_issue',
        reply: `Hi @${customerUsername},\n\nThank you for reaching out. For installation and setup, please make sure your server environment meets the listed minimum requirements. ${docs}\n\nIf you are encountering a specific error during the process, please share the exact error message or screenshot along with your PHP/Node environment version so we can assist you step by step.\n\nBest regards,\n${pName} Team`,
        confidence: 0.92,
        requires_human_review: true,
        reason: 'Installation/environment issue detected. Requesting environment specifics.',
      }
    }

    // 5. Bug / System Error / Technical Issue
    if (
      /\b(bug|crash|error|500|404|fails|not working|broken|blank screen|white screen|exception)\b/i.test(textLower)
    ) {
      return {
        classification: 'technical_issue',
        reply: `Hi @${customerUsername},\n\nThank you for bringing this to our attention. To help us diagnose and resolve this issue quickly, could you please provide:\n1. The exact error log or message displayed\n2. The specific page or action that triggers it\n3. Your current PHP/runtime version\n\nOnce we have these details, we will gladly help you get this sorted out right away.\n\nBest regards,\n${pName} Team`,
        confidence: 0.91,
        requires_human_review: true,
        reason: 'Technical error reported. Requesting reproduction details and error logs.',
      }
    }

    // 6. Compatibility Question
    if (
      /\b(compatible|support php|laravel 1|php 8|flutter 3|react 1|ios 1|android 1|compatible with)\b/i.test(textLower)
    ) {
      return {
        classification: 'compatibility_question',
        reply: `Hi @${customerUsername},\n\nThank you for your inquiry regarding compatibility. ${pName} is actively maintained and tested against the platform versions stated on our item details page. Please verify your target environment matches our listed tech stack.\n\nIf you have a specific version or framework setup you are planning to use, let us know and we will verify it for you.\n\nBest regards,\n${pName} Team`,
        confidence: 0.89,
        requires_human_review: true,
        reason: 'Compatibility inquiry detected. Directing to verified platform specifications.',
      }
    }

    // 7. Feature Request / Suggestion
    if (
      /\b(can you add|please add|feature request|would be nice|suggestion|in future|new feature|support for)\b/i.test(textLower)
    ) {
      return {
        classification: 'feature_request',
        reply: `Hi @${customerUsername},\n\nThank you for sharing this suggestion! We always appreciate constructive feedback from our community. We have noted this request for our product team to review for potential inclusion in upcoming roadmap updates.\n\nThank you for helping us improve ${pName}.\n\nBest regards,\n${pName} Team`,
        confidence: 0.92,
        requires_human_review: true,
        reason: 'Feature suggestion recognized. Acknowledged politely without promising a timeline.',
      }
    }

    // 8. Documentation Question
    if (
      /\b(documentation|docs|guide|tutorial|manual|how to use|where is docs|api docs)\b/i.test(textLower)
    ) {
      return {
        classification: 'documentation_question',
        reply: `Hi @${customerUsername},\n\nThank you for your question. ${docs}\n\nIf there is a particular feature, configuration step, or API integration you need guidance with, please let us know and we will point you to the exact section.\n\nBest regards,\n${pName} Team`,
        confidence: 0.93,
        requires_human_review: false,
        reason: 'Documentation request detected. Public documentation reference provided.',
      }
    }

    // 9. Pre-Sale Inquiry
    if (
      /\b(before buying|license|extended license|commercial|multi-vendor|can i use|demo|live preview)\b/i.test(textLower) ||
      threadHistory.length === 0
    ) {
      return {
        classification: 'pre_sale_question',
        reply: `Hi @${customerUsername},\n\nThank you for your interest in ${pName}! You can explore the live interactive preview directly using the "Live Preview" button on this item page. All features detailed in our item description are included in the download package.\n\nIf you have any further questions before purchasing, feel free to ask!\n\nBest regards,\n${pName} Team`,
        confidence: 0.87,
        requires_human_review: true,
        reason: 'Pre-sale question detected. Inviting demo exploration and answering item scope.',
      }
    }

    // 10. Follow-up / General
    return {
      classification: 'follow_up',
      reply: `Hi @${customerUsername},\n\nThank you for your follow-up message regarding ${pName}. We want to ensure you have everything working smoothly. Could you please provide a few more details regarding your query so we can assist you accurately?\n\nBest regards,\n${pName} Team`,
      confidence: 0.80,
      requires_human_review: true,
      reason: 'General inquiry or follow-up comment. Requesting clarification.',
    }
  }
}

export const replyGeneratorService = new ReplyGeneratorService()
