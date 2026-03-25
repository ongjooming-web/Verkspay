import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify token and get user
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's Stripe customer ID
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', data.user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('[Portal] Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!userProfile.stripe_customer_id) {
      console.log('[Portal] User has no active subscription:', { userId: data.user.id, status: userProfile.subscription_status })
      return NextResponse.json(
        { error: 'No active subscription found. Please upgrade first.' },
        { status: 404 }
      )
    }

    console.log('[Portal] Creating portal for customer:', { customerId: userProfile.stripe_customer_id, userId: data.user.id })

    // Create Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userProfile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    console.log('[Portal] ✓ Portal session created:', session.id)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
