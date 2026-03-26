'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'

export function Navigation() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/clients', label: 'Clients' },
    { href: '/invoices', label: 'Invoices' },
    { href: '/insights', label: '✨ Insights' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/proposals', label: 'Proposals' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="glass sticky top-0 z-50 mb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        {/* Desktop & Mobile Header */}
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="Prism Logo" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Prism</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8 items-center">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-blue-400 transition-colors font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
            <Button variant="outline" size="sm" onClick={handleLogout} className="ml-4">
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-blue-400 hover:bg-white/5 transition-colors rounded text-sm"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
