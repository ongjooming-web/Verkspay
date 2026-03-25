import { NextRequest, NextResponse } from 'next/server'

/**
 * Supabase Auth Callback Handler
 * 
 * Handles OAuth redirects and password reset tokens from Supabase.
 * Supabase sends tokens in the URL hash, which we extract and pass to the frontend.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[auth/callback] Processing auth callback')
    console.log('[auth/callback] Full URL:', request.url)

    // Get the full URL including hash
    const requestUrl = new URL(request.url)
    const hash = requestUrl.hash

    console.log('[auth/callback] Hash:', hash)

    // The hash contains tokens and other auth data from Supabase
    // We need to redirect to reset-password and preserve the hash
    // Next.js doesn't pass hashes to the server, so we use a query param workaround

    // For password reset flow: redirect to reset-password with the full URL
    // The frontend will extract the hash and handle it
    const resetPasswordUrl = new URL('/reset-password', request.url)
    resetPasswordUrl.searchParams.set('_hash', hash)

    console.log('[auth/callback] Redirecting to:', resetPasswordUrl.toString())

    return NextResponse.redirect(resetPasswordUrl)
  } catch (error) {
    console.error('[auth/callback] Error:', error)
    // Fallback to login page on error
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
