import { authService } from '@/services/auth.service'
import { apiSuccess, apiError } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, tenantName } = body

    if (!name || !email || !password || !tenantName) {
      return apiError('Name, email, password, and business name are required', 400)
    }

    if (password.length < 8) {
      return apiError('Password must be at least 8 characters', 400)
    }

    const result = await authService.register({
      name,
      email,
      password,
      tenantName,
    })

    return apiSuccess(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
      },
      'Account created successfully',
      201
    )
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return apiError(error.message, 409)
      }
    }
    console.error('Registration error:', error)
    return apiError('Registration failed', 500)
  }
}
