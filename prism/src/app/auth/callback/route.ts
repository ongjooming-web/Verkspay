import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // If there's an error, redirect to login with error message
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  // If there's a code, Supabase will handle it client-side
  // Redirect to dashboard
  if (code) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Fallback to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
