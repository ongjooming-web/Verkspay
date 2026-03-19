'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      alert('Thanks! We\'ll notify you when Prism launches.')
      setEmail('')
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
        <header className="backdrop-blur-xl border-b border-white/10 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Prism</span>
            </Link>
            <nav className="flex gap-6 items-center">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
              <Link href="/login" className="text-gray-300 hover:text-white transition">Login</Link>
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">
                Get Started
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Get paid faster.{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Chase invoices less.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Invoicing built for freelancers and growing businesses. Smart reminders, partial payments, and Stripe built in. No accountant features you'll never use.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 rounded-lg font-medium hover:opacity-90 transition text-lg">
                Start Free
              </Link>
              <Link href="/pricing" className="border border-gray-500 px-8 py-3 rounded-lg font-medium hover:border-white transition text-lg">
                View Pricing
              </Link>
            </div>
          </div>


        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Built for your workflow</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '📨',
                title: 'Smart Reminders',
                desc: 'Automated follow-ups at 3, 7, 14 days overdue. Stop chasing manually.'
              },
              {
                icon: '💳',
                title: 'Partial Payments',
                desc: 'Collect deposits upfront, track the remainder automatically.'
              },
              {
                icon: '💰',
                title: 'Stripe Payments',
                desc: 'Send a payment link, get paid instantly.'
              },
              {
                icon: '👥',
                title: 'Client CRM',
                desc: 'Every client, invoice, and conversation in one place.'
              },
              {
                icon: '📄',
                title: 'Proposals & Contracts',
                desc: 'Professional proposals signed and tracked.'
              },
              {
                icon: '📊',
                title: 'Dashboard',
                desc: 'Real-time revenue, pipeline, and cash flow.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Crypto Section - Moved Lower */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <h3 className="text-2xl font-bold text-center mb-8">Also accept crypto — USDC on Base, Ethereum & Solana for instant global payments.</h3>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-center text-gray-400 mb-16">Choose the plan that fits your needs</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'Forever',
                desc: 'Perfect for trying Prism',
                features: ['5 invoices/month', '3 payment links', 'Basic CRM', 'Manual tracking'],
                cta: 'Get Started',
                highlighted: false
              },
              {
                name: 'Pro',
                price: '$49',
                period: '/month',
                desc: 'For growing freelancers',
                features: ['Unlimited invoices', 'Unlimited payment links', 'Smart reminders', 'Partial payments', 'Email support'],
                cta: 'Start Free Trial',
                highlighted: true,
                comparison: 'FreshBooks charges $25-40/mo for features built for accountants. Prism is built for you.'
              },
              {
                name: 'Enterprise',
                price: '$199',
                period: '/month',
                desc: 'For teams & agencies',
                features: ['Everything in Pro', 'Team management (5 users)', 'Multi-entity support', 'Advanced CRM', 'Custom branding', 'Priority support'],
                cta: 'Contact Sales',
                highlighted: false
              }
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-lg border p-8 transition ${
                  plan.highlighted
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 scale-105'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 ml-2">{plan.period}</span>
                </div>
                <p className="text-gray-400 mb-6 text-sm">{plan.desc}</p>
                <button className={`w-full py-2 rounded-lg font-medium mb-6 transition ${
                  plan.highlighted
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'border border-white/20 hover:border-white/40'
                }`}>
                  {plan.cta}
                </button>
                {plan.comparison && (
                  <p className="text-gray-400 text-sm mb-6 italic">{plan.comparison}</p>
                )}
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="text-gray-300 flex items-center gap-2">
                      <span className="text-blue-400">✓</span> {feature}
                    </li>
                  ))}
                </ul>
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
        <footer className="border-t border-white/10 mt-20 py-8">
          <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-sm">
            <p>© 2026 Prism. Built for freelancers and small teams.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
