import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

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

    // Verify auth using shared helper
    const { user, error: authError } = await requireAuth(req)
    if (authError) {
      console.error('[billing/customer-portal] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id // guaranteed UUID from Supabase

    // Get Supabase server client
    const supabase = getSupabaseServer()

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
