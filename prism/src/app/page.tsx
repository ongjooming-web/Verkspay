'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      alert('Thanks! We\'ll notify you when Prism launches.')
      setEmail('')
    }
  }

  const scrollToPricing = (e: React.MouseEvent) => {
    e.preventDefault()
    const pricingSection = document.getElementById('pricing')
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center gap-2 md:gap-0">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Prism Logo" className="h-8 md:h-10 w-8 md:w-10" />
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Prism</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center">
              <a href="#features" className="text-gray-300 hover:text-white transition text-sm">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition text-sm">Pricing</a>
              <Link href="/login" className="text-gray-300 hover:text-white transition text-sm">Login</Link>
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition text-sm">
                Get Started
              </Link>
            </nav>
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-gray-300 transition z-30"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl">
              <nav className="flex flex-col gap-3 px-4 py-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition text-sm py-2">Features</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white transition text-sm py-2">Pricing</a>
                <Link href="/login" className="text-gray-300 hover:text-white transition text-sm py-2">Login</Link>
                <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition text-sm text-center">
                  Get Started
                </Link>
              </nav>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
              Get paid faster.{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Chase invoices less.</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-400 mb-6 md:mb-8">
              Invoicing built for freelancers and growing businesses. Smart reminders, partial payments, and Stripe built in. No accountant features you'll never use.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 rounded-lg font-medium hover:opacity-90 transition text-lg">
                Start Free Trial
              </Link>
              <button 
                onClick={scrollToPricing}
                className="border border-gray-500 px-8 py-3 rounded-lg font-medium hover:border-white transition text-lg"
              >
                View Pricing
              </button>
            </div>
          </div>


        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Built for your workflow</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🔔',
                title: 'Smart Reminders',
                desc: 'Automated follow-ups at 3, 7, 14 days overdue. Stop chasing manually.'
              },
              {
                icon: '💸',
                title: 'Partial Payments',
                desc: 'Collect deposits upfront, track the remainder automatically.'
              },
              {
                icon: '💳',
                title: 'Stripe Payments',
                desc: 'Send a payment link, get paid instantly.'
              },
              {
                icon: '🤖',
                title: 'AI Business Insights',
                desc: 'AI-powered analysis of your revenue, clients, and payment patterns. Get actionable insights.'
              },
              {
                icon: '💬',
                title: 'WhatsApp Integration',
                desc: 'Send invoices and payment reminders directly via WhatsApp. Meet your clients where they are.'
              },
              {
                icon: '🔄',
                title: 'Recurring Invoices',
                desc: 'Set up auto-generated invoices for retainer clients. Review and send on your schedule.'
              },
              {
                icon: '📋',
                title: 'Proposals & Contracts',
                desc: 'Create professional proposals, win clients, and convert to invoices with one click.'
              },
              {
                icon: '👥',
                title: 'AI-Powered CRM',
                desc: 'Client health scores, AI summaries, smart follow-up suggestions, and revenue insights.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-center text-gray-400 mb-8">Choose the plan that fits your needs</p>
          
          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white/10 border border-white/20 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2 rounded-md font-medium transition relative ${
                  billingPeriod === 'annual'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Annual
                {billingPeriod === 'annual' && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Save 20%
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: '$19',
                annualPrice: '$15',
                period: '/mo',
                desc: 'For freelancers just getting started',
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
                cta: 'Start Free Trial',
                highlighted: false
              },
              {
                name: 'Pro',
                price: '$49',
                annualPrice: '$39',
                period: '/mo',
                desc: 'For growing freelancers',
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
                cta: 'Start Free Trial',
                highlighted: true,
                comparison: 'FreshBooks charges $25-40/mo for features built for accountants. Prism is built for freelancers.'
              },
              {
                name: 'Enterprise',
                price: '$199',
                annualPrice: '$159',
                period: '/mo',
                desc: 'For agencies & growing teams',
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
                cta: 'Contact Us',
                highlighted: false,
                note: 'Built for agencies and growing teams that need advanced tools.'
              }
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-lg border p-6 transition relative flex flex-col h-full ${
                  plan.highlighted
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30 md:scale-105'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className={plan.badge ? 'pt-4' : ''}>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">
                      {billingPeriod === 'monthly' ? plan.price : plan.annualPrice}
                    </span>
                    <span className="text-gray-400 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-400 mb-6 text-sm">{plan.desc}</p>
                </div>
                
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="text-gray-300 flex items-start gap-2 text-sm">
                      <span className="text-blue-400 mt-1 flex-shrink-0">✓</span> {feature}
                    </li>
                  ))}
                </ul>

                {plan.comparison && (
                  <p className="text-gray-400 text-xs italic mb-4 pb-4 border-t border-white/10 pt-4">{plan.comparison}</p>
                )}

                {plan.note && (
                  <p className="text-gray-400 text-xs italic mb-4 pb-4 border-t border-white/10 pt-4">{plan.note}</p>
                )}

                <Link href="/signup" className={`w-full py-2 rounded-lg font-medium transition block text-center ${
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'border border-white/20 hover:border-white/40 text-white'
                }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4">Join freelancers worldwide</h2>
          <p className="text-gray-400 mb-8">Start free. Upgrade when you're ready.</p>
          <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 rounded-lg font-medium hover:opacity-90 transition text-lg inline-block">
            Start Free Today
          </Link>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-20 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center mb-8">
              <p className="text-gray-400 text-sm">© 2026 Prism. Built for freelancers and small teams.</p>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition">Terms of Service</Link>
                <a href="mailto:support@prismops.xyz" className="text-gray-400 hover:text-white transition">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
