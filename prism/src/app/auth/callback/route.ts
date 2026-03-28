import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[Auth Callback] Processing callback:', { code: !!code, error: !!error })

  // If there's an error, redirect to login with error message
  if (error) {
    const errorMessage = errorDescription || error
    console.log('[Auth Callback] Error:', errorMessage)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  // Redirect to login with the code/hash so the client can process it
  // The login page will handle the token exchange via Supabase client
  if (code) {
    console.log('[Auth Callback] Code detected, redirecting to login')
    // Preserve the full hash/query for the client to process
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('code', code)
    return NextResponse.redirect(redirectUrl)
  }

  // Fallback to dashboard
  console.log('[Auth Callback] No code/error, redirecting to dashboard')
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
