import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Both verkspay.com and app.verkspay.com serve the same app
  // - Landing page at /
  // - Dashboard at /dashboard (requires auth)
  // - Other routes work on both domains
  
  // No rewriting needed — Next.js routing handles it naturally
  // Just pass through
  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
