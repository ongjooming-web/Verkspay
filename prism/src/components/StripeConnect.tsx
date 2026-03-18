'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

interface StripeConnectProps {
  onStripeConnected?: (accountId: string) => void
}

export function StripeConnectComponent({ onStripeConnected }: StripeConnectProps) {
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    console.log('[StripeConnect] Component mounted')
    loadStripeData()

    // Check for Stripe callback success param
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe') === 'success') {
      console.log('[StripeConnect] Success callback detected, force-fetching updated profile')
      setSuccess(true)

      // Get current user
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user?.id) {
          console.log('[StripeConnect] No user found after callback')
          return
        }

        console.log('[StripeConnect] Fetching updated profile for user:', user.id)

        // Force refetch profile from Supabase
        supabase
          .from('profiles')
          .select('stripe_account_id, stripe_onboarding_complete')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            console.log('[StripeConnect] Profile refetch result:', { data, error })

            if (error) {
              console.error('[StripeConnect] Error fetching profile:', error)
              return
            }

            if (data?.stripe_onboarding_complete && data?.stripe_account_id) {
              console.log('[StripeConnect] Setting Stripe as connected:', data.stripe_account_id)
              setStripeAccountId(data.stripe_account_id)
              setStripeOnboardingComplete(true)
            }

            setTimeout(() => setSuccess(false), 2000)
          })
      })

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const loadStripeData = async () => {
    setIsLoadingData(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      console.log('[StripeConnect] User ID:', userData?.user?.id)
      
      if (!userData?.user?.id) {
        console.log('[StripeConnect] No user ID, skipping load')
        setIsLoadingData(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', userData.user.id)
        .single()

      console.log('[StripeConnect] Profile query:', {
        error: profileError,
        stripe_account_id: profile?.stripe_account_id,
        stripe_onboarding_complete: profile?.stripe_onboarding_complete
      })

      if (profile?.stripe_account_id) {
        console.log('[StripeConnect] Found Stripe account:', profile.stripe_account_id)
        setStripeAccountId(profile.stripe_account_id)
        setStripeOnboardingComplete(profile.stripe_onboarding_complete || false)
      } else {
        console.log('[StripeConnect] No Stripe account in profile')
        setStripeAccountId(null)
      }
    } catch (err) {
      console.error('[StripeConnect] Error loading data:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleConnectStripe = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        setError('Auth token not found')
        setLoading(false)
        return
      }

      // Determine which endpoint to call
      const endpoint = stripeAccountId ? '/api/stripe/connect/resume' : '/api/stripe/connect'
      console.log('[StripeConnect] Calling endpoint:', endpoint, 'stripeAccountId:', stripeAccountId)

      // Call API to create or resume Stripe account
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to handle Stripe account')
        setLoading(false)
        return
      }

      // Redirect to Stripe onboarding
      if (data.url) {
        console.log('[StripeConnect] Redirecting to:', data.url)
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Stripe')
      setLoading(false)
    }
  }

  const handleDisconnectStripe = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase
          .from('profiles')
          .update({
            stripe_account_id: null,
            stripe_onboarding_complete: false
          })
          .eq('id', userData.user.id)
      }
      setStripeAccountId(null)
      setStripeOnboardingComplete(false)
    } catch (err) {
      console.error('[StripeConnect] Disconnect error:', err)
    }
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">💳 Stripe Payments</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {isLoadingData ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="text-gray-400 text-sm">Loading payment setup...</span>
          </div>
        ) : stripeAccountId && !stripeOnboardingComplete ? (
          // Stripe connected but onboarding incomplete
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-400/50 rounded-lg w-fit">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <span className="text-yellow-300 font-semibold text-sm">Stripe Pending Verification</span>
            </div>

            <div className="glass rounded-lg p-4 border-yellow-400/30">
              <p className="text-gray-400 text-sm mb-2">Stripe Account ID</p>
              <p className="text-white font-mono text-xs break-all">{stripeAccountId}</p>
              <p className="text-yellow-300 text-xs mt-3">
                ⚠️ <strong>Account is connected but verification is pending.</strong> Complete identity verification and add a bank account to enable payments.
              </p>
            </div>

            <Button
              onClick={handleConnectStripe}
              className="w-full px-4 py-2 bg-yellow-600/70 hover:bg-yellow-700/70 text-white rounded-lg transition"
            >
              Complete Verification
            </Button>

            <Button
              onClick={handleDisconnectStripe}
              className="w-full px-4 py-2 bg-red-600/50 hover:bg-red-700/50 text-white rounded-lg transition"
            >
              Disconnect Stripe
            </Button>
          </>
        ) : stripeAccountId && stripeOnboardingComplete ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-green-300 font-semibold text-sm">Stripe Connected</span>
            </div>

            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-400 text-sm mb-2">Stripe Account ID</p>
              <p className="text-white font-mono text-xs break-all">{stripeAccountId}</p>
              <p className="text-gray-500 text-xs mt-2">
                Accept USD payments via card or bank transfer
              </p>
            </div>

            <Button
              onClick={handleDisconnectStripe}
              className="w-full px-4 py-2 bg-red-600/50 hover:bg-red-700/50 text-white rounded-lg transition"
            >
              Disconnect Stripe
            </Button>
          </>
        ) : (
          <>
            {error && (
              <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
                <p className="text-red-300 text-sm">
                  <span className="font-bold">❌ Error:</span> {error}
                </p>
              </div>
            )}

            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-300 text-sm mb-2">
                Accept card payments and bank transfers from your clients
              </p>
              <ul className="text-gray-400 text-xs space-y-1 ml-4 list-disc">
                <li><strong>Card Payments</strong> - Visa, Mastercard, Amex</li>
                <li><strong>Bank Transfers</strong> - ACH, wire</li>
                <li><strong>Global</strong> - 135+ countries supported</li>
                <li><strong>Instant Payouts</strong> - Funds to your bank account</li>
              </ul>
            </div>

            <Button
              onClick={handleConnectStripe}
              disabled={loading}
              className={`
                w-full px-4 py-3 rounded-lg font-semibold transition
                ${
                  loading
                    ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                }
              `}
            >
              {loading ? 'Setting up...' : 'Connect Stripe Account'}
            </Button>
          </>
        )}

        {success && (
          <div className="glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-300 text-sm">
              <span className="font-bold">✓ Success!</span> Stripe account connected
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export { StripeConnectComponent as default }
