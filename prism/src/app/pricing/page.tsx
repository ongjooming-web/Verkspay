'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

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
      name: 'Starter',
      price: '$19',
      period: '/mo',
      description: 'For freelancers just getting started',
      features: [
        'Unlimited invoices',
        'Unlimited payment links',
        'Stripe payments',
        'Smart reminders',
        'Partial payments',
        'Advanced CRM',
        'AI Insights (10/month)',
        'Email support'
      ],
      button: { text: 'Get Started', action: 'starter' },
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/mo',
      description: 'For growing freelancers',
      badge: 'Most Popular',
      features: [
        'Everything in Starter',
        'AI Insights (30/month)',
        'Proposals & contracts',
        'Advanced reporting',
        'Payment reminders',
        'Client portal',
        'Priority email support'
      ],
      comparison: 'FreshBooks charges $25-40/mo for features built for accountants. Prism is built for you.',
      button: { text: 'Get Started', action: 'pro' },
      highlighted: false
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/mo',
      description: 'For teams & agencies',
      features: [
        'Everything in Pro',
        'AI Insights (unlimited)',
        'Multi-entity / business units support',
        'Team management (5 users)',
        'API access & webhooks',
        'Custom branding',
        'Dedicated support'
      ],
      note: 'Built for agencies, holding companies, and multi-entity businesses.',
      button: { text: 'Contact Sales', action: 'enterprise' },
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
            <p className="text-xl text-gray-400">15-day free trial. Choose your plan.</p>
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
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 ml-2">{plan.period}</span>
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
                  ) : (
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
                },
                {
                  q: 'Do you offer annual billing?',
                  a: 'Contact us at support@prismops.xyz for annual pricing and custom quotes.'
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
