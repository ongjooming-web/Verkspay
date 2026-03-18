'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async (plan: 'starter' | 'pro') => {
    try {
      setLoading(true)
      const { data: session } = await supabase.auth.getSession()

      if (!session?.session) {
        // Redirect to login
        window.location.href = '/login'
        return
      }

      const token = session.session.access_token

      // Map frontend plan names to backend plan names
      const planMap = {
        'starter': 'pro', // Stripe price_pro is actually our "Starter" now
        'pro': 'enterprise' // Stripe price_enterprise is actually our "Pro"
      }

      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planMap[plan] })
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
      subtext: 'Most freelancers upgrade within 2 weeks',
      features: [
        '5 invoices/month',
        '3 payment links/month',
        'Basic CRM',
        'Manual payment tracking',
        'Community support'
      ],
      button: {
        text: 'Get Started',
        action: 'free'
      },
      highlighted: false
    },
    {
      name: 'Starter',
      price: '$19',
      period: '/month',
      description: 'For freelancers scaling up',
      features: [
        'Unlimited invoices',
        '15 payment links/month',
        'Clients get paid receipts automatically — no manual follow-up',
        'Smart payment reminders (Day 1, 3, 7)',
        'Track partial payments to see exactly what clients owe',
        'Email support'
      ],
      comparison: 'FreshBooks charges $25-40/mo for features built for accountants. This is built for you.',
      button: {
        text: 'Upgrade to Starter',
        action: 'starter'
      },
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For serious freelancers & agencies',
      social_proof: '★★★★★ Used by 200+ freelancers',
      features: [
        'Everything in Starter',
        'Unlimited payment links',
        'See which clients owe you money at a glance',
        'Recurring invoices for retainers',
        'Stripe payment integration',
        'API access (coming soon)',
        'Priority email support'
      ],
      comparison: 'FreshBooks charges $25-40/mo for features built for accountants. This is built for you.',
      button: {
        text: 'Upgrade to Pro',
        action: 'pro'
      },
      highlighted: true
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Invoicing Built for Freelancers</h1>
          <p className="text-gray-400 text-lg">Not for accountants. For you.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative ${plan.highlighted ? 'md:scale-105' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    ⭐ Most Popular
                  </div>
                </div>
              )}

              <Card
                className={`h-full border-2 transition ${
                  plan.highlighted
                    ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-purple-500/10'
                    : 'border-blue-500/20'
                }`}
              >
                <CardHeader>
                  <h2 className="text-3xl font-bold text-white">{plan.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
                  {(plan as any).subtext && (
                    <p className="text-gray-500 text-xs italic mt-2">{(plan as any).subtext}</p>
                  )}

                  {/* Price */}
                  <div className="mt-6 mb-4">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 text-sm ml-2">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardBody className="space-y-6">
                  {/* Social Proof */}
                  {(plan as any).social_proof && (
                    <div className="text-center text-amber-400 text-sm font-semibold">
                      {(plan as any).social_proof}
                    </div>
                  )}

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-green-400 text-lg mt-0.5">✓</span>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Comparison Text */}
                  {(plan as any).comparison && (
                    <div className="border-t border-blue-400/20 pt-4 mt-6">
                      <p className="text-gray-400 text-xs italic">{(plan as any).comparison}</p>
                    </div>
                  )}

                  {/* Button */}
                  <Button
                    onClick={() => {
                      if (plan.button.action === 'free') {
                        window.location.href = '/invoices'
                      } else {
                        handleUpgrade(plan.button.action as 'starter' | 'pro')
                      }
                    }}
                    disabled={loading && plan.button.action !== 'free'}
                    className={`w-full py-3 font-semibold transition ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                        : 'bg-blue-600/50 text-white hover:bg-blue-700/50'
                    }`}
                  >
                    {loading && plan.button.action !== 'free' ? '⏳ Loading...' : plan.button.text}
                  </Button>
                </CardBody>
              </Card>
            </div>
          ))}
        </div>

        {/* Team Waitlist CTA */}
        <div className="text-center mt-20">
          <Card className="max-w-2xl mx-auto border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <CardBody className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Need team access?</h3>
              <p className="text-gray-400 mb-6">
                Team management for 2-5 users, API access, and webhooks coming soon.
              </p>
              <Button 
                onClick={() => window.location.href = 'mailto:support@prismops.xyz?subject=Team%20Waitlist'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                🚀 Join the Waitlist
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
