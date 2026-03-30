import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'
import { generateToken, hashToken } from '@/lib/token-crypto'

const PORTAL_TOKEN_EXPIRY_DAYS = 30

export async function POST(req: NextRequest) {
  try {
    const { client_email, client_id } = await req.json()

    if (!client_email || !client_id) {
      return NextResponse.json(
        { error: 'Missing client_email or client_id' },
        { status: 400 }
      )
    }

    // Verify user is authenticated (dashboard user generating the link)
    const authResult = await verifyAuth(req)
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error?.message || 'Unauthorized' },
        { status: authResult.error?.status || 401 }
      )
    }

    const user = authResult.user

    // Verify client exists, email matches, AND user owns it
    const supabase = getSupabaseServer()
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, email, name, user_id')
      .eq('id', client_id)
      .eq('email', client_email)
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      console.error('[ClientPortal] Client not found:', { client_id, client_email, user_id: user.id, error: clientError })
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Generate secure token and hash for storage
    const token = generateToken()  // Raw token sent to client
    const tokenHash = hashToken(token)  // Hash stored in database
    const expiresAt = new Date(Date.now() + PORTAL_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    // Save hashed token to database (never store raw token)
    const { data: portalToken, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .insert({
        client_id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        first_accessed_at: null,
        last_accessed_at: null,
        access_count: 0,
      })
      .select()
      .single()

    if (tokenError) {
      console.error('[ClientPortal] Failed to create token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate portal link' },
        { status: 500 }
      )
    }

    // Generate portal link
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/${token}`

    console.log('[ClientPortal] Generated link for client:', { client_id, expires_at: expiresAt })

    return NextResponse.json({
      success: true,
      portal_url: portalUrl,
      client_name: client.name,
      expires_at: expiresAt,
    })
  } catch (error) {
    console.error('[ClientPortal] Error generating link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
