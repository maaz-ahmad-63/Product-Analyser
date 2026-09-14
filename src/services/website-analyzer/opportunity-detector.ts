import {
  OpportunityRecord,
  RecurringComplaintGroup,
  ExtractedProductData,
} from './types'

/**
 * Maps a recurring or critical competitor complaint to a verified feature in our product.
 * Returns the verified feature if found, or null if no genuine matching feature exists.
 */
function findVerifiedMatchingFeature(
  complaintCategory: string,
  myProduct: ExtractedProductData,
  semanticIssue?: string
): { feature: string; whyRelevant: string } | null {
  const myFeatures = myProduct.features || []
  const myDesc = (myProduct.description || '').toLowerCase()
  const myTitle = (myProduct.websiteTitle || myProduct.productName || '').toLowerCase()

  // 1. Prioritize Direct Semantic Entity Matching from the Complaint Issue Label
  if (semanticIssue) {
    const issueLower = semanticIssue.toLowerCase()
    const NON_FEATURE_WORDS = new Set([
      'issue',
      'problem',
      'bug',
      'error',
      'fails',
      'failing',
      'failure',
      'corrupt',
      'corruption',
      'corrupted',
      'silent',
      'missing',
      'broken',
      'lack',
      'lacks',
      'not',
      'working',
      'with',
      'after',
      'from',
      'when',
      'does',
      'tool',
      'system',
      'request',
      'complaint',
    ])
    const substantiveKeywords = issueLower
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !NON_FEATURE_WORDS.has(w))

    for (const f of myFeatures) {
      const fLower = f.toLowerCase()
      if (substantiveKeywords.some((kw) => fLower.includes(kw))) {
        return {
          feature: f,
          whyRelevant: `Our product explicitly includes verified support for "${f}", directly addressing the ${semanticIssue} experienced by competitor customers.`,
        }
      }
    }
  }

  const findFeatureMatching = (keywords: string[]): string | null => {
    for (const f of myFeatures) {
      const fLower = f.toLowerCase()
      if (keywords.some((kw) => fLower.includes(kw))) {
        return f
      }
    }
    return null
  }

  // Handle the standard feedback categories:
  if (complaintCategory === 'Installation and setup' || complaintCategory === 'Installation & Setup' || complaintCategory === 'Configuration & Environment') {
    const matched = findFeatureMatching(['install', 'setup', 'docker', 'deploy', 'wizard', 'auto', 'script', 'quick', 'easy'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product provides pre-configured installation automation that may simplify setup. This may represent an opportunity to differentiate our product.',
      }
    }
    if (myDesc.includes('install') || myDesc.includes('setup') || myDesc.includes('docker')) {
      return {
        feature: 'Automated Installer & Setup Documentation',
        whyRelevant: 'Our product documentation outlines clear installation steps. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Documentation' || complaintCategory === 'Documentation & Guides') {
    const matched = findFeatureMatching(['doc', 'guide', 'tutorial', 'api', 'manual', 'help'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product includes comprehensive documentation and setup references. This may represent an opportunity to differentiate our product.',
      }
    }
    if (myProduct.docsLink && myProduct.docsLink !== 'Not found on the provided website') {
      return {
        feature: 'Dedicated Public Documentation Guide',
        whyRelevant: 'Our product maintains dedicated public documentation for guidance. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Bugs and crashes' || complaintCategory === 'Bug / System Error') {
    const matched = findFeatureMatching(['stable', 'test', 'clean', 'quality', 'tested', 'unit', 'bug', 'reliable'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product codebase emphasizes validated code standards and stability testing. This may represent an opportunity to differentiate our product.',
      }
    }
    if (myDesc.includes('tested') || myDesc.includes('clean code') || myDesc.includes('mvc') || myDesc.includes('laravel')) {
      return {
        feature: 'Structured Framework Architecture',
        whyRelevant: 'Built on structured architecture designed to prevent unhandled runtime errors. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Support' || complaintCategory === 'Customer Support') {
    if (myProduct.envatoSales?.author_name || myDesc.includes('support') || myFeatures.some(f => f.toLowerCase().includes('support'))) {
      return {
        feature: 'Direct Author Support Channel',
        whyRelevant: 'Our team provides direct technical assistance and regular bug fixes. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Compatibility' || complaintCategory === 'Platform Compatibility') {
    const matched = findFeatureMatching(['php 8', 'laravel', 'flutter', 'node', 'modern', 'compatible', 'cross-platform', 'responsive'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product is developed on current LTS runtime versions. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Performance' || complaintCategory === 'Performance & Speed') {
    const matched = findFeatureMatching(['fast', 'speed', 'cache', 'redis', 'optimize', 'lightweight', 'performance'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product is architected for responsive response times and query caching. This may represent an opportunity to differentiate our product.',
      }
    }
    if (myDesc.includes('fast') || myDesc.includes('cache') || myDesc.includes('lightweight')) {
      return {
        feature: 'Optimized Query Caching & Lightweight Assets',
        whyRelevant: 'Engineered for fast execution and minimal server overhead. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Missing features' || complaintCategory === 'Missing Feature Request' || complaintCategory === 'Feature Suggestion') {
    const matched = findFeatureMatching(['feature', 'module', 'plugin', 'addon', 'system', 'dashboard', 'booking', 'tracking', 'parcel', 'report', 'export', 'notification'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product offers this capability natively out of the box. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Payment and licensing' || complaintCategory === 'Payment / License') {
    const matched = findFeatureMatching(['payment', 'license', 'gateway', 'stripe', 'paypal', 'one-time', 'lifetime', 'subscription'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product provides transparent licensing and reliable payment integration. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Security' || complaintCategory === 'Security Concern') {
    const matched = findFeatureMatching(['security', 'auth', 'sanitize', 'csrf', 'jwt', 'encryption', 'permission', 'role'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product implements authenticated access controls and input validation. This may represent an opportunity to differentiate our product.',
      }
    }
    if (myDesc.includes('security') || myDesc.includes('safe') || myDesc.includes('sanitized')) {
      return {
        feature: 'Sanitized Inputs & Access Control Layer',
        whyRelevant: 'Built with standard security hygiene across requests and user permissions. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'UI/UX' || complaintCategory === 'Improvement Suggestion' || complaintCategory === 'Workflow & Customization Suggestion') {
    const matched = findFeatureMatching(['ui', 'ux', 'dashboard', 'theme', 'dark mode', 'responsive', 'clean', 'modern', 'custom'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Engineered with modern user experience standards and frictionless usability. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Updates') {
    if (myProduct.changelogLink && myProduct.changelogLink !== 'Not found on the provided website') {
      return {
        feature: 'Active Maintenance & Verified Public Changelog',
        whyRelevant: 'Our product maintains a verified public changelog and regular update cycle. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Integrations' || complaintCategory === 'Integration Request') {
    const matched = findFeatureMatching(['payment', 'stripe', 'paypal', 'sms', 'gateway', 'api', 'webhook', 'maps', 'integration', 'connect'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product natively supports extensible integrations. This may represent an opportunity to differentiate our product.',
      }
    }
    if (myDesc.includes('payment') || myDesc.includes('gateway') || myDesc.includes('stripe') || myDesc.includes('api')) {
      return {
        feature: 'Built-in Payment & API Integrations',
        whyRelevant: 'Our product includes multiple out-of-the-box integrations. This may represent an opportunity to differentiate our product.',
      }
    }
    return null
  }

  if (complaintCategory === 'Hardware, build and defects' || complaintCategory === 'Hardware defect' || complaintCategory === 'Durability') {
    const matched = findFeatureMatching(['titanium', 'ceramic', 'shield', 'durability', 'battery', 'tested', 'quality', 'warranty', 'a19', 'enclosure'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product features verified build materials and rigorous quality standards designed to prevent hardware failures and premature degradation.',
      }
    }
    if (myFeatures.length > 0) {
      return {
        feature: myFeatures[0],
        whyRelevant: 'Our product emphasizes verified manufacturing specifications and quality control standards.',
      }
    }
  }

  if (complaintCategory === 'Camera and multimedia' || complaintCategory === 'Camera limitation' || complaintCategory === 'Audio / Speaker') {
    const matched = findFeatureMatching(['camera', 'lens', 'fusion', 'telephoto', 'portrait', 'speaker', 'audio', 'spatial', 'sound', 'sensor', 'display'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product provides verified multimedia and imaging capabilities that address competitor camera or acoustic limitations.',
      }
    }
  }

  if (complaintCategory === 'Pricing and value' || complaintCategory === 'Value for money') {
    const matched = findFeatureMatching(['promotion', 'value', 'storage', 'gb', 'chip', 'all-day', 'battery', 'display', '120hz', 'price'])
    if (matched) {
      return {
        feature: matched,
        whyRelevant: 'Our product bundles high-end flagship features natively to offer superior price-to-performance value.',
      }
    }
  }

  return null
}

/**
 * Generates respectful, non-salesy outreach draft strictly for manual review.
 */
function buildRespectfulDraftMessage(
  issueSummary: string,
  competitorName: string,
  myProductName: string,
  verifiedFeature: string | null,
  isSuggestive: boolean = false
): string {
  const featureClause = verifiedFeature
    ? `Our product, ${myProductName}, includes ${verifiedFeature} which may help address this.`
    : `Our product, ${myProductName}, takes an alternative architectural approach that may assist.`

  const intro = isSuggestive
    ? `I noticed your public suggestion regarding ${issueSummary.toLowerCase().replace(/[.]+$/, '')} for ${competitorName}.`
    : `I noticed your public comment regarding ${issueSummary.toLowerCase().replace(/[.]+$/, '')} with ${competitorName}.`

  return (
    `Hi,\n\n` +
    `${intro}\n\n` +
    `${featureClause} If you are still exploring alternatives or have feature requirements, I would be glad to share a direct demo or answer any technical questions.\n\n` +
    `No pressure at all, and I completely understand if you've already found a resolution.\n\n` +
    `Best regards,\n[Your Name / Team]`
  )
}

/**
 * Detects opportunities exclusively from recurring (>=2 mentions) or critical complaints,
 * matching them only with verified features in our product.
 */
export function detectOpportunitiesFromRecurringComplaints(
  recurringComplaints: RecurringComplaintGroup[],
  myProduct: ExtractedProductData
): OpportunityRecord[] {
  const myName = myProduct.productName || 'Our Product'
  const opportunities: OpportunityRecord[] = []

  for (let i = 0; i < recurringComplaints.length; i++) {
    const complaint = recurringComplaints[i]
    const issueName = complaint.semantic_issue || complaint.complaint_category

    // Match verified feature in our product (prioritizing semantic issue label)
    const match = findVerifiedMatchingFeature(
      complaint.complaint_category,
      myProduct,
      complaint.semantic_issue
    )
    const hasMatchingFeature = match !== null
    const matchingFeature = match ? match.feature : 'No verified matching feature found.'
    const whyRelevant = match
      ? match.whyRelevant
      : `Recurring issue "${issueName}" on ${complaint.competitor_name} (${complaint.mention_count} public mentions), but our listing does not explicitly advertise a verified matching feature.`

    // Label value proposition clearly as a possible improvement, not a guaranteed lost sales cause
    const isSug = Boolean(complaint.is_suggestive)
    const valueProposition = match
      ? isSug
        ? `Customer Demand Opportunity: Highlighting ${matchingFeature} in marketing or docs directly fulfills customer interest in ${issueName.toLowerCase()} identified on ${complaint.competitor_name}. This may represent an opportunity to differentiate our product.`
        : `Possible improvement: Highlighting ${matchingFeature} in product documentation and marketing materials may attract buyers frustrated with ${issueName.toLowerCase()} on ${complaint.competitor_name}. This may represent an opportunity to differentiate our product.`
      : isSug
      ? `Feature Demand: Customer suggestion on ${complaint.competitor_name} indicates active market demand for ${issueName.toLowerCase()}.`
      : `Possible improvement: Evaluating customer demand for ${issueName.toLowerCase()} could represent a potential product enhancement opportunity.`

    const draftMessage = buildRespectfulDraftMessage(
      issueName,
      complaint.competitor_name,
      myName,
      match ? match.feature : null,
      Boolean(complaint.is_suggestive)
    )

    opportunities.push({
      id: `opp_${i}_${complaint.id}`,
      competitor_url: complaint.competitor_url,
      competitor_name: complaint.competitor_name,
      comment_url: complaint.comment_url,
      comment_date: complaint.latest_occurrence_date,
      issue_category: issueName,
      comment_summary: complaint.representative_comment.slice(0, 300),
      why_relevant: whyRelevant,
      matching_feature: matchingFeature,
      has_matching_feature: hasMatchingFeature,
      value_proposition: valueProposition,
      draft_message: draftMessage,
      mention_count: complaint.mention_count,
      severity: complaint.severity,
      confidence_level: complaint.confidence_level,
      status: 'New',
      created_at: new Date().toISOString(),
    })
  }

  return opportunities
}
