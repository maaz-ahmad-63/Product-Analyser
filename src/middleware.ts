import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Let Next.js internal, auth endpoints, webhooks, and public reports pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/v1/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/report/') ||
    pathname.startsWith('/api/reports/') ||
    pathname === '/access-denied'
  ) {
    return NextResponse.next()
  }

  // Allow API routes to handle their own authentication/authorization JSON responses
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/signup')

  // If user is already authenticated:
  if (token && token.isActive !== false) {
    // If they hit auth pages, send them to the app
    if (isAuthPage) {
      if (token.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return NextResponse.redirect(new URL('/analyses', req.url))
    }

    // Admin-only route guard
    if (pathname.startsWith('/admin') && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/access-denied', req.url))
    }

    // Root page redirects to analyses when logged in
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/analyses', req.url))
    }

    return NextResponse.next()
  }

  // If user account is deactivated:
  if (token && token.isActive === false) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login?error=ACCOUNT_DEACTIVATED', req.url))
    }
    return NextResponse.next()
  }

  // If unauthenticated:
  // Allow access to auth pages (/register, /signup, /login)
  if (isAuthPage) {
    return NextResponse.next()
  }

  // For all other pages (/analyses, /overview, /dashboard, /, /reports, /admin):
  // First redirect the user to the signup page (/signup)
  const signupUrl = new URL('/signup', req.url)
  if (pathname !== '/') {
    signupUrl.searchParams.set('callbackUrl', pathname)
  }
  return NextResponse.redirect(signupUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
}
