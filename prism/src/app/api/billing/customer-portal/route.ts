import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: NextRequest) {
  try {
    console.log('[billing/customer-portal] Request received')

    // Get auth token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Extract and verify JWT
    let userId: string

    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      )

      userId = payload.sub

      console.log('[billing/customer-portal] Token decoded - user:', userId)

      if (!userId) {
        throw new Error('Missing userId in token')
      }

      // Verify token is from our Supabase instance
      if (payload.aud !== 'authenticated') {
        throw new Error('Invalid token audience')
      }
    } catch (err: any) {
      console.error('[billing/customer-portal] Token validation error:', err)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Use service role to get profile
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      console.error('[billing/customer-portal] Profile error or no customer ID:', profileError)
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    console.log('[billing/customer-portal] Stripe customer:', profile.stripe_customer_id)

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`
    })

    console.log('[billing/customer-portal] Portal session created:', portalSession.id)

    return NextResponse.json({
      success: true,
      url: portalSession.url
    }, { status: 200 })
  } catch (error: any) {
    console.error('[billing/customer-portal] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
