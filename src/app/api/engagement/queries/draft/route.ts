import { NextResponse } from 'next/server'
import { queryGeneratorService } from '@/services/engagement/query-generator.service'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userQuery, productTitle, productUrl, category, tone } = body

    const result = await queryGeneratorService.generateQuery({
      userQuery,
      productTitle,
      productUrl,
      category,
      tone,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (err: any) {
    console.error('Error in /api/engagement/queries/draft:', err)
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to draft query',
    }, { status: 500 })
  }
}
