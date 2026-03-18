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
        // Redirect to login
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

  const handleContact = () => {
    window.location.href = 'mailto:support@prismops.xyz?subject=Enterprise%20Inquiry'
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'Forever',
      description: 'Perfect for getting started',
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
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For growing freelancers',
      features: [
        'Unlimited invoices',
        'Unlimited payment links',
        'Stripe payment integration',
        'Auto-invoice confirmation',
        'Email support',
        'Advanced reporting (coming soon)'
      ],
      button: {
        text: 'Upgrade to Pro',
        action: 'pro'
      },
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For agencies & teams',
      features: [
        'Everything in Pro',
        'Team accounts (5 users)',
        'API access',
        'Webhooks',
        'Priority support',
        'Custom integrations'
      ],
      button: {
        text: 'Contact Sales',
        action: 'enterprise'
      },
      highlighted: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-400 text-lg">Choose the plan that works for your business</p>
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

                  {/* Price */}
                  <div className="mt-6 mb-4">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 text-sm ml-2">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardBody className="space-y-8">
                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-green-400 text-lg mt-0.5">✓</span>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <Button
                    onClick={() => {
                      if (plan.button.action === 'free') {
                        window.location.href = '/invoices'
                      } else if (plan.button.action === 'enterprise') {
                        handleContact()
                      } else {
                        handleUpgrade(plan.button.action as 'pro' | 'enterprise')
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

        {/* FAQ / Info */}
        <div className="text-center mt-20">
          <Card className="max-w-2xl mx-auto border-blue-500/20">
            <CardBody className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Have questions?</h3>
              <p className="text-gray-400 mb-6">
                All plans include 14-day free trial. Cancel anytime, no credit card required for Free tier.
              </p>
              <Link href="/">
                <Button variant="outline" className="border-blue-400/50 text-blue-300 hover:bg-blue-500/10">
                  ← Back to Home
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
