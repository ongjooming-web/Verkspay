import { createServerClient } from '@supabase/ssr'
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

  // Create Supabase client
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedRoutes = ['/dashboard', '/clients', '/invoices', '/proposals', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // User trying to access protected route
    if (!user) {
      // No session - redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // User is authenticated - allow access
    return response
  }

  // Auth routes (/login)
  if (pathname === '/login') {
    if (user) {
      // Already authenticated - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Not authenticated - allow access to login page
    return response
  }

  return response
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
