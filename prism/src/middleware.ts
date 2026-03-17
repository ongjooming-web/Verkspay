import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const pathname = requestUrl.pathname

  // Public routes - no auth check needed
  const publicRoutes = ['/', '/signup']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check if auth session exists in cookies
  const authToken = request.cookies.get('sb-fqdipubbyvekhipknxnr-auth-token')?.value
  const hasSession = !!authToken

  // Protected routes
  const protectedRoutes = ['/dashboard', '/clients', '/invoices', '/proposals', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // User trying to access protected route
    if (!hasSession) {
      // No session - redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // User is authenticated - allow access
    return NextResponse.next()
  }

  // Auth routes (/login)
  if (pathname === '/login') {
    if (hasSession) {
      // Already authenticated - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Not authenticated - allow access to login page
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
