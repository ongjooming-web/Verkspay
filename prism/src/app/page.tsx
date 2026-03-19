'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  // Cache bust: 2026-03-17 09:41
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
              <svg className="w-8 h-8 inline mr-2" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff6b6b" />
                    <stop offset="16.67%" stopColor="#ff9f6b" />
                    <stop offset="33.33%" stopColor="#ffd93d" />
                    <stop offset="50%" stopColor="#6bdb77" />
                    <stop offset="66.67%" stopColor="#4d96ff" />
                    <stop offset="83.33%" stopColor="#b565d8" />
                    <stop offset="100%" stopColor="#ff6b6b" />
                  </linearGradient>
                </defs>
                <polygon points="50,5 93.3,28.33 93.3,75 50,98.33 6.7,75 6.7,28.33" fill="url(#rainbowGradient)" stroke="url(#rainbowGradient)" strokeWidth="1.5" />
                <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fill="white">◆</text>
              </svg>
              Prism
            </Link>
            <nav className="flex gap-6 items-center">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#crypto" className="text-gray-300 hover:text-white transition">Crypto</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">
                Get Started
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Get paid faster. Chase invoices less.
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              Prism is invoicing built for freelancers — smart reminders, partial payments, and Stripe built in. No accountant features you'll never use.
            </p>
            
            {/* Social Proof */}
            <div className="flex justify-center items-center gap-2 mb-8 text-sm text-gray-400">
              <span>✓ Trusted by freelancers in 10+ countries</span>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition text-white">
                Start for Free
              </Link>
              <Link href="/pricing" className="border border-white/30 backdrop-blur-xl px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition text-white">
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Designed for Freelancers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              { icon: '🧾', title: 'Smart Invoicing', desc: 'Create, send, and track invoices instantly. Professional invoices with Stripe payment links.' },
              { icon: '📧', title: 'Payment Reminders', desc: 'Day 1 polite, Day 3 follow-up, Day 7 urgent. Stop chasing overdue invoices manually.' },
              { icon: '💳', title: 'Partial Payments', desc: 'Accept partial payments, track remaining balance. See exactly who owes you money.' },
            ].map((feature, idx) => (
              <div key={idx} className="backdrop-blur-xl border border-white/20 rounded-xl p-8 bg-white/5 hover:bg-white/10 transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Additional Features Below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: '👥', title: 'Client Management', desc: 'Organize all clients in one place. Track invoices per client.' },
              { icon: '📊', title: 'Dashboard', desc: 'Real-time visibility into revenue, pending payments, and overdue invoices.' },
            ].map((feature, idx) => (
              <div key={idx} className="backdrop-blur-xl border border-white/20 rounded-xl p-8 bg-white/5 hover:bg-white/10 transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Crypto Section - Secondary Feature */}
        <section id="crypto" className="max-w-7xl mx-auto px-6 py-20">
          <div className="backdrop-blur-xl border border-white/20 rounded-xl p-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Also accept crypto — for instant global payments</h2>
              <p className="text-lg text-gray-300 mb-6">
                USDC on Base, Ethereum & Solana. Get paid instantly with zero payment processor fees. Settle anywhere in the world in seconds.
              </p>
              <p className="text-sm text-gray-400">Coming in Phase 2 — free for all plans when launched.</p>
            </div>
          </div>
        </section>

        {/* Pricing CTA Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">Simple Pricing That Scales</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Start free with 5 invoices/month. Upgrade to Pro when you're ready to scale.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition text-white">
              View Pricing
            </Link>
            <Link href="/pricing" className="border border-white/30 backdrop-blur-xl px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition text-white">
              Compare Plans
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to get paid faster?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Join freelancers using Prism to manage invoices, collect payments, and track cash flow without the headache.</p>
          <Link href="/signup" className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition text-white text-lg">
            Start Free Today
          </Link>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 backdrop-blur-xl mt-20">
          <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-400">
            <p>© 2026 Prism. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
