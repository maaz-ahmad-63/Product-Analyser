export interface DraftQueryInput {
  userQuery?: string
  productTitle?: string
  productUrl?: string
  category?: string
  tone?: 'courteous' | 'technical' | 'concise'
}

export interface DraftQueryResult {
  query: string
  suggestions: string[]
  category: string
}

export class QueryGeneratorService {
  /**
   * Generates or enhances a pre-sale/technical query for Envato items (CodeCanyon/ThemeForest).
   */
  async generateQuery(input: DraftQueryInput): Promise<DraftQueryResult> {
    const rawQuery = (input.userQuery || '').trim()
    const productTitle = (input.productTitle || 'this item').trim()
    const tone = input.tone || 'courteous'

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (apiKey && rawQuery.length > 3) {
      try {
        const aiResult = await this.callOpenAi(rawQuery, productTitle, tone, input.category)
        if (aiResult) return aiResult
      } catch (err) {
        console.error('OpenAI query enhancement failed, using deterministic builder:', err)
      }
    }

    return this.generateDeterministicQuery(rawQuery, productTitle, tone, input.category)
  }

  private async callOpenAi(
    userQuery: string,
    productTitle: string,
    tone: string,
    category?: string
  ): Promise<DraftQueryResult | null> {
    const systemPrompt = `You are an expert technical pre-sale consultant helping a customer write a clear, polite, and effective comment/inquiry on Envato Market (CodeCanyon / ThemeForest).

Rules:
1. Polish the user's raw query into a courteous, professional question addressed to the item author.
2. Item Name: "${productTitle}".
3. Tone requested: ${tone} (e.g. courteous & detailed, technical & direct, or concise).
4. Address common author information needs: specify if asking about documentation, server setup, compatibility, source code licensing, or live demo.
5. Do NOT make demands or aggressive statements. Keep it respectful and engaging.
6. Output JSON only:
{
  "query": "The complete polished comment text ready to post",
  "category": "installation" | "compatibility" | "license" | "features" | "demo" | "customization" | "general",
  "suggestions": ["Alternative question 1", "Alternative question 2"]
}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Draft to polish: "${userQuery}"\nCategory: ${category || 'auto-detect'}` },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    return {
      query: parsed.query,
      category: parsed.category || 'general',
      suggestions: parsed.suggestions || [],
    }
  }

  /**
   * Deterministic high-quality query builder and polisher.
   */
  generateDeterministicQuery(
    rawQuery: string,
    productTitle: string,
    tone: 'courteous' | 'technical' | 'concise',
    forcedCategory?: string
  ): DraftQueryResult {
    const qLower = rawQuery.toLowerCase()

    // 1. Detect Category
    let category = forcedCategory || 'general'
    if (!forcedCategory) {
      if (/install|setup|document|guide|manual|video|cpanel|vps|server/i.test(qLower)) {
        category = 'installation'
      } else if (/flutter|laravel|php|version|compatib|dart|node|support/i.test(qLower)) {
        category = 'compatibility'
      } else if (/license|extended|regular|source|code|commercial|resell/i.test(qLower)) {
        category = 'license'
      } else if (/demo|preview|test|login|credential|admin|apk|testflight/i.test(qLower)) {
        category = 'demo'
      } else if (/custom|feature|add|integrat|payment|gateway|sms|otp|whatsapp/i.test(qLower)) {
        category = 'features'
      }
    }

    // 2. Build polished query based on detected category and raw input
    let query = ''
    const suggestions: string[] = []

    switch (category) {
      case 'installation':
        if (tone === 'technical') {
          query = `Hello author,\n\nCould you please confirm if full step-by-step installation documentation is included for both the Flutter mobile app and the Laravel admin panel? Specifically:\n- Server requirements & recommended PHP extensions\n- Database setup & seeders guide\n- Flutter build & Firebase configuration steps\n\nThank you!`
        } else if (tone === 'concise') {
          query = `Hello author, is detailed step-by-step installation documentation included for both the Flutter app and Laravel admin panel? Thank you!`
        } else {
          query = `Hello author,\n\nCould you please clarify if comprehensive step-by-step installation and setup documentation is provided with the package? Specifically, does the documentation guide both the Flutter mobile application setup and the Laravel admin panel configuration?\n\nAlso, do you offer basic installation guidance or video tutorials if needed?\n\nThank you in advance!`
        }
        suggestions.push(
          'Do you provide free initial server setup assistance?',
          'What are the minimum server requirements (PHP version, MySQL, Flutter SDK)?'
        )
        break

      case 'compatibility':
        if (tone === 'technical') {
          query = `Hello author,\n\nCould you please specify the exact supported versions for this item:\n- Flutter SDK & Dart version\n- Laravel framework & PHP version\n- Compatibility with Android 14 / iOS 17+\n\nAre all packages migrated to null safety and the latest Gradle versions? Thank you!`
        } else if (tone === 'concise') {
          query = `Hello author, what are the exact versions of Flutter, Dart, and Laravel/PHP supported in the latest release? Thank you!`
        } else {
          query = `Hello author,\n\nCould you please share which versions of Flutter and Laravel/PHP are supported in the current release? Is it fully tested and compatible with Flutter 3.x and the latest Android/iOS versions?\n\nThank you for your time!`
        }
        suggestions.push(
          'Will future Flutter and Laravel updates be included for free?',
          'Is the mobile app built with clean architecture / GetX / Bloc / Provider?'
        )
        break

      case 'license':
        if (tone === 'technical') {
          query = `Hello author,\n\nDoes the regular/extended license include 100% full unencrypted source code without obfuscation for both the Flutter client and Laravel backend? Are all API endpoints customizable? Thank you!`
        } else {
          query = `Hello author,\n\nBefore purchasing, could you please confirm if the license grants access to the complete uncompiled source code for customization and branding? Can we modify the design and integrate our own APIs freely?\n\nThank you!`
        }
        suggestions.push(
          'What are the exact differences between Regular and Extended license for this item?',
          'Can we rebrand the logo, splash screen, and package name?'
        )
        break

      case 'demo':
        query = `Hello author,\n\nCould you please share the live demo link and test credentials for both the customer mobile app (or APK) and the Laravel admin panel? We would like to test the workflow before purchasing.\n\nThank you!`
        suggestions.push(
          'Is there an APK or TestFlight link to test the mobile app directly on a phone?',
          'What are the default admin credentials to test the backend settings?'
        )
        break

      case 'features':
        if (rawQuery.length > 5) {
          query = `Hello author,\n\nRegarding ${productTitle}:\n${rawQuery.endsWith('?') ? rawQuery : rawQuery + '?'}\n\nCould you please let us know if this is supported out-of-the-box or if you offer custom modification services to implement this? Thank you!`
        } else {
          query = `Hello author,\n\nWe are interested in purchasing this product and would like to inquire if your team offers custom feature development or third-party integrations (such as local payment gateways or SMS providers)?\n\nThank you!`
        }
        suggestions.push(
          'Can multiple payment gateways be enabled simultaneously?',
          'Is push notification (Firebase FCM) supported out of the box?'
        )
        break

      default:
        // General query polisher
        if (rawQuery.length > 3) {
          const capitalized = rawQuery.charAt(0).toUpperCase() + rawQuery.slice(1)
          const formattedQuestion = capitalized.endsWith('?') ? capitalized : `${capitalized}?`
          query = `Hello author,\n\nI am interested in ${productTitle} and have a question before purchasing:\n\n${formattedQuestion}\n\nLooking forward to your response, thank you!`
        } else {
          query = `Hello author,\n\nCould you please provide more details on the installation process and documentation included with ${productTitle}? Thank you!`
        }
        suggestions.push(
          'Is step-by-step setup documentation included?',
          'What Flutter and PHP/Laravel versions are supported?'
        )
        break
    }

    return {
      query,
      category,
      suggestions,
    }
  }
}

export const queryGeneratorService = new QueryGeneratorService()
