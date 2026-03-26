'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check user's current plan on mount
  useEffect(() => {
    const checkUserPlan = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData?.session) {
          setIsLoggedIn(false)
          return
        }

        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', sessionData.session.user.id)
          .single()

        if (profile?.plan) {
          setUserPlan(profile.plan)
        }
      } catch (err) {
        console.error('[PricingPage] Error checking user plan:', err)
      }
    }

    checkUserPlan()
  }, [])

  const handleUpgrade = async (plan: 'starter' | 'pro' | 'enterprise') => {
    try {
      setLoading(true)
      const { data: session } = await supabase.auth.getSession()

      if (!session?.session) {
        window.location.href = '/login'
        return
      }

      const token = session.session.access_token

      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan, billingPeriod })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Checkout error:', data)
        const errorMsg = data.error || 'Failed to start checkout'
        alert(`Error: ${errorMsg}\n\nPlease check the console for details.`)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to start checkout. Please try again.')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert(`Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}\n\nPlease try again.`)
    } finally {
      setLoading(false)
    }
  }

  const plans = [
    {
      name: 'Starter',
      monthlyPrice: '$19',
      annualPrice: '$15',
      annualTotal: '$180',
      period: '/mo',
      description: 'For freelancers just getting started',
      features: [
        'Up to 20 invoices/month',
        '10 payment links/month',
        'Stripe payments',
        'Smart reminders',
        'Smart Invoice Creation (auto-fill from history)',
        'WhatsApp invoice sharing',
        '5 AI Insights/month',
        'Client management',
        'Flexible payment terms (Net 30/60/90, Due on Receipt)',
        'Email support'
      ],
      button: { text: 'Start Free Trial', action: 'starter' },
      highlighted: false
    },
    {
      name: 'Pro',
      monthlyPrice: '$49',
      annualPrice: '$39',
      annualTotal: '$468',
      period: '/mo',
      description: 'For growing freelancers',
      badge: 'Most Popular',
      features: [
        'Unlimited invoices',
        'Unlimited payment links',
        'Stripe payments',
        'Smart reminders',
        'Partial payments',
        'Recurring invoices',
        'Smart Invoice Creation (auto-fill from history)',
        'Proposals & Contracts',
        'WhatsApp invoice sharing',
        '30 AI Insights/month',
        'AI Business Recommendations',
        'AI Client Summaries & Health Scores',
        'Smart Follow-up Suggestions',
        'Advanced reporting',
        'Flexible payment terms (Net 30/60/90, Due on Receipt)',
        'Priority email support'
      ],
      comparison: 'FreshBooks charges $25-40/mo for features built for accountants. Prism is built for freelancers.',
      button: { text: 'Start Free Trial', action: 'pro' },
      highlighted: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: '$199',
      annualPrice: '$159',
      annualTotal: '$1,908',
      period: '/mo',
      description: 'For agencies & growing teams',
      features: [
        'Everything in Pro',
        'Unlimited AI Insights',
        'Revenue Forecasting',
        'Receivables aging reports',
        'POS webhook integration',
        'Team management (5 users)',
        'Custom branding',
        'API access & webhooks',
        'Priority support'
      ],
      note: 'Built for agencies and growing teams that need advanced tools.',
      button: { text: 'Contact Us', action: 'enterprise' },
      highlighted: false
    }
  ]

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (billingPeriod === 'monthly') {
      return plan.monthlyPrice
    }
    return plan.annualPrice
  }

  const getDisplayTotal = (plan: typeof plans[0]) => {
    if (billingPeriod === 'monthly') {
      return null
    }
    return plan.annualTotal
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">Simple, transparent pricing</h1>
            <p className="text-xl text-gray-400">15-day free trial. Choose your plan.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-16">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/20'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg font-medium transition relative ${
                billingPeriod === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/20'
              }`}
            >
              Annual
              {billingPeriod === 'annual' && (
                <span className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                  Save 20%
                </span>
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={`flex flex-col relative ${
                  plan.highlighted
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30 md:scale-105'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <CardHeader className={plan.badge ? 'pt-8' : ''}>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="my-4">
                    <div className="flex items-baseline gap-2">
                      {billingPeriod === 'annual' && (
                        <span className="text-gray-500 line-through text-lg">{plan.monthlyPrice}</span>
                      )}
                      <span className="text-5xl font-bold">{getDisplayPrice(plan)}</span>
                      <span className="text-gray-400 ml-2">{plan.period}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <p className="text-gray-400 text-xs mt-2">Billed annually at {getDisplayTotal(plan)}/year</p>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </CardHeader>

                <CardBody className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="text-blue-400 mt-1 flex-shrink-0">✓</span>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.comparison && (
                    <p className="text-gray-400 text-xs italic mb-6 pb-4 border-t border-white/10 pt-4">
                      {plan.comparison}
                    </p>
                  )}

                  {plan.note && (
                    <p className="text-gray-400 text-xs italic mb-6 pb-4 border-t border-white/10 pt-4">
                      {plan.note}
                    </p>
                  )}

                  {plan.button.action === 'enterprise' ? (
                    <a href="mailto:support@prismops.xyz" className="w-full">
                      <Button className="w-full bg-white text-black hover:opacity-90">
                        {plan.button.text}
                      </Button>
                    </a>
                  ) : !isLoggedIn ? (
                    // Not logged in: show "Start Free Trial" for all plans
                    <Button
                      onClick={() =>
                        handleUpgrade(
                          plan.button.action as 'starter' | 'pro' | 'enterprise'
                        )
                      }
                      disabled={loading}
                      className={`w-full ${
                        plan.highlighted
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'border border-white/20 hover:border-white/40 text-white'
                      }`}
                    >
                      {loading ? 'Loading...' : 'Start Free Trial'}
                    </Button>
                  ) : userPlan === plan.button.action ? (
                    // Current plan: show "Current Plan" badge
                    <div className="w-full text-center px-3 py-2 rounded bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-semibold text-green-400">✓ Current Plan</p>
                    </div>
                  ) : (plan.button.action === 'pro' && userPlan === 'starter') || (plan.button.action === 'enterprise' && (userPlan === 'starter' || userPlan === 'pro')) ? (
                    // Upgrade path: show "Upgrade" button
                    <Button
                      onClick={() =>
                        handleUpgrade(
                          plan.button.action as 'starter' | 'pro' | 'enterprise'
                        )
                      }
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {loading ? 'Loading...' : 'Upgrade'}
                    </Button>
                  ) : (
                    // Any other plan: show "Change Plan" button
                    <Button
                      onClick={() =>
                        handleUpgrade(
                          plan.button.action as 'starter' | 'pro' | 'enterprise'
                        )
                      }
                      disabled={loading}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      {loading ? 'Loading...' : 'Change Plan'}
                    </Button>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Questions?</h2>
            <div className="space-y-6">
              {[
                {
                  q: 'Can I switch plans anytime?',
                  a: 'Yes. Upgrade or downgrade instantly. We prorate charges based on your usage.'
                },
                {
                  q: 'Do you offer refunds?',
                  a: '30-day money-back guarantee. If Prism isn\'t working for you, we\'ll refund it.'
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'Credit cards (Visa, Mastercard, Amex) via Stripe. All charges are in USD.'
                },
                {
                  q: 'Is there a contract?',
                  a: 'Nope. Pay month-to-month, cancel anytime. No lock-in.'
                },
                {
                  q: 'Do you offer annual billing?',
                  a: 'Yes! Choose annual billing above and save 20% compared to monthly. Switch anytime.'
                }
              ].map((faq, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2">{faq.q}</h3>
                  <p className="text-gray-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
