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
              <Link href="/app/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">
                Get Started
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent mb-6 leading-tight">
                Proposals, contracts, invoices — and crypto. Finally together.
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Manage your entire freelance operation in one place. Get paid in USDC instantly. No middlemen, no delays.
              </p>
              <div className="flex gap-4">
                <Link href="/app/signup" className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition text-white">
                  Start for Free
                </Link>
                <Link href="/app/dashboard" className="border border-white/30 backdrop-blur-xl px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition text-white">
                  View Demo
                </Link>
              </div>
            </div>
            <div className="backdrop-blur-xl border border-white/20 rounded-2xl p-8 bg-white/5">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Revenue</span>
                  <span className="text-2xl font-bold text-green-400">$12.5K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Invoices</span>
                  <span className="text-2xl font-bold text-blue-400">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Clients</span>
                  <span className="text-2xl font-bold text-purple-400">8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Proposals</span>
                  <span className="text-2xl font-bold text-pink-400">5</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📄', title: 'Proposals & Contracts', desc: 'Create professional proposals in minutes. Sign and track every contract.' },
              { icon: '👥', title: 'Client CRM', desc: 'Keep all client info organized. Never lose a conversation.' },
              { icon: '🧾', title: 'Invoicing', desc: 'Create, send, and track invoices instantly. Know what\'s owed.' },
              { icon: '⚙️', title: 'Team Management', desc: 'Collaborate with teammates. Assign tasks and manage permissions.' },
              { icon: '💰', title: 'Crypto Payments', desc: 'Accept USDC on Base, Ethereum & Solana. Instant settlement.' },
              { icon: '📊', title: 'Dashboard', desc: 'Real-time visibility into revenue, pipeline, and cash flow.' },
            ].map((feature, idx) => (
              <div key={idx} className="backdrop-blur-xl border border-white/20 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Crypto Section */}
        <section id="crypto" className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">Crypto Payments Built In</h2>
          <div className="backdrop-blur-xl border border-white/20 rounded-xl p-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 mb-8">
            <p className="text-2xl font-semibold mb-4">💙 USDC on Base, Ethereum & Solana</p>
            <p className="text-gray-300 mb-6">Get paid instantly. No payment processors, no 3% fees, no waiting. Settle anywhere in the world in seconds.</p>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Simple Pricing That Scales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Free', price: '$0', features: ['3 active clients', '5 invoices/month', 'Basic CRM', 'Contract templates', 'Crypto payments'] },
              { name: 'Pro', price: '$49', features: ['Unlimited clients', 'Unlimited invoices', 'Advanced CRM', 'Contract templates', 'Crypto payments', 'Priority support'] },
              { name: 'Agency', price: '$299', features: ['Everything in Pro', 'Team management', 'Custom branding', 'API access', 'Dedicated support'] },
            ].map((plan, idx) => (
              <div key={idx} className={`backdrop-blur-xl border rounded-xl p-8 transition ${idx === 1 ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-purple-400 mb-6">{plan.price}<span className="text-lg text-gray-400">/mo</span></p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-gray-300 flex items-center gap-2">
                      <span className="text-green-400">✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/app/signup" className="w-full block text-center bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to streamline your freelance business?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Join freelancers and agencies using Prism to manage proposals, contracts, invoices, and get paid in crypto.</p>
          <Link href="/app/signup" className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition text-white text-lg">
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
