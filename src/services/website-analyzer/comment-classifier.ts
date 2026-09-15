/**
 * Intelligent Comment & Discussion Classifier
 * 
 * Accurately categorizes public marketplace discussions into:
 * - inquiry: Pre-sale questions, demo requests, license/pricing inquiries, compatibility checks
 * - complaint: Genuine technical issues, fatal errors, broken functionality, customer dissatisfaction
 * - suggestion: Feature requests, roadmap enhancements, integration requests
 * - positive: Praise, satisfaction, appreciation, 5-star feedback
 * - author_reply: Vendor / developer responses assisting buyers
 */

export interface ClassifiedCommentResult {
  category: 'inquiry' | 'complaint' | 'suggestion' | 'positive' | 'author_reply'
  sentiment: 'positive' | 'negative' | 'neutral'
  topic: string
  topicLabel: string
  detectedIssue?: string
  relevantFeature?: string
  isActionableComplaint: boolean
}

export function classifyPublicDiscussion(
  text: string,
  authorName: string = '',
  rating?: number | null
): ClassifiedCommentResult {
  const t = (text || '').trim()
  const tl = t.toLowerCase()
  const al = (authorName || '').toLowerCase()

  // 1. AUTHOR / SELLER REPLY DETECTION
  const isAuthor =
    al.includes('author') ||
    al.includes('seller') ||
    al.includes('unibooker') ||
    al.includes('developer') ||
    al.includes('vendor') ||
    /^(yes, our solution|demo back|thank you so much|at the moment, we|kindly,? connect with us|we couldn.t respond|for receiving parcel|for now, our solution|for now, the system|new version we have|we have responded|hello,? thank you|thanks for your|hi,? we have|dear customer)/i.test(t) ||
    ((tl.includes('contact us on whatsapp') || tl.includes('connect with us on whatsapp') || tl.includes('please feel free to contact')) && !tl.includes('?'))

  if (isAuthor) {
    return {
      category: 'author_reply',
      sentiment: 'neutral',
      topic: 'vendor_response',
      topicLabel: 'Developer Response',
      detectedIssue: 'Author assistance or customer support reply',
      isActionableComplaint: false,
    }
  }

  // 2. GENUINE COMPLAINT / FRICTION DETECTION
  const criticalComplaintKeywords = [
    'regret', 'regretted', 'unresolved bug', 'unresolved bugs', 'not ready for a real market',
    'doesn\'t work', 'does not work', 'not working smoothly', 'not working', 'fatal error',
    'blank page', 'white screen', 'crash', 'terrible', 'worst support', 'scam', 'fraud',
    'stole money', 'refund my money', 'waste of money', 'waste of time', 'disappointed',
    'layout error', 'layout errors', 'app performance feels slower', 'too many bugs',
    'not suggest nearby places', 'no internet connection showing', 'ticket ignored',
    'unresponsive', 'cannot install', 'failed to install', 'error 500'
  ]

  const hasCriticalComplaint = criticalComplaintKeywords.some((kw) => tl.includes(kw))

  // Check if rating indicates dissatisfaction
  const isLowRating = rating !== null && rating !== undefined && rating <= 2

  // 3. PRAISE / POSITIVE FEEDBACK
  const praiseKeywords = [
    'like this script', 'good job', 'great script', 'great app', 'awesome', 'excellent',
    'love this', 'very supportive and helpful', 'clean code', 'superb', 'best script',
    'best solution', 'satisfied', 'perfect', '5 stars', 'five stars', 'wonderful',
    'top notch', 'highly recommend', 'amazing project', 'truly unique'
  ]
  const hasPraise = praiseKeywords.some((kw) => tl.includes(kw)) || (rating !== null && rating !== undefined && rating >= 4)

  // 4. FEATURE REQUESTS / SUGGESTIONS
  const suggestionKeywords = [
    'please add', 'can you add', 'are you planning to add', 'would be nice',
    'hope you will add', 'hope you add', 'feature request', 'suggest to add',
    'it should be', 'support openstreetmap', 'add future', 'add ride later',
    'offline maps'
  ]
  const hasSuggestion = suggestionKeywords.some((kw) => tl.includes(kw))

  // 5. INQUIRIES & PRE-SALE QUESTIONS
  const inquiryKeywords = [
    'could you please share', 'please share', 'demo admin', 'credential',
    'is it possible', 'does this script', 'does your system', 'how to', 'when will',
    'what is the difference', 'please answer ticket', 'is payment gateway',
    'does it support', 'can it be', 'is the app scalable', 'any demo',
    'where is', 'can i test', 'can we customize', 'how can i', 'which version',
    'documentation', 'preview link', 'license key', 'regular license', 'extended license'
  ]
  const hasInquiry = inquiryKeywords.some((kw) => tl.includes(kw)) || tl.includes('?')

  // --- RESOLVE CATEGORY ---

  // Actual complaint wins if critical friction was reported
  if (hasCriticalComplaint || isLowRating) {
    let topic = 'bugs_errors'
    let topicLabel = 'Product Friction'
    if (tl.includes('map') || tl.includes('openstreetmap') || tl.includes('nearby')) {
      topic = 'mapping_costs'
      topicLabel = 'Map Integration Friction'
    } else if (tl.includes('payment') || tl.includes('razorpay') || tl.includes('gateway')) {
      topic = 'payment_gateway_friction'
      topicLabel = 'Missing Payment Integration'
    } else if (tl.includes('install') || tl.includes('setup')) {
      topic = 'installation_problems'
      topicLabel = 'Installation Friction'
    } else if (tl.includes('layout') || tl.includes('screen') || tl.includes('performance')) {
      topic = 'compatibility_problem'
      topicLabel = 'Device Compatibility / UI Performance'
    }

    return {
      category: 'complaint',
      sentiment: 'negative',
      topic,
      topicLabel,
      detectedIssue: 'Reported customer friction, bug, or technical hurdle',
      relevantFeature: 'Codebase stability warranty and targeted technical fixes',
      isActionableComplaint: true,
    }
  }

  // Praise (without complaint)
  if (hasPraise && !hasSuggestion && !hasInquiry) {
    return {
      category: 'positive',
      sentiment: 'positive',
      topic: 'buyer_praise',
      topicLabel: 'Verified Praise',
      detectedIssue: 'High customer satisfaction and positive recommendation',
      isActionableComplaint: false,
    }
  }

  // Feature request / suggestion
  if (hasSuggestion) {
    let relevantFeature = 'Feature expansion'
    if (tl.includes('map') || tl.includes('openstreetmap')) relevantFeature = 'OpenStreetMap alternative integration'
    if (tl.includes('future') || tl.includes('schedule') || tl.includes('manual')) relevantFeature = 'Scheduled ride and manual admin dispatch'
    if (tl.includes('payment') || tl.includes('gateway')) relevantFeature = 'Multi-gateway regional payment support'

    return {
      category: 'suggestion',
      sentiment: 'neutral',
      topic: 'feature_suggestion',
      topicLabel: 'Feature Request',
      detectedIssue: 'Customer roadmap expansion request',
      relevantFeature,
      isActionableComplaint: false,
    }
  }

  // Inquiry / Pre-sale question
  if (hasInquiry || t.length > 0) {
    let topic = 'general_question'
    let topicLabel = 'Buyer Inquiry'
    if (tl.includes('demo') || tl.includes('credential')) {
      topic = 'demo_access_inquiry'
      topicLabel = 'Demo Access Query'
    } else if (tl.includes('payment') || tl.includes('gateway') || tl.includes('midtrans') || tl.includes('paystack')) {
      topic = 'payment_inquiry'
      topicLabel = 'Payment Gateway Query'
    } else if (tl.includes('license')) {
      topic = 'licensing_inquiry'
      topicLabel = 'License & Terms Query'
    } else if (tl.includes('flutter') || tl.includes('version') || tl.includes('php') || tl.includes('laravel')) {
      topic = 'tech_stack_inquiry'
      topicLabel = 'Technical Stack Query'
    }

    return {
      category: 'inquiry',
      sentiment: 'neutral',
      topic,
      topicLabel,
      detectedIssue: 'Prospective buyer pre-sale or documentation question',
      isActionableComplaint: false,
    }
  }

  return {
    category: 'inquiry',
    sentiment: 'neutral',
    topic: 'general_question',
    topicLabel: 'Buyer Inquiry',
    isActionableComplaint: false,
  }
}
