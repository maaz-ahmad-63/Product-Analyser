import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  const isAuthPage = pathname.startsWith('/login')
  const isAdminRoute = pathname.startsWith('/admin')
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/analysis')

  // Redirect authenticated users away from login page
  if (isAuthPage) {
    if (token && token.isActive !== false) {
      if (token.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  // Admin-only route guard
  if (isAdminRoute) {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (token.isActive === false) {
      return NextResponse.redirect(new URL('/login?error=ACCOUNT_DEACTIVATED', req.url))
    }

    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/access-denied', req.url))
    }

    return NextResponse.next()
  }

  // Protected user routes
  if (isProtectedRoute) {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (token.isActive === false) {
      return NextResponse.redirect(new URL('/login?error=ACCOUNT_DEACTIVATED', req.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/history/:path*',
    '/analysis/:path*',
    '/login',
  ],
}
