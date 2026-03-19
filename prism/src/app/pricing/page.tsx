'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
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
        body: JSON.stringify({ plan })
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to start checkout. Please try again.')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'Forever',
      description: 'Perfect for trying Prism',
      features: [
        '5 invoices/month',
        '3 payment links/month',
        'Basic CRM',
        'Manual payment tracking',
        'Community support'
      ],
      button: { text: 'Get Started', action: 'free' },
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For growing freelancers & small businesses',
      features: [
        'Unlimited invoices',
        'Unlimited payment links',
        'Smart payment reminders (Days 1, 3, 7)',
        'Partial payment tracking',
        'Advanced CRM',
        'Email support',
        'Stripe payments built in'
      ],
      button: { text: 'Upgrade to Pro', action: 'pro' },
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For teams & agencies',
      features: [
        'Everything in Pro',
        'Team management (5 users)',
        'Multi-entity / business units',
        'Advanced CRM & purchase history',
        'POS webhook integration',
        'Pricing tiers per customer',
        'Credit terms & receivables aging',
        'Daily cash reconciliation',
        'Custom branding',
        'Priority support'
      ],
      button: { text: 'Upgrade to Enterprise', action: 'enterprise' },
      highlighted: false
    }
  ]

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">Simple, transparent pricing</h1>
            <p className="text-xl text-gray-400">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={`flex flex-col ${
                  plan.highlighted
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 scale-105'
                    : ''
                }`}
              >
                <CardHeader>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="my-4">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-400">{plan.description}</p>
                </CardHeader>

                <CardBody className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="text-blue-400 mt-1">✓</span>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.button.action === 'free' ? (
                    <Link href="/signup">
                      <Button className="w-full bg-white text-black hover:opacity-90">
                        {plan.button.text}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() =>
                        handleUpgrade(
                          plan.button.action as 'pro' | 'enterprise'
                        )
                      }
                      disabled={loading}
                      className={`w-full ${
                        plan.highlighted
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-white text-black hover:opacity-90'
                      }`}
                    >
                      {loading ? 'Loading...' : plan.button.text}
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
